"""Daily stats aggregator for the public /stats page.

Reads the CloudFront access logs the site already collects, folds them into
aggregate counters in DynamoDB (idempotently, via marker# items), pulls
uniques/countries from the Cloudflare GraphQL Analytics API, and publishes a
static, privacy-safe stats.json to the website bucket.

Privacy rules (hard requirements):
- Aggregates only. No per-event data, IPs, user agents, full URLs, or
  timestamps finer than a day ever leave this function or get stored.
- Referrers are stripped to a registrable-ish domain at ingest and validated
  against a strict domain regex; anything that fails validation is dropped.
- Countries are ISO 3166-1 alpha-2 codes only.
- k-anonymity floor: buckets with fewer than K_ANONYMITY_FLOOR events collapse
  into an "Other" bucket before publication.
- Logging follows the no-PII convention from sns_publish_lambda: counts and
  S3 object keys only.
"""

import gzip
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import date, datetime, timedelta, timezone

import boto3

# Clients at module scope so they are reused across warm invocations.
s3 = boto3.client("s3")
dynamodb = boto3.client("dynamodb")
ssm = boto3.client("ssm")

TABLE_NAME = os.environ["TABLE_NAME"]
LOG_BUCKET = os.environ["LOG_BUCKET"]
WEBSITE_BUCKET = os.environ["WEBSITE_BUCKET"]
# Optional: when unset the Cloudflare query is skipped (with a warning) so the
# CloudFront-derived metrics still publish.
CF_ZONE_ID = os.environ.get("CF_ZONE_ID", "")
CF_TOKEN_SSM_PARAM = os.environ.get("CF_TOKEN_SSM_PARAM", "")

LOG_PREFIX = "cloudfront-logs/"
STATS_KEY = "stats.json"

# marker# items only need to outlive the log objects themselves (the bucket
# lifecycle expires those after 90 days) — once an object is gone it cannot be
# reprocessed, so the marker has nothing left to guard.
MARKER_TTL_DAYS = 120

K_ANONYMITY_FLOOR = 5
TOP_N = 5
DAILY_SERIES_DAYS = 30

# Stop pulling new log objects when this little time remains so the final
# flush + Cloudflare query + stats.json render always complete.
TIME_BUDGET_FLOOR_MS = 45_000
FLUSH_EVERY_N_OBJECTS = 25

# Best-effort bot filter, applied to the URL-decoded, lowercased user agent.
# Honestly captioned on the page as "bot-filtered (best effort)".
BOT_UA_SUBSTRINGS = (
    "bot",
    "crawl",
    "spider",
    "slurp",
    "headless",
    "python",
    "curl",
    "wget",
    "monitor",
    "scanner",
    "probe",
    "http-client",
    "httpclient",
)

# Strict hostname shape — referrer labels must match this before they can be
# stored, and the frontend re-validates before rendering.
DOMAIN_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)+$")
ISO_COUNTRY_RE = re.compile(r"^[A-Z]{2}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# Page labels: normalized URI stems only — conservative charset, bounded length.
PAGE_STEM_RE = re.compile(r"^/[A-Za-z0-9/_.-]{0,99}$")

OWN_DOMAINS = {"andrewmalvani.com"}

# Listing cursor: log keys (cloudfront-logs/<dist>.YYYY-MM-DD-HH.<hash>.gz)
# sort chronologically, so each run can resume listing just before where the
# previous one stopped instead of re-checking every historical marker# item.
# The cursor is purely an optimization — marker# items remain the
# idempotency/correctness guarantee. Rewinding two days covers CloudFront's
# occasionally late-delivered log objects.
CURSOR_ID = "cursor#cloudfront-logs"
CURSOR_REWIND_DAYS = 2
KEY_DATE_RE = re.compile(r"^(.*\.)(\d{4}-\d{2}-\d{2})-\d{2}\.")

CLOUDFLARE_GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql"
CLOUDFLARE_QUERY = """
query ($zone: String!, $since: String!, $until: String!) {
  viewer {
    zones(filter: {zoneTag: $zone}) {
      httpRequests1dGroups(
        filter: {date_geq: $since, date_leq: $until}
        limit: 10
        orderBy: [date_ASC]
      ) {
        dimensions { date }
        uniq { uniques }
        sum { countryMap { clientCountryName requests } }
      }
    }
  }
}
"""


def _ddb_id(item_id):
    return {"id": {"S": item_id}}


def _claim_log_object(key):
    """Atomically claim a log object for processing.

    Returns True only once per object key, ever: a marker# item is written
    with a conditional put so reprocessing (manual re-invokes, retries,
    overlapping runs) can never double-count. The cheap GetItem first keeps
    steady-state runs from burning conditional writes on the whole backlog.
    """
    marker_id = f"marker#{key}"
    existing = dynamodb.get_item(TableName=TABLE_NAME, Key=_ddb_id(marker_id))
    if "Item" in existing:
        return False

    expires_at = int(datetime.now(timezone.utc).timestamp()) + MARKER_TTL_DAYS * 86_400
    try:
        dynamodb.put_item(
            TableName=TABLE_NAME,
            Item={**_ddb_id(marker_id), "expires_at": {"N": str(expires_at)}},
            ConditionExpression="attribute_not_exists(id)",
        )
    except dynamodb.exceptions.ConditionalCheckFailedException:
        return False
    return True


def _read_cursor_start_after():
    """Compute the S3 StartAfter position from the stored cursor (or '')."""
    item = dynamodb.get_item(TableName=TABLE_NAME, Key=_ddb_id(CURSOR_ID)).get("Item")
    last_key = item.get("last_key", {}).get("S", "") if item else ""
    match = KEY_DATE_RE.match(last_key)
    if not match:
        return ""
    rewound = date.fromisoformat(match.group(2)) - timedelta(days=CURSOR_REWIND_DAYS)
    return f"{match.group(1)}{rewound.isoformat()}"


def _write_cursor(last_key):
    dynamodb.put_item(TableName=TABLE_NAME, Item={**_ddb_id(CURSOR_ID), "last_key": {"S": last_key}})


def _looks_like_bot(raw_user_agent):
    decoded = urllib.parse.unquote(raw_user_agent).lower()
    return any(marker in decoded for marker in BOT_UA_SUBSTRINGS)


def _referrer_domain(raw_referrer):
    """Strip a referrer to its host at ingest — the full URL is never kept."""
    if not raw_referrer or raw_referrer == "-":
        return None
    try:
        host = urllib.parse.urlparse(urllib.parse.unquote(raw_referrer)).hostname
    except ValueError:
        return None
    if not host:
        return None
    host = host.lower().removeprefix("www.")
    if host in OWN_DOMAINS or not DOMAIN_RE.match(host):
        return None
    return host


def _normalize_page(uri_stem):
    """Map a request URI stem to a publishable page label, or None."""
    stem = urllib.parse.unquote(uri_stem)
    if stem.endswith("/index.html"):
        stem = stem[: -len("index.html")]
    if stem != "/" and stem.endswith(".html"):
        stem = stem[: -len(".html")]
    if stem != "/" and stem.endswith("/"):
        stem = stem.rstrip("/") or "/"
    if not PAGE_STEM_RE.match(stem):
        return None
    return stem


def _tally_log_lines(text, pending):
    """Fold one decompressed CloudFront log file into the pending counters.

    Only aggregate keys are produced; nothing per-event survives this
    function. Returns the number of page views counted.
    """
    field_index = {}
    views = 0
    for line in text.splitlines():
        if line.startswith("#Fields:"):
            field_index = {name: i for i, name in enumerate(line[len("#Fields:") :].split())}
            continue
        if line.startswith("#") or not field_index:
            continue
        cols = line.split("\t")
        try:
            date = cols[field_index["date"]]
            method = cols[field_index["cs-method"]]
            status = cols[field_index["sc-status"]]
            stem = cols[field_index["cs-uri-stem"]]
            referrer = cols[field_index["cs(Referer)"]]
            user_agent = cols[field_index["cs(User-Agent)"]]
        except (KeyError, IndexError):
            continue

        # Page views only: successful GETs for documents, not assets.
        if method != "GET" or status != "200":
            continue
        if not (stem.endswith(".html") or stem.endswith("/")):
            continue
        if not DATE_RE.match(date) or _looks_like_bot(user_agent):
            continue

        views += 1
        pending["total#views"] += 1
        pending[f"daily#{date}"] += 1
        page = _normalize_page(stem)
        if page:
            pending[f"page#{page}"] += 1
        domain = _referrer_domain(referrer)
        if domain:
            pending[f"referrer#{domain}"] += 1
    return views


def _flush(pending):
    """Apply pending counters to DynamoDB with atomic ADDs."""
    for item_id, n in pending.items():
        dynamodb.update_item(
            TableName=TABLE_NAME,
            Key=_ddb_id(item_id),
            UpdateExpression="ADD #c :n",
            ExpressionAttributeNames={"#c": "count"},
            ExpressionAttributeValues={":n": {"N": str(n)}},
        )
    pending.clear()


def _ingest_cloudfront_logs(context):
    """Claim and tally unprocessed log objects until done or near-timeout."""
    pending = Counter()
    processed = 0
    truncated = False
    last_seen = ""
    list_kwargs = {"Bucket": LOG_BUCKET, "Prefix": LOG_PREFIX}
    start_after = _read_cursor_start_after()
    if start_after:
        list_kwargs["StartAfter"] = start_after
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(**list_kwargs):
        for obj in page.get("Contents", []):
            if context.get_remaining_time_in_millis() < TIME_BUDGET_FLOOR_MS:
                truncated = True
                break
            key = obj["Key"]
            # Everything up to and including this key has a marker (either
            # pre-existing or written below), so the cursor may advance here.
            last_seen = key
            if not key.endswith(".gz") or not _claim_log_object(key):
                continue
            try:
                body = s3.get_object(Bucket=LOG_BUCKET, Key=key)["Body"].read()
                _tally_log_lines(gzip.decompress(body).decode("utf-8", "replace"), pending)
            except Exception as exc:  # noqa: BLE001 — one bad object must not kill the run
                # Marker-first by design: a failed object is skipped forever
                # (slight undercount) rather than risking a double-count.
                print(f"WARN: skipping unparseable log object {key}: {type(exc).__name__}")
            processed += 1
            if processed % FLUSH_EVERY_N_OBJECTS == 0:
                _flush(pending)
                _write_cursor(last_seen)
        if truncated:
            break
    _flush(pending)
    if last_seen:
        _write_cursor(last_seen)
    return processed, truncated


def _fetch_cloudflare_daily(today):
    """Pull uniques + per-country requests for the last 7 days from Cloudflare.

    Cloudflare aggregates these at the edge, so no PII enters our pipeline.
    Stored per-day as cf#daily# items; overwriting with the same window is
    idempotent. Returns True on success, False on failure (the caller raises
    after stats.json is published so the error alarm still fires).
    """
    if not CF_ZONE_ID or not CF_TOKEN_SSM_PARAM:
        print("WARN: Cloudflare zone/token not configured; skipping uniques/countries")
        return True

    token = ssm.get_parameter(Name=CF_TOKEN_SSM_PARAM, WithDecryption=True)["Parameter"]["Value"]
    payload = json.dumps(
        {
            "query": CLOUDFLARE_QUERY,
            "variables": {
                "zone": CF_ZONE_ID,
                "since": (today - timedelta(days=7)).isoformat(),
                "until": (today - timedelta(days=1)).isoformat(),
            },
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        CLOUDFLARE_GRAPHQL_URL,
        data=payload,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        print(f"ERROR: Cloudflare analytics query failed: {type(exc).__name__}")
        return False

    if body.get("errors"):
        # GraphQL errors carry no request PII; safe and useful to log.
        print(f"ERROR: Cloudflare analytics query returned errors: {body['errors']}")
        return False

    zones = (body.get("data") or {}).get("viewer", {}).get("zones") or []
    groups = zones[0].get("httpRequests1dGroups", []) if zones else []
    for group in groups:
        date = group.get("dimensions", {}).get("date", "")
        if not DATE_RE.match(date):
            continue
        uniques = int(group.get("uniq", {}).get("uniques") or 0)
        countries = {}
        for entry in group.get("sum", {}).get("countryMap") or []:
            code = str(entry.get("clientCountryName", ""))
            if ISO_COUNTRY_RE.match(code):
                countries[code] = int(entry.get("requests") or 0)
        dynamodb.put_item(
            TableName=TABLE_NAME,
            Item={
                **_ddb_id(f"cf#daily#{date}"),
                "uniques": {"N": str(uniques)},
                "countries": {"S": json.dumps(countries)},
            },
        )
    print(f"INFO: stored Cloudflare analytics for {len(groups)} day(s)")
    return True


def _scan_aggregates():
    """Read every aggregate item back (the table holds a few hundred items)."""
    items = []
    paginator = dynamodb.get_paginator("scan")
    for page in paginator.paginate(TableName=TABLE_NAME):
        items.extend(page.get("Items", []))
    return items


def _top_with_other(counts, label_is_valid):
    """Apply the k-anonymity floor and keep the top N buckets.

    Buckets below the floor — plus anything beyond the top N — collapse into
    a single "Other" bucket so no small (potentially identifying) bucket is
    ever published.
    """
    eligible = {k: v for k, v in counts.items() if v >= K_ANONYMITY_FLOOR and label_is_valid(k)}
    ranked = sorted(eligible.items(), key=lambda kv: (-kv[1], kv[0]))
    top = ranked[:TOP_N]
    other = sum(v for k, v in counts.items() if label_is_valid(k)) - sum(v for _, v in top)
    result = [{"label": k, "value": v} for k, v in top]
    if other > 0:
        result.append({"label": "Other", "value": other})
    return result


def _render_payload(items, today):
    totals = 0
    daily = {}
    pages = Counter()
    referrers = Counter()
    cf_uniques = 0
    cf_countries = Counter()

    for item in items:
        item_id = item.get("id", {}).get("S", "")
        count = int(item.get("count", {}).get("N", "0")) if "count" in item else 0
        if item_id == "total#views":
            totals = count
        elif item_id.startswith("daily#"):
            date = item_id[len("daily#") :]
            if DATE_RE.match(date):
                daily[date] = count
        elif item_id.startswith("page#"):
            pages[item_id[len("page#") :]] += count
        elif item_id.startswith("referrer#"):
            referrers[item_id[len("referrer#") :]] += count
        elif item_id.startswith("cf#daily#"):
            cf_uniques += int(item.get("uniques", {}).get("N", "0"))
            try:
                stored = json.loads(item.get("countries", {}).get("S", "{}"))
            except ValueError:
                stored = {}
            for code, requests in stored.items():
                if ISO_COUNTRY_RE.match(str(code)):
                    cf_countries[str(code)] += int(requests)

    series_start = today - timedelta(days=DAILY_SERIES_DAYS - 1)
    daily_series = [
        {"date": (series_start + timedelta(days=offset)).isoformat(), "views": daily.get((series_start + timedelta(days=offset)).isoformat(), 0)}
        for offset in range(DAILY_SERIES_DAYS)
    ]

    return {
        "totalViews": totals,
        "lastUpdated": today.isoformat(),
        "since": min(daily) if daily else today.isoformat(),
        "dailySeries": daily_series,
        "topPages": _top_with_other(pages, lambda k: bool(PAGE_STEM_RE.match(k))),
        "topReferrers": _top_with_other(referrers, lambda k: bool(DOMAIN_RE.match(k))),
        "uniqueVisitors": cf_uniques,
        "countries": _top_with_other(cf_countries, lambda k: bool(ISO_COUNTRY_RE.match(k))),
    }


def lambda_handler(event, context):
    today = datetime.now(timezone.utc).date()

    processed, truncated = _ingest_cloudfront_logs(context)
    print(f"INFO: processed {processed} new log object(s); truncated={truncated}")

    cloudflare_ok = _fetch_cloudflare_daily(today)

    payload = _render_payload(_scan_aggregates(), today)
    s3.put_object(
        Bucket=WEBSITE_BUCKET,
        Key=STATS_KEY,
        Body=json.dumps(payload, separators=(",", ":")).encode("utf-8"),
        ContentType="application/json",
        CacheControl="max-age=3600",
    )
    print(f"INFO: published {STATS_KEY}: totalViews={payload['totalViews']}, uniqueVisitors={payload['uniqueVisitors']}")

    # Raised only after stats.json is published, so a Cloudflare outage still
    # refreshes the CloudFront-derived metrics *and* trips the error alarm
    # instead of going silently stale.
    if not cloudflare_ok:
        raise RuntimeError("Cloudflare analytics query failed (see logs)")

    return {
        "processedObjects": processed,
        "truncated": truncated,
        "totalViews": payload["totalViews"],
    }

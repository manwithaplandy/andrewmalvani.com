"""Pure, bounded public analytics projection; no SDK clients or network imports."""
import json
import re
from collections import Counter
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

K_ANONYMITY_FLOOR = 5
TOP_N = 5
MAX_COUNT = 1_000_000_000
DAILY_SERIES_DAYS = 30
DOMAIN_RE = re.compile(r'^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)+$')
IPV4_RE = re.compile(r'^\d{1,3}(?:\.\d{1,3}){3}$')
ISO_COUNTRY_RE = re.compile(r'^[A-Z]{2}$')
PAGE_STEM_RE = re.compile(r'^/[A-Za-z0-9/_.-]{0,99}$')
DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
SOURCE_SCOPES = {'cloudfront': 'site-document-requests', 'cloudflare': 'zone-requests'}


def valid_day(value):
    if not isinstance(value, str) or not DATE_RE.fullmatch(value):
        return False
    try:
        return date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def parse_count(value):
    """Accept low-level DynamoDB numeric strings, rejecting absent/bad values."""
    if value is None or isinstance(value, bool):
        return None
    try:
        number = Decimal(str(value))
        if not number.is_finite() or number < 0:
            return None
        return int(min(number, MAX_COUNT))
    except (InvalidOperation, ValueError, TypeError):
        return None


def _number(item, field):
    attribute = item.get(field)
    return parse_count(attribute.get('N')) if isinstance(attribute, dict) else None


def _collect(items, today):
    totals = None
    daily = {}
    pages, referrers, countries = Counter(), Counter(), Counter()
    cf_daily = {}
    today_string = today.isoformat()
    for item in items:
        item_id = item.get('id', {}).get('S', '')
        if not isinstance(item_id, str):
            continue
        count = _number(item, 'count')
        if item_id == 'total#views' and count is not None:
            totals = count
        elif item_id.startswith('daily#'):
            day = item_id[len('daily#'):]
            if valid_day(day) and day <= today_string and count is not None:
                daily[day] = count
        elif item_id.startswith('page#') and count is not None:
            pages[item_id[len('page#'):]] += count
        elif item_id.startswith('referrer#') and count is not None:
            referrers[item_id[len('referrer#'):]] += count
        elif item_id.startswith('cf#daily#'):
            day = item_id[len('cf#daily#'):]
            uniques = _number(item, 'uniques')
            if not valid_day(day) or day >= today_string or uniques is None:
                continue
            cf_daily[day] = uniques
            try:
                stored = json.loads(item.get('countries', {}).get('S', '{}'))
            except (ValueError, TypeError):
                stored = {}
            if isinstance(stored, dict):
                for code, value in stored.items():
                    requests = parse_count(value)
                    if isinstance(code, str) and ISO_COUNTRY_RE.fullmatch(code) and requests is not None:
                        countries[code] += requests
    return totals, daily, pages, referrers, cf_daily, countries


def source_measurements(items, today):
    """Coverage comes from stored measurement days, never from job execution."""
    totals, daily, _, _, cf_daily, _ = _collect(items, today)
    return {
        name: {'since': min(days) if days else None, 'through': max(days) if days else None,
               'available': totals is not None if name == 'cloudfront' else bool(days)}
        for name, days in [('cloudfront', daily), ('cloudflare', cf_daily)]
    }


def _top_with_other(counts, label_is_valid):
    valid = {label: count for label, count in counts.items() if label_is_valid(label)}
    ranked = sorted(((label, count) for label, count in valid.items() if count >= K_ANONYMITY_FLOOR),
                    key=lambda pair: (-pair[1], pair[0]))
    top = ranked[:TOP_N]
    other = sum(valid.values()) - sum(count for _, count in top)
    result = [{'label': label, 'value': min(count, MAX_COUNT)} for label, count in top]
    if other > 0:
        result.append({'label': 'Other', 'value': min(other, MAX_COUNT)})
    return result



def cloudflare_projection(items, today):
    """Bounded public measurements accepted together with source metadata."""
    _, _, _, _, daily, countries = _collect(items, today)
    return {'uniqueVisitors': min(sum(daily.values()), MAX_COUNT),
            'countries': _top_with_other(countries, lambda label: bool(ISO_COUNTRY_RE.fullmatch(label)))}


def read_cloudflare_checkpoint(item):
    """None means pre-checkpoint legacy; malformed checkpoint fails closed."""
    if item is None or not any(key in item for key in ['checkpointVersion', 'publicProjection']):
        return None
    if item.get('checkpointVersion') != {'N': '1'}:
        raise ValueError('Invalid Cloudflare checkpoint version')
    try:
        projection = json.loads(item['publicProjection']['S'])
        fields = ['status', 'scope', 'since', 'through', 'lastSuccessfulUpdate']
        if any(item[field] != {'NULL': True} and
               (set(item[field]) != {'S'} or not isinstance(item[field]['S'], str)) for field in fields):
            raise ValueError('Invalid checkpoint source attribute')
        source = {field: item[field].get('S') for field in fields}
        count = projection['uniqueVisitors']
        rows = projection['countries']
        if (source['status'] not in ['current', 'stale', 'unavailable'] or source['scope'] != 'zone-requests'
                or any(day is not None and not valid_day(day) for day in
                       [source['since'], source['through'], source['lastSuccessfulUpdate']])
                or (source['status'] == 'current' and not valid_day(source['lastSuccessfulUpdate']))
                or type(count) is not int or not 0 <= count <= MAX_COUNT
                or not isinstance(rows, list) or len(rows) > TOP_N + 1):
            raise ValueError('Invalid Cloudflare checkpoint')
        labels = set()
        for row in rows:
            label, value = row['label'], row['value']
            if (not isinstance(label, str) or label in labels
                    or not (ISO_COUNTRY_RE.fullmatch(label) or label == 'Other')
                    or type(value) is not int or not 0 < value <= MAX_COUNT
                    or (label != 'Other' and value < K_ANONYMITY_FLOOR)):
                raise ValueError('Invalid Cloudflare checkpoint countries')
            labels.add(label)
        if source['status'] == 'unavailable' and (count != 0 or rows):
            raise ValueError('Unavailable checkpoint contains measurements')
        if len(labels - {'Other'}) > TOP_N:
            raise ValueError('Too many named Cloudflare checkpoint countries')
        return source, {'uniqueVisitors': count, 'countries': rows}
    except (KeyError, TypeError, AttributeError, ValueError) as exc:
        raise ValueError('Invalid Cloudflare checkpoint') from exc


def render_payload(items: list[dict], today: date, source_status: dict[str, dict]) -> dict:
    totals, daily, pages, referrers, cf_daily, countries = _collect(items, today)
    observations = []
    for offset in range(DAILY_SERIES_DAYS, 0, -1):
        day = (today - timedelta(days=offset)).isoformat()
        views = daily.get(day)
        observations.append({'date': day, 'views': views,
                             'status': 'missing' if views is None else 'provisional' if offset == 1 else 'observed'})
    projection = cloudflare_projection(items, today)
    checkpoint = next((item for item in items if item.get('id', {}).get('S') == 'source#cloudflare'), None)
    try:
        accepted = read_cloudflare_checkpoint(checkpoint)
        if accepted is not None:
            _, projection = accepted
    except ValueError:
        projection = {'uniqueVisitors': 0, 'countries': []}
    sources = {
        name: {field: source_status[name][field] for field in
               ['status', 'since', 'through', 'lastSuccessfulUpdate', 'scope']}
        for name in SOURCE_SCOPES
    }
    return {
        'schemaVersion': 2,
        'sources': sources,
        'dailyObservations': observations,
        'totalViews': totals if totals is not None else 0,
        'uniqueVisitors': projection['uniqueVisitors'],
        'lastUpdated': today.isoformat(),
        # Legacy requires a string. Only v2 source bounds represent absence.
        'since': min(daily) if daily else today.isoformat(),
        'dailySeries': [{'date': point['date'], 'views': point['views']} for point in observations
                        if point['views'] is not None],
        'topPages': _top_with_other(pages, lambda label: bool(PAGE_STEM_RE.fullmatch(label))),
        'topReferrers': _top_with_other(referrers, lambda label: bool(DOMAIN_RE.fullmatch(label))
                                       and not IPV4_RE.fullmatch(label)),
        'countries': projection['countries'],
    }

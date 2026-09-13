# Website delivery operations

## Public route contract

The checked CloudFront viewer-request function is `terraform/functions/rewrite-extensionless.js`. Terraform loads that exact source file and the Node VM route tests execute it directly.

- `/` rewrites to `/index.html`.
- Extensionless paths such as `/stats`, `/graph`, and unknown page names rewrite to the matching `.html` object.
- A non-root path ending in `/` returns a permanent redirect to the extensionless form. Query fields retain the encoded CloudFront event representation. When `multiValue` is present it already contains the first occurrence, so the redirect serializes that array once and does not also append `value`.
- Paths with filename extensions remain unchanged, including résumé downloads and Next.js static assets.
- Redirect paths always begin with one site-local slash. Additional leading slashes and backslashes are encoded before entering `Location` so unusual viewer input cannot create a protocol-relative external redirect.

The local tests include event fields containing `%20`, `%2B`, `%26`, `%25`, and repeated values. Their VM round trip follows AWS's published event-shape and normalization example, but it does not prove how every viewer request becomes a live CloudFront event. Before rollout, use an actual CloudFront test invocation and then send real public trailing-slash requests containing those encoded values and repeats. Inspect `Location`, follow it, and confirm the values retain their intended meaning. This runtime/viewer-to-event evidence has not yet been collected.

## Contact API release boundary

The REST API remains `vs7dthj3vb`, with the existing named `api` stage and
`formSubmission` Lambda. `GET /api/healthcheck` uses an API Gateway MOCK with an
explicit `{"statusCode":200}` request mapping. A 200 demonstrates API reachability
only; it does not invoke Lambda or prove SNS/email delivery.

Terraform owns one exact browser origin list: `https://andrewmalvani.com` and
`https://www.andrewmalvani.com`. Both `OPTIONS /api/contact` and POST use the
existing Lambda proxy integration. The handler selects a matching origin and
returns `Vary: Origin` on success, validation failure, publish failure, and
preflight. It permits `Content-Type` and `OPTIONS,POST`. OPTIONS returns before
body parsing or SNS publication. The retained integration-response resource
identities do not provide a second static origin policy: [AWS proxy integrations
obtain CORS headers from the backend](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html).

Unknown, lookalike, empty, and `null` Origin values receive 403 without
`Access-Control-Allow-Origin` or notification. Requests without an Origin remain
compatible with public non-browser clients, without a browser origin grant.
CORS is not authentication; clients can omit or forge Origin. Existing server
validation, sanitization, name/email/message limits of 100/254/2000, clean errors,
and the SNS destination remain in force. Tests use only synthetic clients and
never send contact notifications.

The deployment trigger now fingerprints the evaluated route paths, methods,
integrations, method responses, integration responses, and origin list instead
of the unset REST API body. Required responses and Lambda invocation permission
are dependencies. `create_before_destroy` creates the replacement deployment
before the old one is retired; `aws_api_gateway_stage.api` is the sole stage
owner. Local native Terraform mock tests check real configuration mutations and
no-op fingerprint stability, not the live stage transition.

Before the controller releases this change, use this one-time compatibility
sequence. The current live function has only the singular `ALLOWED_ORIGIN`;
installing the new handler first would grant no browser origins.

1. Privately preserve the current Lambda configuration and every environment
   key/value. Read/merge through the SDK without printing secrets, add
   `ALLOWED_ORIGINS` with the exact JSON value
   `["https://andrewmalvani.com","https://www.andrewmalvani.com"]`, and retain the
   singular key and all other keys. Use the current revision as a concurrency
   guard. Wait for `State=Active` and `LastUpdateStatus=Successful`, then read
   back and verify the full merge. The old handler ignores the additional key.
2. Install the exact checked contact ZIP using the refreshed revision. Wait for
   successful completion and verify deployed code digest, runtime, handler and
   preserved environment. The new code can now serve POST and OPTIONS with the
   allow-list already present. Do not proceed on partial update/readback.
3. Prepare the existing OPTIONS integration **in place**, only after the checked
   code is ready. The real preflight plan showed create-then-delete replacement:
   in [locked AWS provider 5.50.0](https://github.com/hashicorp/terraform-provider-aws/blob/v5.50.0/internal/service/apigateway/integration.go),
   type and integration method are ForceNew, creation uses `PutIntegration`, and
   deletion uses `DeleteIntegration` for the same REST API/resource/HTTP-method
   tuple. That ordering can delete the just-written integration. The reviewed
   one-time remedy is a controller-owned `PutIntegration` on the existing API
   `vs7dthj3vb`, existing contact resource, HTTP method `OPTIONS`, with type
   `AWS_PROXY`, integration HTTP method `POST`, and the exact reviewed
   `formSubmission` Lambda invoke URI from Terraform. Before writing, require
   the tuple/configuration to match the privately preserved expected old MOCK
   configuration or the exact reviewed new proxy configuration; abort any
   unexpected tuple, URI or setting. An exact-new match is already prepared,
   not grounds for another migration. Preserve/read back the tuple and approved
   settings privately. Record the stage deployment ID before preparation and
   require it to remain unchanged through environment, code and integration
   preparation. Do not call `DeleteIntegration`,
   replace the resource, or deploy a stage in this preparation step. The live
   stage retains its old API snapshot until the later deployment; both-host
   OPTIONS acceptance is not established by this write alone.
4. Produce a **fresh refreshed state-backed Terraform plan after preparation**.
   Reject any OPTIONS integration replacement or deletion, in either action
   order. An immutable deployment replacement and in-place stage deployment
   pointer update are expected; stage/API/Lambda replacement, resource renaming,
   unrelated changes, or loss of other environment keys fail scope. Verify
   removal of `deployment.stage_name` preserves the explicit existing stage.
   Terraform may now remove the obsolete singular origin key, retaining the
   exact plural list. Apply only the newly reviewed plan; never reuse the plan
   with the unsafe OPTIONS replacement. Preserve all analytics/exact-artifact
   gates. If using the [short analytics handover](analytics.md#conditional-short-stopteststart-handover),
   keep Terraform out of its stopped interval.
5. Verify live health and the active stage's new deployment ID. Exercise
   preflight and invalid POST from both exact public origins, inspect matching
   CORS and `Vary` headers, and confirm unknown origins receive no browser grant.
   Invalid input and OPTIONS must not send a notification. Observe the real
   browser on both hosts; local source/ZIP and mock tests are not API Gateway or
   Cloudflare runtime evidence.
6. Any valid synthetic delivery probe is controller-owned and separately
   authorized because it sends a notification. A Lambda 200 confirms SNS publish
   acceptance, not recipient delivery. Record the actual observed boundary.

The existing main workflow applies Terraform before updating existing Lambda
code. That generic order does not perform this one-time migration preparation;
it must not be used to bypass the environment/code/integration gates above.

No production configuration, invocation, or public request was performed for
this local implementation. The controller owns the live plan/release checks.

## Missing-page recovery

The static export contains a dark/orange `404.html` with a clear `Page not found` heading, links to the résumé and contact section, a specific document title, and `noindex, nofollow` robots metadata. Local preview checks require an actual HTTP 404 and 320-pixel fit.

CloudFront maps origin 403 and 404 responses to the checked document:

| Origin response | Response document | Viewer status | Error cache TTL |
| --- | --- | --- | --- |
| 403 | `/404.html` | 404 | 10 seconds |
| 404 | `/404.html` | 404 | 10 seconds |

This translation applies to any origin 403 or 404 response, including permission failures. The E1 error mapping leaves successful route selection, static extension paths, resource identities and origin selection unchanged; E4 separately prepares the cache policies below. The known-asset post-release check guards against hiding a broader origin-permission failure behind the recovery page.

## Access-log self-targeting

The log bucket remains the destination for website access logs under `website-log/` and CloudFront logs under `cloudfront-logs/`. Its bucket, stored objects, versioning, bucket policy, ownership controls, three lifecycle rules, and all Terraform resource identities remain in place. The only relationship removed by E2 is the log bucket writing S3 access logs about itself back into `this-bucket-log/`.

The controller verified the live self-target on 2026-09-08 using read-only `GetBucketLogging`: `mostly-upward-lion-log-bucket` targeted itself with prefix `this-bucket-log/`. No setting was changed. The existing metadata-only prefix baseline at 2026-09-08 07:17:28 UTC observed:

| Prefix | Current objects observed | Bytes observed | Listing boundary |
| --- | ---: | ---: | --- |
| `cloudfront-logs/` | 11,894 | 15,127,314 | Complete 12-page listing |
| `website-log/` | 71,198 | 58,489,829 | Complete 72-page listing |
| `this-bucket-log/` | At least 100,000 | At least 113,812,996 | Capped after 100 pages; incomplete |

The listing read object count and size metadata only; it did not fetch log bodies or retain keys. It excluded versions and delete markers and was not an atomic snapshot. The self-log row is a lower bound, not an exact total, growth rate, or savings estimate. Repeating the same 100-page cap can compare bounded observations but cannot yield an actual total-prefix growth delta. Quantified total growth requires complete comparable coverage or another explicitly justified metric and a documented observation window.

The configured lifecycle policy remains enabled for all three prefixes: current objects become eligible for expiration after 90 days, and versions become eligible after 30 days as noncurrent. This is configured policy rather than a physical deletion audit or an exact retention-duration guarantee; noncurrent age starts when a version becomes noncurrent. Expiration also does not prove that analytics history can be reconstructed from remaining objects.

The controller-owned consolidated state-backed plan must classify the E2 action as removal of only `aws_s3_bucket_logging.log_bucket_logs`. Replacement or deletion of the log bucket, stored data, versioning, normal website/CloudFront log delivery, or any lifecycle change fails this scope. No real plan or apply occurred during E2 implementation.

After an authorized release, use read-only checks to confirm the log bucket no longer targets itself while website and CloudFront sources still target the same bucket/prefixes. Existing queued S3 deliveries may arrive briefly. Record the observation interval and measurement coverage. If complete comparable coverage or another justified total metric is unavailable, retain only bounded observations and leave actual total growth and savings unmeasured.

## Transport path and verified boundary

The 2026-09-08 evidence supports this request path:

```mermaid
flowchart LR
  V[Viewer] -->|HTTP observed: one 301 to same-host HTTPS| C[Cloudflare edge]
  V -->|HTTPS observed: valid certificate and 200| C
  C -.->|Origin scheme and account SSL mode unknown| F[CloudFront EDHU4C51HW4BG]
  F -->|Default behavior: signed HTTPS via OAC| S[S3 website bucket]
```

| Hop or setting | Verified nonsecret record | Evidence limit |
| --- | --- | --- |
| Viewer to Cloudflare | Apex and `www` HTTP each returned one Cloudflare 301 to same-host HTTPS and then 200. HTTPS homepage/deep-link checks returned 200 with ordinary certificate validation. | Observed paths do not expose account SSL mode, DNS proxy state, cache rules, or Browser Cache TTL. |
| Cloudflare to CloudFront | CloudFront distribution `EDHU4C51HW4BG` is reachable at `d2v6o77xftr5if.cloudfront.net`; direct HTTPS connections retaining apex or `www` Host/SNI returned 200 with certificate verification enabled. | The Cloudflare account is unauthenticated here. Its actual origin scheme is unknown, so this hop is not claimed encrypted. |
| CloudFront host coverage | Aliases are `andrewmalvani.com` and `www.andrewmalvani.com`. The attached ACM certificate is ISSUED, covers the apex and `*.andrewmalvani.com`, expires 2027-03-10T16:59:59-07:00, and uses SNI with minimum TLS policy `TLSv1.2_2021`. | Certificate and direct-origin success establish prerequisites for these hostnames; they do not prove Cloudflare is configured for Full (strict). Recheck validity at release. |
| CloudFront routing | The selected default origin is `mostly-upward-lion-website-bucket.s3.us-west-1.amazonaws.com` through OAC `E3Q6QZXOS9AMQ8`. The two custom apex/`www` origins exist but are not selected by the default behavior. | Preserve these origin/resource identities; do not mistake the unused custom origins for the live default hop. |
| CloudFront to S3 | OAC is S3 type, `signing_behavior=always`, `signing_protocol=sigv4`. AWS documents that always-sign S3 OAC uses HTTPS. | Configuration evidence, not a packet capture. See [AWS OAC prerequisites](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html). |
| Current CloudFront viewer policy | `allow-all`, retained in E3. | The old Terraform comment asserted Flexible mode without authenticated evidence. Public behavior cannot prove that setting, so a one-sided policy change is unsafe. |
| Public assets and cache behavior | Existing evidence records successful PDF, `stats.json`, and an actual HTML-referenced chunk. PDF/chunk showed public `max-age=14400` and Cloudflare MISS then HIT; stats showed `max-age=3600` and DYNAMIC. | A tiny public sample is not the account cache configuration, field performance evidence, or proof of the Cloudflare-to-CloudFront scheme. |

The source evidence is `evidence/delivery-entry-paths-before.json`, `evidence/delivery-origin-access-control.json`, `evidence/delivery-cache-before.json`, and the read-only distribution/certificate record in the SDD environment notes. No new public or cloud query was made for E3.

### Conditional coordinated rollout

Before any change, authenticated account access must record the nonsecret previous values for Cloudflare SSL/TLS mode, apex and `www` proxy state, Always Use HTTPS or equivalent redirect behavior, matching HTML/`stats.json` cache rules, and Browser Cache TTL. Record the current CloudFront viewer policy and checked distribution/configuration revision with them. The current Cloudflare values are unknown; do not fill them from public-response inference.

Choose the branch from that authenticated record:

1. **Full (strict) is active and origin validation succeeds.** Confirm both proxied hostnames use the expected CloudFront origin and repeat normal-certificate HTTPS origin checks for apex and `www`. Retain Full (strict). A separately reviewed coordinated plan may then change CloudFront's viewer policy to `redirect-to-https`; verify the complete entry-path matrix before accepting it.
2. **Flexible is active.** First revalidate the issued certificate's hostname coverage/expiry and direct HTTPS origin reachability. Save the complete previous settings. Change Cloudflare to Full (strict) first, then verify apex/`www` homepage, `/graph`, `/stats`, PDF, `stats.json`, and an actual current chunk over HTTPS with no loop or certificate error. Only after that succeeds may the reviewed CloudFront viewer-policy change proceed. Cloudflare's [Full (strict) requirements](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/) are the acceptance boundary.
3. **Origin validation fails.** Leave Cloudflare mode and CloudFront `allow-all` unchanged. Repair the exact certificate coverage, expiry, Host/SNI, DNS target, or HTTPS reachability failure, then repeat validation before returning to either branch above. Never disable certificate verification to pass the check.

If the authenticated mode is neither expected branch, either hostname is DNS-only, or the hostnames do not share the recorded configuration, stop and prepare an explicit coordinated plan for the actual state. Do not apply a generic redirect change.

Success requires HTTP entry paths to reach same-host HTTPS once, HTTPS pages/assets to succeed on apex and `www`, Cloudflare-to-CloudFront to use verified Full (strict), CloudFront-to-S3 to retain signed HTTPS, and no loop or certificate error. Post-release checks must cover homepage, graph, stats, PDF, `stats.json`, an actual candidate chunk, the unique 404 path, and the known-asset guard.

Rollback restores the complete recorded prior configuration in reverse order: restore CloudFront's prior viewer policy/configuration revision if it changed, restore the prior Cloudflare SSL/TLS mode, restore each hostname's prior proxy state, restore the prior edge redirect setting, and restore the prior matching cache rules and Browser Cache TTL. Then purge only through the reviewed procedure and repeat the same entry-path/origin checks. Restoring one redirect flag is not a complete rollback. Preserve diagnostic status/location/certificate evidence without recording credentials.

F19 remains open until authenticated Cloudflare mode/proxy evidence, the authorized coordinated change if needed, and the full post-release matrix are complete. E4's freshness claims also remain gated on the actual matching Cloudflare cache rules and Browser Cache TTL: Cloudflare can override origin directives, and a purge does not clear existing browser caches. See [Browser Cache TTL](https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/set-browser-ttl/) and [Cloudflare cache-control behavior](https://developers.cloudflare.com/cache/concepts/cache-control/).

## Release order and gates

### Website/contact artifacts while analytics remains pending

Pushes to `main` resolve explicitly to `website-contact`. Manual dispatch offers
`website-contact` (default) or `analytics`; other events or mode values are rejected.
Website/contact releases publish the same-run checked site/manifest and contact
archive, invalidate the existing distribution, and verify ordinary public reader
bytes and legacy/v1/v2 behavior. They **apply no Terraform and never install the
checked analytics archive**, even when that archive differs from deployed code.

This is a temporary exact admission signature, not a general ignore-drift rule.
The privileged job still creates a complete, private, state-backed full plan.
`scripts/verify_website_contact_release.mjs` requires exactly two updates: the
existing `statsAggregator` reservation from `-1` (unreserved) to `1`, and the exact
old/new `stats-aggregator-errors` description recorded in the helper. Every other
field must stay identical, required managed resource identities must be present,
and every other action, import, replacement, deferred/unknown value or missing
drift blocks publication. New infrastructure work must stop normal release and
receive its own review; do not target-plan, broaden the signature, or treat this
mode as approval to apply those two changes. After analytics migration, replace
this temporary admission policy through review rather than silently allowing a
missing drift.

Before publication, existing AWS CLI read permissions capture the restored
legacy stats digest, absent function reservation, enabled daily rule, exact sole
unqualified target, invocation permission and alarm configuration. Only canonical
configuration digests and selected nonsecret facts cross jobs. The baseline and
comparison receipts never contain raw Lambda environment or policy bodies. The
publish bucket, distribution and contact function must match admitted identities;
the contact package cannot target `statsAggregator`. After both contact install
and site publication/invalidation/public-reader proof succeed, the workflow
captures again and rejects any protected configuration change. Alarm runtime
state/timestamps may change; its description/configuration may not. The active
legacy daily producer owns `stats.json`, so before/after metadata is recorded
without requiring equality. The publisher continues excluding that object.

The CI role does not have or request `lambda:GetAccountSettings`. The controller
separately verifies the regional quota remains 10 before/after deployment; no
quota write or additional permission is part of this workflow. A failed snapshot,
target check, plan admission or public reader check fails the release. A passing
artifact-only receipt explicitly leaves analytics pending. This is operational
configuration evidence, not an atomic cross-service snapshot or proof that a
future daily invocation succeeded.

Both paths retain the whole-release concurrency group and dispose of private
binary/JSON plans and private output even after failure. Only the nonsecret
protected-state receipts are uploaded. The original `analytics` mode below keeps
manual attestation and bounded release-record validation, no-writer/durable-backup
requirements, pre-apply reader bootstrap when needed, recovery staging before the
saved full-plan apply, and checked producer installation after public reader proof.
Website/contact mode skips recovery staging and apply; its normal complete site
publication still uploads hashes before stable files, including the recovery page.

The remaining apply/cutover order in this section describes **analytics mode**.
It is not performed by an ordinary website/contact artifact release.


Use one reviewed candidate `out` artifact, the two checked Lambda archives and one consolidated state-backed Terraform plan. The reusable verification workflow builds the website once and publishes those exact artifacts for the same workflow run. The privileged deployment job verifies their manifests before planning. The plan must show the intended edge-function source and the two custom error responses for this task, alongside only other independently reviewed release changes. Binary plan, JSON plan and full plan/apply output remain private in that job because they can contain private input and state values; they are never uploaded as workflow artifacts. The controller completed a consolidated read-only state-backed plan on September 8, 2026 at `c9a2a6f`: seven expected managed actions, no replacements, preserved resource/retention/zone/package identities. E5 fix `7eb35b4` changes no Terraform or package inputs. See the [sanitized plan report](../reviews/remediation-evidence/2026-09-07-design-ux-remediation/terraform-final-read-only-plan-report.md). This is a time-bounded scope review, not an apply artifact or release authorization; replan for an approved release.

Before Terraform apply the workflow rechecks the bounded candidate manifest containing file digests, lengths, MIME types, cache metadata and verified HTML/CSS static references. It uploads all candidate `_next/static` objects without deletion, then uploads `404.html` last. This order retains old hashed assets and makes the complete recovery page available before CloudFront can enable the error mapping. It does not upload or delete `stats.json`, and the later full manifest publication also excludes that producer-owned object.

If the bucket does not exist, the pre-apply upload stops the release. Use the separately reviewed bootstrap procedure; do not create a temporary Terraform address or enable an error mapping whose recovery document is absent. The same stop applies if the candidate recovery document or any referenced candidate static asset is missing.

The analytics release gates remain load-bearing:

Before pausing or releasing analytics, pass the [regional concurrency
preflight](analytics.md#regional-concurrency-preflight): regional account limits
and the current function reservation must support reserved concurrency 1 while
preserving AWS's unreserved minimum. A Terraform plan or local test does not
establish that capacity. Insufficient capacity blocks the pause; regional quota
changes require separate owner approval and possibly AWS Support. API/frontend
readiness does not establish producer readiness. If already stopped, restoration
of old code is limited to the [verified pre-write exception](analytics.md#rollback-and-release-closure);
otherwise retain new code and stop admission.

- A first creation or replacement of the analytics producer requires the public compatible reader check before apply.
- Ordinary analytics code updates remain downstream of website publication, CloudFront invalidation, and the public reader check.
- Follow the no-writer, durable-backup, and historical-preservation prerequisites in [analytics operations](./analytics.md) for an analytics cutover. Staging recovery assets does not satisfy or bypass them.

The workflow classifies changes to the analytics producer, its schedule/target/invocation permission, producer IAM, data table, producer logging/alarms, source log-bucket controls, every website-versioning change, website-bucket create/delete, and CloudFront logging fields. A real unknown leaf in CloudFront logging also stops the automatic path; empty unknown-schema containers and unrelated cache/routing changes do not. The workflow also compares the checked analytics archive digest with the deployed code digest. In analytics mode, any caught infrastructure or code change requires the manual release boundary; website/contact mode uses the stricter two-drift admission above instead of entering this analytics gate. A manual run must affirm that the no-writer window and durable quiesced backup are complete and supply a bounded nonsecret release-record identifier before any upload/apply. That input records operator authorization; the underlying private quiescence and backup evidence remains required. First analytics-Lambda create/replacement still adds the stronger pre-apply public-reader proof. One workflow-wide concurrency group prevents overlapping release runs from mixing artifacts or producer versions.

After apply, publish the complete same candidate manifest with `stats.json` excluded, then invalidate the distribution through the reviewed workflow. Both phases verify the manifest against the actual downloaded files before their first upload. The ordinary public-reader check must pass before the exact checked analytics archive can be installed.

## Post-release verification

No production rollout or CloudFront invocation was performed during E1–E3 implementation. After an approved rollout:

1. Check `/`, `/stats`, `/stats/`, `/graph`, and `/graph/` on both public hostnames. Each page should work directly or through one purposeful redirect.
2. Repeat the trailing-slash checks with repeated fields and encoded space, plus, ampersand, and percent values. Inspect and follow `Location`; record the actual viewer-to-event/runtime behavior.
3. Request a unique nonexistent extensionless path. Require HTTP 404, the styled recovery page, working résumé/contact links, and no S3 XML access-denied response.
4. Request a known versioned Next.js asset and the résumé PDF. A successful asset response guards against hiding a broader origin-permission failure behind the custom 404.
5. Record response status, redirect location, cache/error-cache headers, checked commit and candidate artifact identity. Do not mark F15's live behavior closed until these public checks pass.

If the recovery document or its assets fail, stop further rollout, preserve the candidate and plan evidence, and restore a previously complete site artifact through the reviewed release path. Do not remove buckets, rename Terraform resources, or use the custom 404 to mask an origin-access problem.

## Checked verification and artifact continuity

`.github/workflows/checks.yml` runs directly for pull requests and is called by the main release workflow. It has only `contents: read` permission and receives no cloud credentials. Node22/Yarn Classic and Python3.12 install pinned project/test dependencies; the job builds deterministic Lambda archives, runs backend tests against those exact archives, runs both TypeScript checks and nonmutating lint, builds the website once, requires real Chromium/WebGL browser coverage, and runs release/publication/edge tests. Terraform uses backend-disabled strict locked initialization. A before/after tracked-source comparison catches formatter, lock or generator mutation. Failure-only browser/test logs have three-day retention and contain synthetic test traffic, not contact drafts or cloud data.

Successful verification publishes three same-run artifacts: `checked-web`, `checked-lambda-archives` and `checked-site-manifest`. The main workflow does not rebuild or repackage them. It verifies the archive and website manifests, copies the archive bytes to the unchanged Terraform bootstrap filenames without adding `source_code_hash`, and later supplies the same downloaded archives to Lambda code update. The deterministic packager's interface is:

```sh
python3 scripts/package_release_artifacts.py build --output-dir release-artifacts
python3 scripts/package_release_artifacts.py verify --output-dir release-artifacts
```

The stats package contains `lambda_function.py`, `ledger.py` and `payload.py`; the contact package contains only `lambda_function.py`. Removed `archive_file` data declarations cannot overwrite checked bytes. The archive provider remains explicitly pinned to2.4.2 for the first reviewed plan to remove the former data objects from existing state; remove that transitional declaration/lock only in a later reviewed post-apply change. The unused null-provider lock entry was removed under the separately approved lock ruling; all used provider versions and hashes remain.

The workflow files establish checks but do not configure GitHub merge enforcement. Their stable source labels are workflow/job `Verify release candidate`; confirm the actual required-check context from the first authorized PR run before separately enabling branch protection. A real no-secret PR run, intentionally failing temporary-branch run, passing run, controlled deployment and old-tab/fresh-tab continuity check remain external release evidence.


## Prepared cache contract — E4

This contract is implemented locally and has not been activated or publicly verified. Ruling19 permits preparing AWS policies and artifact metadata while Cloudflare settings remain unknown; it does not authorize deployment or establish end-to-end freshness. Preserve the working `allow-all` viewer policy and the authenticated account/release gates above.

| Object class | Origin `Cache-Control` | CloudFront default / maximum TTL | Minimum TTL |
| --- | --- | --- | --- |
| HTML, including `404.html` | `public, max-age=60, s-maxage=300, no-transform` | 300 / 300 seconds | 0 |
| PDF and other stable candidate addresses | `public, max-age=60, s-maxage=300` | 300 / 300 seconds | 0 |
| Content-hashed `/_next/static/*`, including build-specific manifests, CSS and fonts | `public, max-age=31536000, s-maxage=31536000, immutable` | 31,536,000 / 31,536,000 seconds | 0 |
| Independently published `stats.json` | `public, max-age=60, s-maxage=300` | Same stable policy, 300 / 300 seconds | 0 |

Two new CloudFront cache policies replace CachingDisabled for the existing default behavior and add the hashed-path behavior, both targeting the same S3 origin/OAC. Gzip/Brotli cache variants and automatic compression are enabled for eligible responses; compression is not promised for every MIME type/size or already compressed object. Neither policy keys on cookies, arbitrary viewer headers or query strings. The existing CORS origin-request policy is retained; normalized compression negotiation is the deliberate cache variation. Query values remain in the browser URL for client navigation and in E1 slash redirects; excluding them from static origin/cache selection does not clear the URL.

Both cache minima remain zero so explicit origin cache restrictions can work and a one-year minimum cannot prolong missing hashed-asset errors. E1's origin 403/404 mappings retain viewer status 404 and error minimum 10 seconds. Error headers can independently affect CloudFront error duration; verify missing stable and hashed paths after release, not merely successful assets. See [AWS error-cache behavior](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-error-pages-expiration.html). The local policy does not promise Cloudflare's error caching or override its unknown rules.

### Preserve checked HTML through the proxy

The September 12 release check found that S3/CloudFront HTML matched the checked
artifact while Cloudflare added JavaScript Detections and a Web Analytics
beacon. Candidate `.html` objects now append `no-transform` to their existing
cache directives, including `404.html`. Cloudflare documents that this suppresses
[JSD injection](https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/#if-your-origin-sends-a-no-transform-header)
and [automatic Web Analytics injection](https://developers.cloudflare.com/web-analytics/faq/#my-website-is-proxied-through-cloudflare-but-web-analytics-automatic-setup-is-not-working).
This preserves exact public reader bytes and prevents automatic RUM collection
on this static website. The JSD browser signal becomes missing on these HTML
responses; do not claim all bot signals remain unchanged. Browser Integrity
Check, WAF and Bot Fight Mode zone settings remain configured as before. Other
hosts and unrelated media receive no metadata or zone-setting change from this
fix. JS/CSS/images/fonts/PDF keep their prior cache directives; `stats.json`
remains producer-owned.

`no-transform` may cause intermediaries to pass through the origin's existing
content encoding instead of recompressing HTML. Keep the configured compression
policies, but verify actual encoding after release. Require new successful CI
artifacts and their matching publication manifest before refreshing metadata;
do not hand-edit an old manifest to bypass its checks. Republish through the
reviewed uploader, complete approved cache invalidation/purge, then rerun the
unchanged ordinary public reader exact-hash gate on apex and `www`, checking
absence of both injected scripts. Local metadata tests alone do not prove the
public fix or clear already-open tabs/browser caches.

### Candidate ownership and metadata refresh

`scripts/publish_static_site.mjs` builds a version 1 manifest from the downloaded export. It records every frontend-owned key's SHA-256, length, MIME type and class-specific cache control, plus resolved local HTML/CSS static references. It rejects missing/empty required pages, missing referenced hashes, symlinks, unsafe paths and oversized candidates. Bounds are 10,000 directory entries, 64 MiB per file, 256 MiB total bytes, 50,000 static references, 1,024-character ASCII keys and an 8 MiB manifest. These exceed the checked current candidate (54 files / 73 references); a future larger or differently named export needs a reviewed bounds/parser update rather than silently bypassing validation. The parser checks HTML src/href/srcset and CSS url references; the complete `_next/static` tree also carries dynamically loaded chunks. The manifest is a local candidate integrity record, not proof of a remote deployment or exhaustive JavaScript execution.

The workflow saves `checked-site-manifest` as a same-run artifact. Before each publication phase the uploader regenerates and compares the complete manifest, including metadata and bytes, before the first write. Publication uses argument arrays to call `aws s3 cp` for each known key, unconditionally refreshing origin metadata even when bytes match. There is no remote listing, sync deletion, copy of unrelated keys, bucket-wide metadata rewrite or age-based garbage collection. The root `stats.json` key is excluded even if a frontend export accidentally contains a copy; only the producer publishes that key. Existing old hashes and other objects stay in place for open tabs and rollback. Retiring old hashes or stable pages requires a separate explicit, reference-aware removal decision; this uploader never infers deletion from absence in a candidate.

The `recovery` phase uploads all candidate hashes first and 404.html last, before Terraform enables E1's error policy. The `all` phase independently uploads hashes before any stable file, including when run without an earlier recovery phase. Upload failure stops immediately; a partial stable phase is not atomic and must not be accepted as a complete release. The immutable candidate directory must remain unchanged during publication. Keep the reader gate after successful complete publication/invalidation. An omitted or invalid bucket now fails before the uploader starts an AWS subprocess.

Local manifest preparation is read-only with respect to cloud resources:

```sh
node scripts/publish_static_site.mjs manifest --artifact-dir out --manifest candidate-manifest.json
node --test scripts/tests/static-publication.test.mjs
.venv-stats/bin/python -m unittest discover -s tests/stats -p test_cache_metadata.py -v
```

The workflow's `upload` subcommand is a release action and was tested only through a local fake AWS executable. Both `--phase recovery` and `--phase all` require the checked manifest, candidate directory and explicit bucket. No production upload was performed. Lambda's only E4 behavior change is the stats cache header; existing aggregation, accepted Cloudflare checkpoint, active guard, durable proofs, concurrency and exact three-module archive membership remain unchanged. The recorded D4 archive from `99b0a4e` is historical; use the checked E5 manifest/archive identity for a future release.

### Before accepting freshness in production

The existing September 8 baseline used two ordinary unauthenticated GETs per object at 07:12:53–56 UTC with normal certificate verification and no cache-busting query. HTML lacked Cache-Control/Age and returned Cloudflare DYNAMIC/CloudFront Miss twice. Stats returned max-age=3600 and DYNAMIC/Miss twice. PDF and the actual referenced chunk returned max-age=14400, first Cloudflare MISS then HIT (Age 0); the cached origin X-Cache remained Miss and does not prove a second origin request. Full-body times 0.18–0.704 seconds are a small sample, not field performance evidence or a speedup claim. E4 reused `evidence/delivery-cache-before.json`; it performed no new public measurements.

Before activation, inspect Cloudflare SSL/proxy settings plus applicable browser/edge cache rules and Browser Cache TTL, including Respect Existing Headers behavior. Prepare any needed coordinated account changes for approval. Save previous known-key metadata/cache settings with the checked manifest and final state-backed plan. Expected E4 plan scope is two new cache policies and in-place default/hashed behavior changes, including compression; no bucket/distribution replacement, origin/permission changes, retention changes or viewer-policy tightening.

After approved upload/apply and compatible-reader-first producer rollout, verify repeat ordinary requests for HTML, PDF, actual candidate hashes and separately published stats on both hosts. Confirm content/MIME, browser/shared directives, available Age/cache-status headers and negotiated compression where eligible; test missing normal/hash paths and query-bearing client navigation too. Stats retains its previous metadata until an approved successful producer publication replaces it: frontend deployment must not rewrite it to fake completion. Verify an approved controlled website/PDF update and a real stats refresh become visible under the coordinated cache/invalidation policy before closing F28. Do not fabricate stats values or add tracking traffic to perform this check.

Record before/after candidate identity, observation times, exact headers, account settings, invalidation/purge completion and stale-response limits. The existing workflow requests CloudFront invalidation; successful submission alone is not global completion, and D4's reader proof may intentionally stop while propagation or Cloudflare caching retains old HTML. Approved Cloudflare purge may also be needed. Purges cannot clear existing browser caches or replace already-open tabs; old metadata such as max-age=14400 can persist for those clients until its original lifetime ends. No 60/300-second end-to-end guarantee, speedup, public freshness closure or controlled update has been demonstrated by these local tests.

# Production release verification — September 12, 2026

**Status: contact repair and website publication verified; new analytics migration and remaining infrastructure apply blocked pending approval.** The previous analytics code and original daily schedule were restored at 09:20:27 UTC. The new producer never ran and wrote no data. The website remains available.

## Scope and checked release

This work addresses the two deployment blockers: the contact service's health/browser access configuration and a recoverable transition to the new analytics processor. The owner authorized both repairs and requested a same-session stop, test and restart. Hosting is S3 through CloudFront and Cloudflare; there is no Vercel preview. [PR5](https://github.com/manwithaplandy/andrewmalvani.com/pull/5) remains open.

The published website and installed contact package are the exact artifacts from source `e2f891a5f189bc9ead9cefa0491d2e7cb9eaa2b3`, verified by [GitHub run34679848934](https://github.com/manwithaplandy/andrewmalvani.com/actions/runs/34679848934). That run passed all 100 browser journeys, 23 release/publication tests, 14 isolated contact tests, backend archive tests and native Terraform contract checks. The backend log includes 63 outer tests and 49 nested tests; these are not additive independent totals.

All 54 published website files were read back from S3 and matched their checked bytes, content types and cache settings. Older hashed assets were retained; the website publisher did not alter statistics. [Artifact identities](evidence/2026-09-12-production-release/final-checked-artifact-identity.json) record package and manifest hashes.

## Contact service: verified

The health endpoint now returns 200. Both the main and www website origins receive their exact browser-access grant on preflight and invalid-message responses, with origin-dependent caching marked correctly. An unapproved origin receives 403 and no browser grant. All seven live checks passed; none could send a contact notification. [API evidence](evidence/2026-09-12-production-release/api-verification.json).

The migration preserved the existing API, named stage, function and notification destination. Independent review caught an unsafe proposed replacement of the existing preflight integration. Preparing that integration in place and applying an exact reviewed API-only plan avoided deleting it. The isolated apply preserved the analytics pause. A subsequent plan identified one harmless extra API snapshot replacement caused by the provider normalizing empty maps; the API convergence is still part of the unapplied infrastructure plan. No further API snapshot change has been applied.

**Still distinct from these checks:** confirming delivery of a real contact message to the owner's inbox. Health and validation cannot prove email receipt.

## Analytics recovery boundary: verified

The daily schedule was disabled at 05:50:38 UTC and execution blocked at 05:56:42 UTC. The shorter handover used actual successful daily delivery and clean retry/error evidence, then waited beyond the last admission's maximum event age and the running-function timeout with observation margins. The most recent pre-install check at 08:07 UTC still found the expected controls and no contrary activity.

A native DynamoDB backup became AVAILABLE. The full stopped snapshot contained 59,808 records, including 58,780 legacy markers; all historical record families and expiry values were preserved. Total, daily, page and published request counts agreed at 58,040. Repeated full strongly consistent scans and a 07:59 UTC recheck matched the same snapshot and published data exactly.

Sixteen recovery files, including the snapshot, old code and checked packages, were uploaded to a private encrypted versioned prefix and each version was read back and hashed. The manifest was verified again before installation. Versioning protects recovery history but is not immutable object lock.

- Native backup: `arn:aws:dynamodb:us-west-1:870140981796:table/mostly-upward-lion-data-table/backup/01789193449837-1bb2eb00`.
- Recovery manifest: `s3://terraform-backend-bucket-blindly-joint-moth/analytics-release-backups/20260912-analytics-handover/manifest.json`.
- Manifest version: `0rh9OEZoJqB3SQyeC4ZsPm019PbUg_3C`.
- Snapshot SHA256: `757c4951dbf4c22965271e2caefefa0a3cbbe95699fc1b281b63ec0f2e8da6ce`.
- Manifest SHA256: `4c7337ac6618a5dd79596ce0e2e0a1688b4ae13cb7c033e7f03e8eea9cbda053`.

The timing decision is an account-specific inference supported by delivery, execution and data evidence. It is not a service guarantee that an invisible queue is empty. Historical totals are preserved rather than retrospectively certified or recounted. Old code must not be restored over new processing records.

## Delivery corrections and tradeoffs

Cloudflare was injecting measurement and browser-detection scripts into otherwise exact website HTML. Checked HTML now carries `no-transform`, which preserves its identity through the proxies and prevents those injections. This loses the injected RUM measurements and JSD browser signal on these pages and may reduce intermediary HTML transformations. Existing strict origin TLS, HTTPS redirect, browser-integrity and Bot Fight Mode settings remain enabled. The directive applies only to HTML; other assets retain their intended caching. [Cloudflare JSD documentation](https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/#if-your-origin-sends-a-no-transform-header).

An exact-host Cloudflare cache rule makes the main and www website respect origin browser lifetimes; other hosts and security settings are unaffected. Each cache purge targeted this website's URLs.

Browser verification also exposed optional prefetch responses being misclassified as required-file failures. Cloudflare documents 503 for unsuccessful speculative prefetches. The corrected verifier excludes only proven speculative requests from asset accounting; those requests cannot satisfy the required-script checks. Required script/style failures, missing scripts and changed bytes still block release. No browser identity or protection setting was changed to pass that check. [Cloudflare prefetch behavior](https://developers.cloudflare.com/speed/optimization/content/speed-brain/).

## Live browser checks: verified within the deployed scope

At 11:04 UTC, ordinary browsers on both hosts passed the homepage, contact client validation, readable real preflight/invalid-POST responses, mobile width, direct graph route and fragment, graph search, and statistics display. No page exceptions or CSP violations were recorded. The public statistics digest still matched the original recovery payload. The public reader independently passed exact HTML/required-asset checks and both data contracts before installation. [Browser evidence](evidence/2026-09-12-production-release/public-partial-release-verification.json).

The verifier-only correction is source `53a6749c8b326ec4387eb4d66e57618ea92c2895`, independently reviewed with 15 affected tests and [successful CI34682485958](https://github.com/manwithaplandy/andrewmalvani.com/actions/runs/34682485958). It validates the existing e2f891a deployment; it does not imply another frontend publication. The later quota/pre-write recovery change is documentation only.

## Unfinished items, ranked by impact

1. **Release blocker — analytics cannot enforce its required single-execution limit.** The region allows only 10 concurrent Lambda executions, all in the unreserved pool. AWS rejected reserving one for analytics. Its quota service rejected a request for 101 because requests must exceed its standard default of 1,000. A proposed request for 1,001 was stopped by automatic approval review because it expands concurrency across the account; it was not submitted and no support case was opened. The owner has a pending approval question. A quota itself is not paid provisioned capacity, but a larger limit permits more simultaneous executions across functions. Approval would authorize a request, not guarantee AWS grants it.

   The quota should have been checked before pausing. The runbook now requires regional capacity and current reservation checks before starting a handover; a Terraform plan or passing local tests cannot establish this prerequisite. The new package was installed at concurrency zero, but the failed allocation left execution blocked. It never ran. Multiple full scans and public-object identity checks proved that no new records or payload writes occurred, so independent review approved restoring the exact previous code while still blocked, then restoring the original unreserved setting and enabling the original schedule. This completed at 09:20:27 UTC. [Restoration evidence](evidence/2026-09-12-production-release/restore-previous.json).

   The new producer's controlled run, repeat/no-duplicate verification, version2 publication and scheduled acceptance remain unperformed. A later attempt needs fresh admission, quota, recovery and reader gates; the old capture must not be assumed current after scheduled processing resumes. The next original daily run is due at 00:00 UTC September13 (5pm September12 in Arizona). No daily tick occurred during the pause; enabling the schedule is not proof of that future run.

2. **Important — production cache/routing/logging reconciliation still needs authorization.** Automatic approval review rejected the reviewed website/API-only plan because it requires more specific authorization for the persistent CloudFront/API changes and removal of the log bucket's recursive self-logging relationship. The exact scope is two cache policies, the existing distribution and routing function, one configuration-equivalent API deployment/stage update, and disabling that recursive relationship. Existing website/CloudFront access logging and stored data would remain intact. The owner has a separate pending approval question. No part of that rejected apply ran.

   The practical visible gap is confirmed: missing URLs currently return 403 on both public hosts rather than the intended 404 recovery page. Final cache-policy attachment, routing/error recovery and log cleanup are therefore not accepted. The checked S3 metadata and scoped Cloudflare browser-cache rule are already in place; they do not prove the remaining infrastructure changes were applied. [Exact reviewed scope](evidence/2026-09-12-production-release/website-only-plan-review.md).

3. **Verification boundary — real email delivery and the next daily run are unobserved.** All contact tests deliberately stopped before notification delivery. The owner can send one real contact message to confirm inbox receipt. The next scheduled analytics execution must be observed separately; no future observation or automatic follow-up has been scheduled.

A fresh complete state-backed plan after restoration confirms exactly nine remaining changes and no unrelated replacements. It is evidence of the remaining work, not approval to apply: it would allocate concurrency to the restored old code and does not install the new package. [Remaining-plan review](evidence/2026-09-12-production-release/finalremaining-plan-review.md).

The overall release is not fully accepted or ready for an unattended production deployment. The existing service is restored, completed repairs are verified, and remaining mutations are held for the pending approvals.

The local review server was restarted at http://127.0.0.1:3100/__review using its original checked preview and synthetic statistics, with external contact requests still blocked. It is separate from production.

Private state, environment values, raw logs and table rows are excluded from this repository and the website. Independent operational reviews and selected nonsecret evidence are retained under [release evidence](evidence/2026-09-12-production-release/).

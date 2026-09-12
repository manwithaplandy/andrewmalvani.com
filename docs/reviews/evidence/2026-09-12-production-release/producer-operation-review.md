# Producer operation helper review

**Decision: Approved following the scoped correction recorded below.** No execution-blocking bug was found in `verify_analytics_after.py` from the bounded source review. This is a review of private operational helpers, not a new review of the checked producer.

## Initial findings — both addressed by the correction below

1. **Incomplete work is reported with a success exit.** `operate_analytics.py:58–61` checks FunctionError and transport StatusCode, but not the handler outcome. The exact checked handler returns `{truncated: true}` for a budget-limited incomplete pass (`lambda_function.py:423–427` inside the verified archive). That result reaches exit 0 even though publication was deliberately withheld. Classify incomplete work explicitly, preserve the invocation receipt, and keep completion/repeat/resume acceptance blocked until a full handler outcome and subsequent verification succeed. A non-error Lambda transport response alone is insufficient. Do not silently repeat an uncertain request; the existing per-label started receipt is useful and must remain.

2. **Resume prerequisites must fail before reopening admission.** `operate_analytics.py:68` enables the rule before lines 69–70 validate its expected schedule and sole target. Read and validate those identities before enable, then retain the post-enable readback. The public gate at lines 66–67 also accepts an empty results list, wrong origins, or another candidate because it uses only `all(...)`. Require the exact checked candidate and both apex/www results with v2 live payload and live/v1/v2 contracts before enabling. The first/ repeat verification PASS receipts remain necessary.

## Verified strengths

- `operate_analytics.py:14–40` checks account/resource identities, settled configuration, rule disabled and concurrency zero, exact ZIP digest/size, revision-guarded code installation, unchanged configuration and continued stop. Opening concurrency requires the new code, an install receipt and the disabled rule. No Terraform is run in the stopped interval.
- `operate_analytics.py:49–57` records invocation start before the synchronous request, disables SDK retries for it and refuses reuse of an ambiguous label. FunctionError payloads remain private. These safeguards reduce accidental duplicate operational attempts.
- `verify_analytics_after.py:104–125` verifies the exact checked ZIP and imports its parser/ledger/renderer with fake clients. It never calls the handler. I inspected the referenced functions in the exact archive to confirm the call signatures and incomplete outcome.
- `verify_analytics_after.py:191–263` preserves baseline records, detects new legacy markers, validates completion/chunk records, reconstructs newly completed inputs with the checked parser and proves every counter delta from previously unapplied chunks. Legacy recounting and unexplained increments fail. This is meaningful no-duplicate evidence, including when new logs arrive between controlled runs.
- `verify_analytics_after.py:266–305` checks the public schema/date/window, source coverage and accepted Cloudflare projection, independently renders the expected origin payload, and requires unchanged full strong-scan snapshots, origin version/bytes and runtime identity across verification. A TTL-eligible legacy disappearance produces REVIEW_REQUIRED rather than silently passing. Public CDN/browser verification remains separate.

## Necessary controller observations and limits

The helpers enforce a three-minute elapsed interval after opening; they do not themselves prove there were no async invocations during it. Preserve the controller's actual quiet-window/invoker-hold evidence and stop on contrary activity. The sampled backup receipt is AVAILABLE with equal manifest/readback digests; full record coverage and durable versions were supplied by the controller and were not revalidated against cloud here. Require the successful exact candidate public-reader receipt before install and the actual v2 public-reader receipt after origin verification. Use the verified snapshots/receipts for the first and repeated completed invocations, retain raw evidence privately, and keep next scheduled completion explicitly pending until observed.

No helper execution, Lambda invocation, cloud mutation, raw log/table-row/environment output, application edit or subagent was performed. Only the two scripts, selected backup status/digests and relevant checked-archive functions were read. Controller owns all production operations and the separate real-plan gate.

## Scoped correction review

**Both findings ADDRESSED; no new blocker found in the correction.** `operate_analytics.py:61` now requires the actual handler's `truncated` field to be exactly false, after preserving the full invocation result. Incomplete, missing or malformed completion outcomes cannot reach success. Started receipts still prohibit silent reuse of an uncertain attempt.

`operate_analytics.py:68–72` now validates the after-reader candidate against the already fixed before-reader candidate, requires exactly two results covering apex and www with v2/live/v1/v2 contracts, and checks the disabled rule's exact cron plus sole unqualified Lambda target before enabling admission. Lines 74–75 retain post-enable validation.

**Operational helper approval:** install/open/invoke/repeat/resume may use the corrected helper only within the controller's existing no-writer, backup, exact-artifact, quiet-observation and public-reader gates. The separate read-only verifier assessment is unchanged. No helper was executed and no cloud call or mutation was performed in this re-review. The forthcoming optional-prefetch verifier correction has not been reviewed by this approval.

Reviewed helper SHA-256: `1ec9bd7a3a84e93f1c18fc03a7787a2d7718b23518850249e982734c4539346c`. Scoped review recorded 2026-09-12T08:02:18.929199+00:00.

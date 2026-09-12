# Final remaining Terraform plan review

**Verdict:** The refreshed plan is technically complete and contains exactly the nine expected remaining changed addresses, but the release remains **blocked and incomplete**. Do not apply this saved plan: the restored analytics Lambda still has the old pre-ledger code, while the plan changes it from unreserved concurrency to reserved concurrency `1` without installing the checked new package.

## Plan identity

- Generated read-only at `2026-09-12T13:39:12Z` with Terraform `1.14.7` after the controller restored the previous analytics service.
- Terraform reports `applyable=true`, `complete=true`, `errored=false`, and no deferred changes. `applyable` is Terraform's mechanical result; it is not release approval.
- Private binary: `private/finalremaining.tfplan`, SHA-256 `49e0020f10b3812ecfb9d64555786ea70ff12311ab1ee657f84172486d99ffc7`.
- Private JSON: `private/finalremaining-plan.json`, SHA-256 `7cafb99804864b1c0b1c42754891654f32f1ce6fc6c5500d472216acfa1d9482`.
- Private log: `private/finalremaining-plan.log`, SHA-256 `1f32c14c66c3d46cccfc9b3125b7663f85a6fd070cb7487991049a1af8f26617`.
- Sanitized summary: `finalremaining-plan-admission.json`.
- The private candidate's ten tracked Terraform/lock/function files remain byte-equal to tracked HEAD `e2f891a5f189bc9ead9cefa0491d2e7cb9eaa2b3`.

## Exact nine-address remainder

1. `aws_api_gateway_deployment.api`: create-then-delete immutable convergence replacement.
2. `aws_api_gateway_stage.api`: in-place pointer update to that deployment.
3. `aws_cloudfront_cache_policy.site["immutable"]`: create.
4. `aws_cloudfront_cache_policy.site["stable"]`: create.
5. `aws_cloudfront_distribution.website_distribution`: in-place reviewed cache/compression/404 behavior update.
6. `aws_cloudfront_function.rewrite_extensionless`: in-place reviewed code/comment update.
7. `aws_cloudwatch_metric_alarm.stats_aggregator_errors`: description-only update.
8. `aws_lambda_function.stats_aggregator`: in-place concurrency change from unreserved `-1` to reserved `1` only.
9. `aws_s3_bucket_logging.log_bucket_logs`: delete only the recursive self-logging relationship.

Plan summary is `3 to add, 5 to change, 2 to destroy`. The adds are the two cache policies and replacement API deployment. The destroys are only the superseded immutable API deployment and recursive self-logging relationship. No persistent bucket, data, table, distribution, function, Lambda, stage, API, IAM, schedule, target, permission, or alarm identity is replaced or deleted.

## Restored analytics boundary

- The plan refresh sees `statsAggregator` running the restored old code digest `e3f30b13d0335aa5d898d2c21f71ef9153d769f96e07510e9be137f2254eee51`, with original unreserved concurrency.
- The stats Lambda's planned `source_code_hash` remains that same old digest. Terraform intentionally has no checked-code installation action; its only Lambda field change is reserved concurrency `-1` to `1`.
- The daily rule is `ENABLED`/`is_enabled=true` and plans no change. The event target and EventBridge invocation permission are no-op. The controller's restoration receipt separately records the sole unqualified target, unchanged full baseline, and no new producer/ledger writes.
- Applying this plan would therefore reserve scarce concurrency for the old producer, not activate the reviewed new package. That violates the intended handover sequence and is not authorized.

The new reader remains compatible with the restored v1 producer. The failed RC1 attempt did not invoke the new package or write ledger records, so the controller's old-code fallback remains coherent; this plan does not change that conclusion.

## Other scope checks

- API resources other than the already admitted deployment/stage convergence are no-op, including the contact Lambda and invocation permission. The trigger remains the bounded `1b44eff...` to stable `9f66d73...` normalization described in `paused-full-plan-review.md`; the first complete plan after any eventual apply must show both API addresses no-op.
- The CloudFront distribution update preserves distribution ID, aliases, origins/OAC, logging destination/prefix, certificate, and response-headers policy. The function, alarm, and stats Lambda updates are in place with their identities preserved.
- The website and log buckets, both versioning controls, and log lifecycle are no-op. Only the self-logging relationship is removed; website and CloudFront log delivery remain configured.
- There are no unexpected resource replacements or deletions.

## Remaining decision and next evidence

The desired new analytics producer cannot be reopened under the reviewed reserved-concurrency design until the account concurrency quota permits a reservation and the checked package is installed through the guarded sequence. The attempted quota request was rejected by automatic approval review before AWS submission; no quota request or cloud mutation resulted from that attempt.

No remaining infrastructure apply has user approval. Preserve this plan as time-bounded read-only evidence. If the user later authorizes infrastructure work or the quota path becomes available, refresh state and create a new complete plan before applying anything. After any eventual apply, require a complete no-op reconciliation for API convergence and run the prepared read-only infrastructure validator against the final expected state.

This review made one refresh-inclusive plan and local plan rendering. It performed no apply, invocation, concurrency/schedule change, upload, contact send, quota request, or other cloud mutation.

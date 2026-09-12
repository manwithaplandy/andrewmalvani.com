# Website/API-only Terraform plan review

**Verdict:** APPROVED for application of the exact saved targeted plan while analytics remains fenced at reserved concurrency `0` and rule `DISABLED`. The plan contains no analytics Lambda, event, producer IAM, table, alarm, permission, or storage action. It is an exceptional partial apply and does not replace the required final complete reconciliation plan.

## Identity

- Refreshed plan timestamp: `2026-09-12T08:26:45Z`; Terraform `1.14.7`.
- Exact private binary: `private/website-only.tfplan`, SHA-256 `6781bf0245f5e046f1057606dc4e70feeeded009cade8b967340eddecb9dd492`.
- Private JSON and log: `private/website-only-plan.json` and `private/website-only-plan.log`.
- Sanitized action record: `website-only-plan-admission.json`.
- Terraform reports `applyable=true`, `errored=false`, no deferred changes, and `complete=false` because explicit targets were used.
- The private candidate's tracked Terraform source and lock are byte-equal to HEAD `e2f891a5f189bc9ead9cefa0491d2e7cb9eaa2b3`; its two Lambda archives match checked CI. This plan contains no Lambda action and therefore cannot install either archive.

## Exact action set

1. Create `aws_cloudfront_cache_policy.site["immutable"]`.
2. Create `aws_cloudfront_cache_policy.site["stable"]`.
3. Update `aws_cloudfront_distribution.website_distribution` in place for the reviewed cache behaviors/compression and 403/404 recovery mappings. Distribution ID, aliases, origins/OAC, logging destination/prefix, certificate, response headers, and viewer policy remain unchanged.
4. Update `aws_cloudfront_function.rewrite_extensionless` in place for the reviewed published code/comment. Identity and runtime remain unchanged.
5. Replace immutable `aws_api_gateway_deployment.api` create-before-destroy and update `aws_api_gateway_stage.api` in place to that new snapshot.
6. Delete only `aws_s3_bucket_logging.log_bucket_logs`, the recursive self-logging relationship.

The plan summary is `3 to add, 3 to change, 2 to destroy`: the adds are two cache policies and the replacement API deployment; the destroys are the superseded immutable API deployment and self-logging relationship. No bucket, object, table, distribution, function, API, API stage, Lambda, IAM identity, target, permission, or stored data is replaced or deleted.

The API actions are the already admitted one-time convergence from trigger `1b44eff...` to stable trigger `9f66d73...`. All API methods, integrations, responses, resources, method settings, contact Lambda, and API Lambda permission are no-op. The only normalized inputs were the newly created OPTIONS integration response's empty maps; those are now stable and every fingerprint input is equal before/after. The first complete plan after apply must show the API deployment and stage as no-op.

Deleting the self-logging relationship does not change the log bucket, its versioning/lifecycle/policy, website access-log delivery, or the CloudFront distribution's `cloudfront-logs/` destination. The distribution's logging block compares equal before/after.

## Apply conditions

1. Recheck the exact `website-only.tfplan` SHA-256 above immediately before applying the saved binary. Do not replan or apply the working directory under this approval.
2. Confirm immediately before and after apply that `stats-aggregator-daily` remains `DISABLED`, `statsAggregator` remains at reserved concurrency `0`, and its checked new code digest is unchanged. Stop on any discrepancy.
3. After apply, verify the API stage moved to the new deployment, health/CORS invalid-input checks remain non-sending, CloudFront reaches `Deployed`, both cache policies are attached to the intended behaviors, 403/404 recovery is exact, the edge function is published/associated, log-bucket self-logging is absent, and website/CloudFront log destinations remain intact.
4. Generate a fresh complete state-backed plan before any analytics reopening or later full apply. The targeted-plan warning means unrelated configuration was deliberately not reconciled.

This review generated and inspected a read-only targeted plan. It performed no apply, function invocation, schedule/concurrency change, upload, contact send, or other cloud mutation.

# Approved infrastructure plan review — 2026-09-12

## Verdict

**APPROVE the exact saved targeted plan only.** The fresh state-backed targeted plan contains exactly the seven approved resource changes and no analytics, event, DynamoDB, producer-IAM, or stats Lambda action. The fresh complete plan is evidence only and must not be applied because it also proposes the excluded analytics concurrency and alarm-description changes.

## Identity and private artifacts

- Source HEAD: `d86538525c6c5f420a010bc182b7b041f93857fd`; worktree clean at planning time.
- All ten candidate Terraform/lock/function files byte-match tracked HEAD.
- Candidate Lambda archives byte-match checked CI run `34679848934`: contact `4031b6f438e55a6547db3ea390b4292328652e67212a78865d617ffe0a515902`, stats `b68c47a7774b1d575b910a60d7ceded54cf9d2b9a398334f00476113cbc945ca`.
- Full plan: `/private/tmp/react-resume-release-20260911/private/approved-infra-20260912-full.tfplan`, SHA-256 `3bcd114f06ab1587faff69d4476b04587ebed5ceb01606ca40adf88052c06a16`, created `2026-09-12T15:48:32Z` with Terraform `1.14.7`.
- Approved targeted plan: `/private/tmp/react-resume-release-20260911/private/approved-infra-20260912-targeted.tfplan`, SHA-256 `b0db3c653d0be847b01a17d45cfe8baa5c6fd0e3a58099b5992beb5bd424eaf2`, created `2026-09-12T15:50:02Z` with Terraform `1.14.7`.
- The plan binaries, rendered JSON, logs, and private variables are mode `0600`; Terraform data is contained beneath the mode `0700` private tree, with provider executables retaining required execute bits. This report and `/private/tmp/react-resume-release-20260911/approved-infra-20260912-admission.json` contain selected nonsecret facts only.

## Exact targeted changes

1. `aws_api_gateway_deployment.api`: create before delete; trigger converges `1b44eff443c5dabf8b7b6a3e9edd52f9c1aeed46` → `9f66d73ce4fda7484a3e86cce61a5224351c30c7`.
2. `aws_api_gateway_stage.api`: update only `deployment_id`; stage name and REST API identity remain unchanged.
3. `aws_cloudfront_cache_policy.site["immutable"]`: create with min `0`, default/max `31536000`, gzip and Brotli enabled.
4. `aws_cloudfront_cache_policy.site["stable"]`: create with min `0`, default/max `300`, gzip and Brotli enabled.
5. `aws_cloudfront_distribution.website_distribution`: update only custom errors and cache behaviors. Aliases, origins, logging destination, certificate, and distribution identity are preserved. Origin 403/404 map to `/404.html` with response 404 and minimum error TTL `10`; `_next/static/*` uses the immutable policy; default behavior uses the stable policy; compression is enabled.
6. `aws_cloudfront_function.rewrite_extensionless`: update code/comment only; existing function identity, runtime, and publish setting remain. The planned canonical redirect uses status `308`.
7. `aws_s3_bucket_logging.log_bucket_logs`: delete only the recursive self-logging relationship. The log bucket, lifecycle/versioning, CloudFront logs, and website access-log destination have no action.

The targeted plan reports `complete=false`, which is expected for Terraform targeting. It is deliberately an approved partial plan and still requires a fresh complete post-apply reconciliation.

## Excluded complete-plan changes

The fresh complete plan has the same seven changes plus:

- `aws_lambda_function.stats_aggregator`: reserved concurrency `-1` (unreserved) → `1`.
- `aws_cloudwatch_metric_alarm.stats_aggregator_errors`: `alarm_description` update.

The daily schedule is `ENABLED → ENABLED` with `no-op`, and its sole target is `no-op`. The targeted plan contains no analytics action, so applying that saved binary keeps the restored old stats package, unreserved concurrency, and enabled daily schedule unchanged. Do not apply the full plan `/private/tmp/react-resume-release-20260911/private/approved-infra-20260912-full.tfplan`.

## Apply the reviewed binary

From `/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation`, first verify the exact artifact:

```sh
shasum -a 256 /private/tmp/react-resume-release-20260911/private/approved-infra-20260912-targeted.tfplan
```

The output must be exactly:

```text
b0db3c653d0be847b01a17d45cfe8baa5c6fd0e3a58099b5992beb5bd424eaf2  /private/tmp/react-resume-release-20260911/private/approved-infra-20260912-targeted.tfplan
```

Then apply that saved binary without replanning or adding targets:

```sh
TF_DATA_DIR=/private/tmp/react-resume-release-20260911/private/tf-data terraform -chdir=/private/tmp/react-resume-release-20260911/private/candidate-plan/terraform apply -input=false -no-color /private/tmp/react-resume-release-20260911/private/approved-infra-20260912-targeted.tfplan
```

No `AWS_PROFILE`, `AWS_REGION`, or `AWS_DEFAULT_REGION` override was present when the plan was created. The checked configuration uses `us-west-1` for the backend/default provider and `us-east-1` for its aliased certificate provider. Retain the existing authenticated account guard and verify the old producer identity/unreserved concurrency/enabled schedule immediately before apply.

## Risks and required follow-up

- CloudFront distribution updates propagate asynchronously; transient `InProgress` is expected. Validate the distribution reaches `Deployed`, then verify the approved cache, compression, redirect, and 404 behavior.
- API Gateway creates one immutable deployment and switches the existing stage. This is the reviewed normalization convergence from null response maps to canonical empty maps; a complete post-apply plan must show both API deployment and stage as no-op.
- Targeted plans intentionally omit unrelated drift. Run a fresh complete read-only plan after apply and confirm the seven changes converged while the two excluded analytics differences remain the only intended outstanding changes.
- The saved plan is tied to the refreshed state at `2026-09-12T15:50:02Z`. If any governed resource changes before apply, discard it and repeat review rather than applying a stale artifact.

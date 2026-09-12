# API cleanup saved-plan review — 2026-09-12

## Verdict

**APPROVE the exact saved API cleanup plan only.** Its sole action is deletion of the deposed, superseded API Gateway deployment `11hxml`. The current deployment `xpyhk9` and the existing `api` stage are both no-op. There are no analytics, CloudFront, S3, Lambda, event, DynamoDB, IAM, or quota changes.

## Evidence

- Fresh saved plan: `/private/tmp/react-resume-release-20260911/private/approved-infra-20260912-api-cleanup.tfplan`
- Plan SHA-256: `7166117432fade1858e1deeef8d266475609a1fac95aa15ff98fcbf108e40c98`
- Rendered private JSON SHA-256: `55abb5708131cc22deacb53f8b2821ed32996606ae4d5b2ab28b063f738d19c0`
- Created `2026-09-12T15:59:30Z` with Terraform `1.14.7`; `complete=false`, `applyable=true`, `errored=false`, as expected for a targeted cleanup.
- Read-only API Gateway stage check at `2026-09-12T15:59:08Z`: the sole stage `api` references current deployment `xpyhk9`; no stage references old deployment `11hxml`. Sanitized evidence: `/private/tmp/react-resume-release-20260911/approved-infra-20260912-api-stage-reference-check.json`.

## Exact action boundary

- `aws_api_gateway_deployment.api` deposed instance `8f884593`: `delete` old deployment `11hxml`.
- Current `aws_api_gateway_deployment.api` (`xpyhk9`): no-op.
- `aws_api_gateway_stage.api` (`api` → `xpyhk9`): no-op.
- Every other planned resource: no-op; excluded-scope changed-address count is zero.

The first targeted apply omitted its planned create-before-destroy cleanup, leaving the predecessor deposed in Terraform state. This plan performs the already approved delete without changing the current deployment or stage.

## Apply the reviewed binary

Verify the exact artifact:

```sh
shasum -a 256 /private/tmp/react-resume-release-20260911/private/approved-infra-20260912-api-cleanup.tfplan
```

Expected:

```text
7166117432fade1858e1deeef8d266475609a1fac95aa15ff98fcbf108e40c98  /private/tmp/react-resume-release-20260911/private/approved-infra-20260912-api-cleanup.tfplan
```

Then apply only the saved binary:

```sh
TF_DATA_DIR=/private/tmp/react-resume-release-20260911/private/tf-data terraform -chdir=/private/tmp/react-resume-release-20260911/private/candidate-plan/terraform apply -input=false -no-color /private/tmp/react-resume-release-20260911/private/approved-infra-20260912-api-cleanup.tfplan
```

Do not replan or add targets at apply time. Retain the existing account and current-stage guards. After completion, run a fresh complete read-only plan; the required result is exactly the two excluded analytics differences and no API change.

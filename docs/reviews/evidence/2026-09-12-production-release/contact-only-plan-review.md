# Contact-only Terraform plan review

**Verdict:** APPROVED for the isolated contact/API apply of the exact saved plan. This is not approval for a full Terraform apply or for any analytics cutover step.

## Reviewed identity

- Plan timestamp: `2026-09-12T06:24:21Z`; Terraform `1.14.7`.
- Exact binary: `private/contact-only.tfplan`, SHA-256 `e22c3f69b0b58c60e0f9a8bd6d6a1587f8e0f86b4fc3633814b9147b44e116a7`. This matches `contact-only-plan-admission.json`.
- JSON rendering: `private/contact-only-plan.json`, SHA-256 `80603b7ca06eb946671c093d4f4c746c297098fab26d14f372d78adea6af6f2e`.
- Terraform reports `applyable=true`, `errored=false`, no deferred changes, and `complete=false` because this is intentionally a targeted exceptional plan. A fresh full state-backed reconciliation is still required later.

## Action boundary

The plan contains exactly the six admitted changed addresses:

1. `aws_api_gateway_deployment.api`: create then delete replacement only. Replacement is caused by removal of implicit `stage_name` ownership and the corrected deployment fingerprint.
2. `aws_api_gateway_integration.healthcheck`: in-place addition of the explicit JSON MOCK request template with integer status `200`.
3. `aws_api_gateway_integration_response.http_200_options`: create the existing Terraform identity after the controller's in-place `PutIntegration` preparation removed the prior response.
4. `aws_api_gateway_integration_response.post_200`: in-place removal of the obsolete static origin mapping; the Lambda proxy owns response CORS.
5. `aws_api_gateway_stage.api`: in-place move from deployment `0skn0k` to the new immutable deployment; the API and named `api` stage identities are preserved.
6. `aws_lambda_function.form_submission`: in-place environment reconciliation removes only obsolete `ALLOWED_ORIGIN`. The plural allow-list and SNS topic values compare equal before/after. Function name, role, runtime, handler, bootstrap filename, and concurrency remain equal; there is no replacement and no concurrency change.

There are no changed analytics/event-rule, DynamoDB, S3, CloudFront, IAM, Lambda-permission, or SNS resources. The only delete action is the old immutable API deployment after its replacement. No API, stage, or Lambda replacement is planned.

The three refresh-drift entries match the already documented one-time preparation: OPTIONS integration changed in place, its integration response disappeared when that tuple was rewritten, and the Lambda environment was prepared. The resulting planned OPTIONS integration itself is now no-op; there is no unsafe create/delete integration replacement.

## Ordering and safety

- `terraform/contactLambda.tf:85-121` gives the API deployment explicit dependencies on all three integrations, all three integration responses, and the API Gateway Lambda permission. The new deployment therefore waits for the health and response corrections.
- `terraform/contactLambda.tf:119-120` uses `create_before_destroy`; the binary plan records deployment actions as `[create, delete]`.
- `terraform/contactLambda.tf:125-128` keeps the existing explicit stage as sole owner and points it to the new deployment ID. The plan updates that stage in place. Removing `deployment.stage_name` avoids creating a competing stage during deployment replacement.
- The saved plan contains the expected `2 to add, 4 to change, 1 to destroy`: the two adds are the new immutable deployment and recreated OPTIONS integration-response identity; the sole destroy is the superseded deployment.

This ordering is consistent with the reviewed release procedure in `docs/operations/delivery.md:39-45` and `:82-98`. It keeps the old deployed API snapshot active until the explicit stage pointer changes. A failed operation must stop and preserve evidence; it must not be followed by an untargeted apply.

## Apply conditions and remaining gates

1. Recheck the exact `contact-only.tfplan` SHA-256 immediately before apply and apply that saved binary, rather than replanning or applying the working directory.
2. Keep the analytics event rule disabled and stats Lambda concurrency at zero. This plan has no action on either control and does not authorize reopening them.
3. After apply, verify the named stage points to the new deployment, health returns `200`, both allowed origins receive matching OPTIONS and invalid-POST CORS with `Vary: Origin`, and an unknown origin receives no browser grant. These checks must use invalid/preflight requests and send no contact notification.
4. Do not infer SNS/email delivery from health, preflight, or invalid POST. A valid contact send remains separately authorized.
5. Before any analytics producer reopening or broader infrastructure apply, produce and review a fresh complete state-backed plan and repeat the reader/no-writer/backup gates. The targeted plan's `complete=false` warning is a real scope limitation, not a defect in this exceptional API-only apply.

## Evidence limit

This review inspected the saved plan JSON, admission summary, plan log, exact source dependencies/lifecycle, and existing reviewed release instructions. It performed no cloud query, apply, invocation, public request, contact send, or test rerun.

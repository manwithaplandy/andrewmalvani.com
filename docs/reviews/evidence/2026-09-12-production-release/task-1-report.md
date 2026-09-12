# Task 1 — contact API boundary and deployment trigger

Status: implementation and local verification complete; independent review and live rollout pending.

Base: `04facf51651a1733a38a6f25a8e466c9cf4deee4` in the existing `codex/design-ux-remediation` worktree. Commit identity is appended after committing. The controller-authored `docs/superpowers/plans/2026-09-11-api-analytics-release.md` is included unchanged. No worker subagents, production requests, cloud reads/writes, contact notifications, pushes, or live deployment occurred.

## Diagnosis and implementation

The current health integration was MOCK without an `application/json` request template establishing `statusCode`; its response mapping alone could not supply that input. It now supplies `jsonencode({ statusCode = 200 })`. Health remains a reachability-only endpoint, independent of Lambda/SNS/delivery.

The REST API `body` was unset. Its deployment hash therefore remained the SHA1 of JSON null (`2be88ca4242c76e8253ac62474851065032d6833`) even when endpoint configuration changed. The trigger now includes both route path parts and full evaluated methods, integrations, method responses, integration responses, plus the exact origin list. This follows the resource-configuration snapshot approach rather than hashing formatting or generating a timestamp. All integrations and their integration responses, and Lambda invocation permission, are explicit dependencies; method responses are also graph dependencies through references. `create_before_destroy` preserves deployment ordering. `aws_api_gateway_stage.api` remains the sole explicit stage owner; the deployment no longer sets `stage_name`. All Terraform resource names and endpoint identities are retained. Local mock creation is not evidence of the real state's stage migration; the controller must reject any real plan replacing stage/API/Lambda.

Terraform now supplies the sole authoritative `ALLOWED_ORIGINS` JSON list containing exactly `https://andrewmalvani.com` and `https://www.andrewmalvani.com`. The existing Lambda handles OPTIONS through an AWS_PROXY integration, with integration invocation method POST. This design was approved by the controller: one handler selects exact Origin values for both preflight and all its POST outcomes, avoiding separate origin-selection VTL. Header lookup is case-insensitive; response dictionaries are fresh per request and always include `Vary: Origin`, allowed headers `Content-Type`, and methods `OPTIONS,POST`. Matching origins get their exact ACAO value. Present unknown/lookalike/empty/null origins get a clean 403 with no ACAO and no SNS work. Missing Origin retains public non-browser compatibility without an ACAO grant. CORS is explicitly not authentication. Missing allow-list configuration grants no browser origins.

OPTIONS exits before parsing the body or publishing. Existing body validation, sanitization, name100/email254/message2000 caps and truncation behavior, SNS destination/subject, clean 400/502 errors, and no contact logging are retained. No new services or production dependencies were introduced. The existing POST and OPTIONS integration-response resource identities are retained without fixed apex mappings; in AWS_PROXY mode the Lambda supplies response headers/body. See the primary [AWS CORS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html). Gateway/WAF errors generated before Lambda are outside this handler's response contract and remain live acceptance concerns, not asserted by isolated tests.

The checked workflow now executes both new contact source/ZIP tests and native Terraform contract tests, preserving every existing gate. Infrastructure tests copy only `*.tf`, the lock, edge-function source, and exact checked archives to a temporary root. They do not copy tfvars, state, private plans, or working backend metadata. They run backend-disabled readonly init, then native mock-provider tests; all AWS provider aliases and other providers are mocked. Synthetic stable computed identities allow meaningful independent-run no-op comparison while actual configured attributes remain under test. Four JSON override mutations change actual method authorization, integration request mapping, method response headers, and integration response template. Evaluated mocked Terraform state supplies the observed fingerprint and dependency graph. Tests use no live SDK/credentials; native provider binaries need local sockets but make no AWS calls. Terraform mock support requires Terraform >=1.7; local version was 1.14.7.

The delivery runbook documents the real stage-plan gate, proxy ownership, non-browser compatibility, no authentication claim, health/delivery distinction, both-host live checks and release ordering. Existing workflow order applies configuration before updating existing Lambda code. During that interval the old handler does not understand the new multi-origin environment/OPTIONS behavior; two-host acceptance must wait for both configuration and checked code. This is recorded rather than introducing a broader deployment redesign. Analytics gates and publication order remain untouched.

## RED evidence

- `evidence/task1-contact-red.log`: original source and original checked contact ZIP, 14 tests, expected failure (16 errors including subtests), missing `Vary` in static responses. New cases also require exact-origin/error/preflight behavior. This is product RED, not an import failure.
- `evidence/task1-infra-red-provider.jsonl`: actual original Terraform under native mocks fails health mapping, OPTIONS proxy, sole stage ownership, and lacks multi-origin environment. The missing environment key is an evaluated configuration failure.
- `evidence/task1-infra-contract-red.log`, with detailed mock outputs in `evidence/infra-red/`: 2 tests, 5 failures. Configuration assertions fail; all four meaningful mutations retain the original null-body deployment fingerprint. No-op comparison itself passes. This establishes the original deployment bug behaviorally.
- Setup limitations are retained separately: `evidence/task1-infra-init.log` records ordinary cached init failing registry DNS inside the sandbox; `evidence/task1-infra-init-offline.log` records successful readonly init using an explicit filesystem-only provider mirror. `evidence/task1-infra-red.jsonl` is a **setup failure**, not product RED: sandbox provider socket startup failed. The subsequent native mock run outside the sandbox provided real RED. No lock weakening or network fallback was used.

## Final verification

All commands below ran from the worktree. Outputs are preserved under this WS's `evidence/`. Empty output files for successful fmt/actionlint/diff checks are intentional; command exit codes were observed as 0. No unrelated browser/UI build, broad stats backend/recovery suite, live Terraform plan, or production check was repeated.

| Check | Result | Exact retained output |
| --- | --- | --- |
| Contact source and extracted checked ZIP | 14/14 pass | `task1-contact-final.log` |
| Terraform configuration/dependencies and fingerprint mutations/no-op | 2/2 pass, 7 native mock evaluations | `task1-infra-contract-final.log`, `infra-final/{init,configuration,baseline,no-op,method,integration,method-response,integration-response}.log` |
| Selected deterministic packaging, extracted imports, filenames, workflow artifact reuse | 4/4 pass | `task1-packaging-tests.log` |
| Affected release and workflow tests | 12/12 pass, zero skips/failures | `task1-release-tests.log` |
| Exact deterministic archive build and verify | Pass | `task1-package-build.log`, `task1-package-verify.log` |
| Terraform fmt and native test fmt | Pass | `task1-terraform-fmt.log` |
| Final backend-disabled readonly offline init | Pass, exact locked providers | `task1-terraform-init-final.log` |
| Full copied source Terraform validate | Pass | `task1-terraform-validate.log` |
| Changed workflow actionlint 1.7.12 | Pass | `task1-actionlint.log` |
| Preservation/source identity | Pass | `task1-preservation.json`, `task1-source-identity.json` |
| Authored diff whitespace | Pass | `task1-diff-check.log`; final staged check appended below |

Commands:

```sh
.venv-stats/bin/python scripts/package_release_artifacts.py build --output-dir release-artifacts
.venv-stats/bin/python -m unittest discover -s tests/contact -p 'test_*.py' -v
TF_CLI_CONFIG_FILE=/private/tmp/contact-api-tests.tfrc \
  CONTACT_TEST_EVIDENCE_DIR="$PWD/.superpowers/sdd/2026-09-11-api-analytics-release/evidence/infra-final" \
  .venv-stats/bin/python -m unittest discover -s tests/infra -p 'test_contact_api.py' -v
PYTHONPATH=tests/stats .venv-stats/bin/python -m unittest \
  test_packaging.PackagingTests.test_packager_produces_deterministic_bounded_archives_and_manifest \
  test_packaging.PackagingTests.test_checked_archives_have_exact_members_and_importable_handlers \
  test_packaging.PackagingTests.test_terraform_preserves_bootstrap_filenames_without_archive_generators \
  test_packaging.PackagingTests.test_workflow_reuses_checked_archives_without_repackaging -v
PATH="/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH" \
  STATS_TEST_PYTHON="$PWD/.venv-stats/bin/python" \
  node --test scripts/tests/analytics-release.test.mjs scripts/tests/workflow-pipelines.test.mjs
.venv-stats/bin/python scripts/package_release_artifacts.py verify --output-dir release-artifacts
terraform -chdir=terraform fmt -check -no-color
terraform fmt -check tests/infra/contact-api.tftest.hcl
TF_CLI_CONFIG_FILE=/private/tmp/contact-api-tests.tfrc \
  terraform -chdir=/private/tmp/contact-api-tests init -backend=false -input=false -lockfile=readonly -no-color
TF_CLI_CONFIG_FILE=/private/tmp/contact-api-tests.tfrc \
  terraform -chdir=/private/tmp/contact-api-tests validate -no-color
/private/tmp/react-resume-actionlint-1.7.12/actionlint .github/workflows/checks.yml
git diff --check
```

The manual `/private/tmp/contact-api-tests` validation root contains copied current Terraform source, edge function, original lock and checked archives only. The CLI config contains a filesystem-only `provider_installation.filesystem_mirror.path` pointing at the worktree's existing `terraform/.terraform/providers`; no direct installer and no backend initialization. Mirror init labels packages unauthenticated because no registry signing metadata is fetched, while `-lockfile=readonly` verifies the existing recorded package checksums. Provider lock SHA256 remains `2c29fb1306ee38f016d69105c0f1014a60ad60f0cca947e297595d791dfee31d`, byte-equal to base. All used versions/pins are unchanged. The initial sandbox failure logs remain preserved honestly. Native mock `command = apply` only evaluates in-memory fake resources, not the live account.

The first contact GREEN and infra GREEN logs are also retained. Infra final was rerun after tightening test setup to stop immediately on init failure. Contact final was rerun after adding explicit above-limit name/email/message truncation assertions. No repeated unchanged broad suites were used for a newer label.

## Checked artifact/source boundary

- Contact archive: `4031b6f438e55a6547db3ea390b4292328652e67212a78865d617ffe0a515902`, 4687 bytes, sole member `lambda_function.py`; member/source SHA256 `35f04bb485e698a3c4245fe81e04a462e3676517d563b9333d450695aa9afea4`.
- Analytics archive: unchanged `b68c47a7774b1d575b910a60d7ceded54cf9d2b9a398334f00476113cbc945ca`, 40351 bytes, exact `lambda_function.py`, `ledger.py`, `payload.py` members. Producer/checkpoint/ledger source, analytics Terraform, provider lock, packager and deployment workflow are byte-equal to base as recorded in preservation JSON. Frontend was not changed or rebuilt.
- The contact matrix executes both loose source and extracted **checked** archive. Boto3 is replaced before module import, environment cleared to dummy credentials/metadata-disabled settings, and every SNS call goes to an in-memory fake. The archive is generated by the existing deterministic packager and verified against source; temporary fresh builds match bytes and manifest.
- The source identity JSON inventories SHA256 of all Task 1 authored files and the included controller plan. The final commit supplies Git identity; no production artifact digest or new Linux CI execution is asserted by these local results.

## Self-review and remaining boundary

Self-reviewed source/test/workflow/docs diffs: no changes to validation/sanitization/SNS payload, analytics source/package/gates, UI/content, origin/distribution/bucket/table identities, provider versions/hashes, resource names, or main release workflow. No new static wildcard CORS or secret is present. The exact-origin policy applies consistently to all handler-generated outcomes; OPTIONS and invalid inputs cannot publish. Deployment configuration mutations are observed through actual Terraform evaluation rather than whitespace matching. No source state/private inputs are copied into tests or evidence. All requested new checks are added to CI without removing existing checks.

Independent task review is still required. Controller-owned remaining evidence: real state-backed plan and stage preservation classification, approved coordinated code/config rollout, active API deployment ID, live health, actual OPTIONS/invalid POST and browser acceptance on both public hosts, upstream Cloudflare behavior, and any separately authorized synthetic notification/delivery observation. The worktree tests do not prove API Gateway service-side update behavior, queue/delivery behavior or actual recipient delivery. The health endpoint must never be used as such proof. No material unresolved local design ambiguity remains; retained integration-response identities and rollout interval are explicit review points.

Final local commit: `cf8410c12d42179222371e26590dcb531d208f5e` — `fix: repair contact API health and origin handling`.

Final staged whitespace check passed (empty `evidence/task1-staged-diff-check.log`). Commit contains exactly the 9 authorized Task 1 paths including the controller plan. Post-commit `git status --short` is empty; ignored WS report/evidence remain available for independent review. No code changed after the final applicable checks and recorded source identity. No push or production action was taken.

## Independently reviewed release-transition documentation fix

After `cf8410c`, controller real-plan inspection and independent review identified two live-transition gaps that source/native mock tests did not establish: current live configuration has only singular `ALLOWED_ORIGIN`, and locked provider 5.50.0 planned OPTIONS create-then-delete on the same service tuple. The original report's rollout interval note is superseded by the required safe sequence below. The controller preserves real unprepared-plan rejection and prepared-plan acceptance evidence; no local mock result is claimed as proof of this migration.

Independent remedy acceptance was relayed before commit. Documentation now requires private read/merge preserving all existing environment keys while adding exact plural origin JSON, successful wait/readback, checked contact code with revision/digest verification, then one-time in-place PutIntegration only for expected-old or exact-reviewed-new configuration. It rejects unexpected tuples/settings, requires unchanged stage deployment ID throughout preparation, and requires a newly refreshed plan rejecting any OPTIONS deletion/replacement or API/stage/Lambda replacement. Only the later accepted API deployment and Terraform cleanup may update the live stage/remove the obsolete singular key. An exact-new integration is already prepared. No handler, Terraform, test, workflow, lock, or package change was made.

The approved conditional analytics stop/test/start alternative is now in `docs/operations/analytics.md`, linked from delivery and the plan. It requires fresh successful daily delivery and clean upstream retries over more than 24 hours; explicit invoker holds; observed schedule disable with propagation margin; concurrency zero; the later of last async admission plus six hours and observed zero plus full timeout, with metric margin; consistent durable backup; exact public-compatible reader; checked producer installation while stopped; direct concurrency one controlled/repeated tests while the rule stays disabled; resume scheduling, then fresh Terraform reconciliation. It explicitly prohibits Terraform during the stopped interval, does not assume queued work rebinds to new code, treats quiescence as conditional operational inference, fails closed on contrary/ambiguous evidence, and leaves scheduled observation pending. The full general retention/recovery gates remain available. The selected private backend-bucket recovery prefix supersedes the earlier proposed log-bucket example; no backup/control execution is claimed.

Changed documentation only: `docs/operations/delivery.md`, `docs/operations/analytics.md`, and `docs/superpowers/plans/2026-09-11-api-analytics-release.md`. Controller ledger was deliberately not edited concurrently; root owns its decision entries.

Validation: `evidence/task1-transition-doc-checks.log` records exact three-path scope, per-file SHA256, and successful resolution of every relative documentation link and local heading anchor. `evidence/task1-transition-doc-whitespace.log` is empty: `git diff --check` passed. External AWS/provider links use the supplied independently reviewed sources; no cloud/public requests were made. Product/tests/workflows/provider lock are unchanged from `cf8410c`; unchanged suites/builds were not repeated for prose. No cloud action or claim of executed handover was added.

Documentation-fix commit: `09a548e070896bf0462b3d48624017c9ef287668` — `docs: guard contact and analytics release transitions`. Final staged whitespace check passed; post-commit worktree status is clean. No push or live action.

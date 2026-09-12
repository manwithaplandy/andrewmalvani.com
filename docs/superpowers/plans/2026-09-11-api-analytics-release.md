# Contact API and Analytics Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Execute checked tasks sequentially; read-only preflight may proceed independently.

**Goal:** Correct contact API readiness/deployment/CORS defects and carry out the existing analytics handover when its evidence gates pass.

**Architecture:** Preserve the static S3/CloudFront website and API Gateway/Lambda contact service. Preserve the implemented analytics reader/producer and its durable progress records. Repair the small contact boundary and release the checked existing candidate with a verified no-writer window and recoverable production state.

**Tech Stack:** Next.js static export, Python Lambda, Terraform 1.14.7 with locked providers, GitHub Actions, AWS API Gateway/SNS/EventBridge/DynamoDB/S3/CloudFront, Cloudflare.

**Spec:** The user's September 11 instruction to go ahead with fixing the contact API and safe analytics handover, together with docs/operations/analytics.md and docs/operations/delivery.md. The preceding explanation defines contact fixes, paused processing, validated backup, reader-first rollout, repeat/no-duplicate verification and scheduled observation.

## Global Constraints

- Work only in the existing codex/design-ux-remediation worktree and preserve the reviewed frontend and analytics source unless a concrete new blocker warrants a scoped reviewed correction.
- Preserve Terraform resource identities, buckets, table, data, provider versions, AWS account 870140981796 and region us-west-1. API deployment replacement is expected; no stage/API/Lambda replacement is authorized.
- Support exactly https://andrewmalvani.com and https://www.andrewmalvani.com as browser contact origins; do not allow localhost, arbitrary subdomains or wildcard browser access in production.
- Keep contact limits at name100/email254/message2000; retain validation, sanitization, clean errors, no contact data logs, and the existing SNS destination.
- Never send an actual contact notification from a worker; all worker tests use isolated synthetic clients. The controller owns production actions.
- Preserve the analytics no-writer, durable backup, reader-before-producer, exact-artifact, controlled/repeated/scheduled verification gates. No destructive reset, blind historical replay, deletion of processing proofs, or old-code rollback after new-format writes.
- Do not publish private plans, state, tokens, environment secrets, raw logs or table contents. Store private operational evidence outside the served website and repository with restricted permissions.
- Scope Cloudflare actions to this site's actual needs; do not broadly disable browser integrity or other security controls to pass a test.
- The user's go-ahead authorizes the described fixes and controlled handover; do not infer unrelated account changes, branch-protection administration or a wholesale redesign.

### Task 1: Repair the contact API boundary and publish-trigger coverage

**Files:** Modify terraform/contactLambda.tf and terraform/main.tf; modify sns_publish_lambda/lambda_function.py as needed for precise origin selection; create focused contact and infrastructure regression tests and add them to .github/workflows/checks.yml if needed; update docs/operations/delivery.md with contact scope and live checks. Tests belong in tests/contact/ and tests/infra/ or the existing tested packaging surface as appropriate.

**Interfaces:** Existing browser posts JSON to /api/contact. Existing API is REST API vs7dthj3vb; named stage api. Existing Lambda formSubmission publishes through SNS. Reader and analytics code/package must remain unchanged. Main and www are both real public website hosts and must be able to read contact responses.

- [ ] Write failing tests for a healthy MOCK response configuration, deployment fingerprint tracking meaningful method/integration/response changes, and no-op stability. Test actual parsed configuration/behavior where feasible rather than arbitrary whitespace/text shape.
- [ ] Write isolated Python handler tests for both exact allowed origins on success, validation failures and publish failures; preflight if handled there; disallowed/lookalike origins; missing Origin compatibility; no SNS publish for invalid input or preflight; preserved input limits and no data logging. Disable credentials/metadata and fake clients before import. Exercise the checked contact ZIP in at least one test so coverage does not stop at loose source files.
- [ ] Supply the health MOCK's missing status mapping. Its HTTP200 response is only API reachability, not email-delivery proof; document that limitation.
- [ ] Replace the empty REST-body deployment fingerprint with meaningful configuration coverage. Ensure all required integrations and responses exist before a new immutable deployment is created. Use create_before_destroy where needed. Keep the existing aws_api_gateway_stage.api as the sole explicit live-stage owner; avoid duplicate stage ownership from deployment.stage_name if removing it safely preserves the stage in the plan. Preserve all resource names and source-controlled endpoint configuration.
- [ ] Implement consistent exact-origin CORS for both public hosts, including OPTIONS and Lambda responses, with Vary: Origin and no wildcard. Do not add an authentication claim to CORS. Keep an authoritative shared origin list in Terraform. Keep public non-browser/missing-Origin behavior compatible, without granting browser access to unknown origins. Do not add new services or dependencies unnecessarily. Evaluate the simplest correct mock or existing-Lambda approach and explain the choice in the report.
- [ ] Run the focused regression tests, deterministic archive checks, Terraform formatting and backend-free readonly initialize/validate. Existing affected release/workflow tests must pass; do not rerun unrelated browser suites locally without a reason. No production read or write by implementer.
- [ ] Self-review, commit only Task1 files (including this plan if controller requests), and report changes, exact commands/output, design choices, test red/green evidence and remaining live verification. No worker subagents.

### Task 2: Verify production prerequisites and carry out the guarded release

**Files:** Read docs/operations/analytics.md and docs/operations/delivery.md. Controller maintains sanitized release evidence at /private/tmp/react-resume-release-20260911 and a durable nonsecret release report under docs/reviews/. Private backups/plans belong in approved restricted locations, never the website or GitHub artifacts.

**Interfaces:** Consume reviewed Task1 commit and actual passing GitHub checked artifacts. Root coordinates all cloud changes. Read-only preflight agent supplies effective invokers/retry timing, backup controls and a practical no-writer proof. Cloudflare zone b844ace401855c2f2141ee560430c0c7 in account9ec06f036c045c91e97ba1ec08a87251 is authoritative for apex/www.

- [ ] Refresh AWS identity, deployment configuration, invokers/retries, backup capability and Cloudflare settings. Record exact selected facts and permitted scope.
- [ ] Review Task1 independently, push the PR branch and require successful CI artifact production. Create and inspect a private state-backed plan; classify replacements and prerequisites before any apply.
- [ ] Complete verified no-writer and durable recovery checkpoint requirements from analytics.md before an apply that can reopen old code. Do not substitute an API success or a zero-concurrency setting for queue drainage. If a required wall-clock bound cannot be closed now, keep remaining dependent mutations blocked and report the exact earliest safe continuation; complete independent API work only through a reviewed isolated plan with no analytics side effects.
- [ ] Publish and verify the compatible checked website before activating the new analytics producer. Retain producer ownership of stats.json, old hashed assets and all stored history. Make only necessary scoped Cloudflare cache changes, preserving other subdomains and security controls.
- [ ] Apply the reviewed plan/install checked packages through an auditable controlled release. Verify API GET health, both allowed preflights and invalid-message responses without sending SNS messages. Correct further confirmed blockers only through scoped tested review.
- [ ] Verify controlled analytics completion, repeated processing without duplicate effects, public v2 display and effective scheduling. Observe the next scheduled completion if possible in this run; otherwise report that explicit remaining observation without claiming full acceptance.
- [ ] Preserve nonsecret artifacts/review evidence, update the PR and release report, and state exact completed actions, open gates and any user action. Refresh the local review only if frontend artifact changes materially; keep its demo boundaries.


## Reviewed release-transition gates — September 12 follow-up

- Contact: privately preserve/read-merge all existing Lambda environment keys;
  add exact `ALLOWED_ORIGINS` JSON before installing checked code, wait/read back
  both updates, then prepare the existing OPTIONS tuple in place with the
  reviewed `PutIntegration` settings, guarded by expected-old/exact-new
  configuration and unchanged stage deployment ID. A fresh refreshed plan must reject any
  OPTIONS replacement/deletion and preserve stage/API/Lambda identities before
  API deployment and obsolete singular-key cleanup. The earlier replacement
  plan is not releasable. See [the contact cutover sequence](../../operations/delivery.md#contact-api-release-boundary).
- Analytics: the approved conditional short route requires fresh successful
  daily-delivery/clean-retry evidence, a proven schedule/operator freeze, the
  later of last async receipt plus six hours and concurrency-zero observation
  plus full timeout, and observation margins. Preserve backup and public-reader
  gates; install checked code at concurrency zero, test with direct concurrency
  one while scheduling remains disabled, resume scheduling, then create a fresh
  Terraform reconciliation plan. No Terraform during the stopped interval.
  This is operational inference, not proof that pre-update queued events rebind
  to new code. See [the full conditions and stop rules](../../operations/analytics.md#conditional-short-stopteststart-handover).
- These are required release procedures, not a record of completed cloud
  actions. Controller-owned live evidence and independent remedy review remain
  authoritative; worker documentation preparation performs no cloud action.

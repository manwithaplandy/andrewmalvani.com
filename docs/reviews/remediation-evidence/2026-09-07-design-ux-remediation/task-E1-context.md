# Delivery and Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give public URLs reliable recovery, verify secure and efficient delivery, and prevent the reviewed behaviors from regressing unnoticed.

**Architecture:** Keep the existing AWS/Cloudflare hosting arrangement and Terraform resource identities. Separate route recovery, logging, transport, caching and CI into individually reviewable changes. Use read-only live discovery to resolve external configuration before preparing any coordinated production change.

**Tech Stack:** Next.js static export, Terraform with the current provider lock, CloudFront Functions, S3, Cloudflare, GitHub Actions, Node test runner, Playwright and Python unittest.

**Spec:** [Quality report](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07.md), F15, F18, F19, F28–F30 and verification of F14. [Master plan](/Users/andrew/Scripts/react-resume/docs/superpowers/plans/2026-09-07-design-ux-remediation.md).

## Global Constraints

- Preserve resource identities, data, existing site hostnames, the separately published `stats.json`, and the known working origin path.
- Do not change only the CloudFront HTTPS redirect setting while Cloudflare is still Flexible; the repository documents a redirect loop.
- Keep current log retention unless an independently reviewed policy changes it. Disabling self-logging does not authorize deleting stored logs or buckets.
- Resolve actual account/resource identifiers through read-only discovery; do not invent IDs or expose secrets in plans, test output or commits.
- Build and inspect a concrete Terraform plan before applying it under the execution authorization in force. An environment/approval-system block must be reported, not bypassed; unrelated work can continue.
- No fix-code snippets are supplied. Commands and behavioral tests support task execution.

---

## File map

| Responsibility | Files |
|---|---|
| Edge routing and useful 404 | Modify [main Terraform](/Users/andrew/Scripts/react-resume/terraform/main.tf:338); create `/Users/andrew/Scripts/react-resume/terraform/functions/rewrite-extensionless.js`, `/Users/andrew/Scripts/react-resume/src/pages/404.tsx`, `/Users/andrew/Scripts/react-resume/tests/infra/edge-routing.test.mjs`, `/Users/andrew/Scripts/react-resume/tests/e2e/not-found.spec.ts` |
| Logging | Modify [self-logging resource](/Users/andrew/Scripts/react-resume/terraform/main.tf:117); retain lifecycle resources |
| Transport and caching | Modify [delivery behavior](/Users/andrew/Scripts/react-resume/terraform/main.tf:281), [public outputs](/Users/andrew/Scripts/react-resume/terraform/outputs.tf:1), [workflow](/Users/andrew/Scripts/react-resume/.github/workflows/main.yml:1); coordinate stats cache metadata with the [producer](/Users/andrew/Scripts/react-resume/stats_aggregator/lambda_function.py:449) |
| Quality workflow | Create `/Users/andrew/Scripts/react-resume/.github/workflows/checks.yml`; modify existing main workflow and A1-owned scripts only after their changes merge |
| Documentation and evidence | Modify [README](/Users/andrew/Scripts/react-resume/README.md:1), [historical review](/Users/andrew/Scripts/react-resume/DESIGN_REVIEW.md:1); create `/Users/andrew/Scripts/react-resume/docs/operations/delivery.md` and `/Users/andrew/Scripts/react-resume/docs/reviews/design-ux-remediation-status.md` |


## Execution context

Work only in /Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation. Paths in the source plan point to the original checkout; map them into this worktree. The user has now authorized implementation. Do not deploy/push or change cloud settings in a task; prepare reviewable changes and record exact external dependencies. Do not invent missing factual evidence.

## Verified execution tools

Use Node 22 at /Users/andrew/.nvm/versions/node/v22.16.0/bin/node (prepend that bin directory to PATH for Yarn commands). Default PATH selected Node 26 during setup. Python 3.12.14 is available at /Users/andrew/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3. Network-bound calls may require require_escalated; AWS and GitHub credentials were verified by read-only calls outside the sandbox. See environment-notes.md for already performed live checks; do not repeat them without a new reason.

Task-specific review risk to consider: the new slash redirect constructs a Location value from a viewer-controlled URI. Verify unusual leading-slash paths cannot become protocol-relative external redirects; preserve the intended site-local routing contract.

For clean subsequent validation output, use `env -u NO_COLOR` with the Node 22 PATH; B1 reported conflicting color environment warnings. If Yarn reports unwritable cache/global directories in the sandbox, select task-scoped writable temporary paths or use the already authorized escalation, rather than changing application behavior or suppressing test failures.

Verification efficiency: after focused and relevant combined checks pass on the final source, do not repeat the same unchanged suite merely to label it fresh. Rebuild/rerun only when an actual change, failure, or unresolved concern warrants it; record exactly what source/results were verified.

Runner follow-up: Yarn 1 still warned with YARN_GLOBAL_FOLDER alone in C1. A2 produced clean output using PREFIX=/private/tmp/react-resume-prefix and YARN_CACHE_FOLDER=/private/tmp/react-resume-yarn-cache plus env -u NO_COLOR. Prefer that known-working environment for subsequent checks; do not rerun completed tasks solely for this cosmetic runner warning.

For the already named redirect-safety risk, include slash/backslash variants when considering viewer-controlled Location values, not just leading double forward slashes. Browser URL parsing can normalize backslashes; keep any canonical redirect same-origin for unusual request URIs while preserving normal encoded query/multi-value behavior. This is a focused edge case of the existing routing contract, not a new routing feature.

Controller local evidence: Node 22 WHATWG URL parsing resolved a Location beginning with slash + backslash + example.com/path/ against the site base to origin https://example.com. This verifies the parser risk for the test fixture; it does not establish that CloudFront accepts every unusual URI or that a deployed exploit exists.

Primary source checked: [CloudFront Functions event structure](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html) states duplicate values appear in multiValue and the first also appears in value. Serialize the multiValue list once rather than duplicating its first value. It also states rewriting uri does not change the selected cache behavior/origin. This source did not settle query percent-decoding semantics; retain the plan's real CloudFront encoded-fixture verification before rollout instead of asserting it was proved by local fixtures.

Terraform input preflight: no *.tfvars file exists in this execution worktree. Original checkout has /Users/andrew/Scripts/react-resume/terraform/terraform.tfvars; controller inspected variable names only and found email_address. No values were printed/copied. cloudflare_zone_id defaults to empty in source but is supplied by the main workflow repo variable, so a real plan must recover/preserve the actual configured value through authorized inputs, not accept empty merely because local defaults permit it. Backend-disabled validation has no input requirement and remains distinct from a real state-backed plan. Do not initialize/migrate the execution worktree backend or save state/plan secrets to source casually; prepare a separate explicitly scoped plan environment and report unavailable inputs/access precisely. No real Terraform plan/backend connection has yet run.

Terraform input follow-up: controller successfully read the existing GitHub repository CLOUDFLARE_ZONE_ID variable without printing its value and combined it with the original checkout's unchanged tfvars in /private/tmp/react-resume-infra-review-vu595k01/inputs.auto.tfvars (parent0700/file0600). Inputs contain email_address and cloudflare_zone_id. Use this private existing-input file for a later scoped real infrastructure review; never print/copy its values into source, reports or tool output. This resolves the input-availability issue above; still no backend initialization or real plan/apply has run. Controller will coordinate one final state-backed plan after all relevant configuration changes rather than redundant intermediate remote plans. Task agents should run backend-disabled validation and describe expected scope; do not claim a reviewed real plan yet. The final review environment should remain separate from the execution checkout, with private plan/state outputs.

Controller primary-doc follow-up: CloudFront event-structure documentation confirms multiValue contains all occurrences, including the first value, and recommends that actual event representation be respected. The reviewed page does not independently establish every percent/plus decoding boundary. Preserve the planned encoded-query fixtures and document their assumptions; do not claim VM tests or a TestFunction call with handcrafted JSON prove the live viewer-to-event encoding boundary. The approved release check must also send real trailing-slash requests with spaces, encoded plus/ampersand and repeats, inspect Location and follow it to verify semantic round trip. Current source: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html . No production function was changed or invoked by this preflight.


Workflow validator now available: /private/tmp/react-resume-actionlint-1.7.12/actionlint (official releasev1.7.12,darwin_arm64), prepared by controller from the official release asset with published SHA256 match aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f. Version command passes. Use after actual workflow edits for semantic/static validation; this does not substitute for the approved GitHub PR/failing/passing runs. Documentation https://github.com/rhysd/actionlint/blob/main/docs/install.md and exact release https://github.com/rhysd/actionlint/releases/tag/v1.7.12. No global install/source dependency change.

Further primary reference for the serializer decision (controller researched whileD4review runs): AWS's normalize-query-string example serializes event.querystring keys and value/multiValue members directly into key=value pairs, without encodeURIComponent on the values: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/example_cloudfront_functions_normalize_query_string_parameters_section.html . Its multiValue includes all occurrences once. Combined with https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-function-restrictions-all.html (UTF-8 values passed unchanged; percentencodingcompatible), this is a stronger starting point than assuming all event fields were URL-decoded and blindly encoding percent signs again. Use explicit encoded-event fixtures for spaces/%2B/%26/percent and repeatedfields; preserve meaning when Location is parsed/followed. This remains source/sample evidence, not the actual viewer-to-event boundary; keep the approved live encoded-request roundtrip gate. Runtime2 querystring module docs describe module parse/stringify defaults, not a definitive decoded-event-field guarantee. Do not rely on third-party GitHub issue snippets as authoritative.

D4 integration now exists at e22ea71: scripts/verify_public_stats_reader.mjs and main.yml gate ordinary producer updates after upload/invalidation/public-reader proof; create/replace producer plans run same proof BEFORE apply. The terraform-plan job already produces out, so E1 can download that same candidate export and stage checked404 before error-policy apply. Preserve both reader-gate branches, known resource identities, and the explicit migration no-writer/durable-backup prerequisite in docs/operations/analytics.md. Do not replace D4 gates during E1 edits; E5 later consolidates checked artifacts/build permissions. If a wholly new site's bucket/reader/payload is unavailable, stop for the separately reviewed staged bootstrap described by D4 rather than claim ordinary auto-deploy can satisfy missing-resource prerequisites. No deployment/CloudFront invocation now.

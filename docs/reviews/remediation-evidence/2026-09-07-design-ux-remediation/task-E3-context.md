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

## Owner and release dependencies

The controller requested residence, metric reconciliation, credential evidence and two project narratives asynchronously. No answer has arrived as of setup. Check with the controller at task start for new input. Complete all code/design/verification work independent of these answers; preserve original factual contexts and record exact unresolved rows. External releases, shared pushes and security-setting changes require the controller’s final reviewable handoff; prepare code and read-only evidence without performing those actions. Local completion and production verification are different statuses.

For clean subsequent validation output, use `env -u NO_COLOR` with the Node 22 PATH; B1 reported conflicting color environment warnings. If Yarn reports unwritable cache/global directories in the sandbox, select task-scoped writable temporary paths or use the already authorized escalation, rather than changing application behavior or suppressing test failures.

Verification efficiency: after focused and relevant combined checks pass on the final source, do not repeat the same unchanged suite merely to label it fresh. Rebuild/rerun only when an actual change, failure, or unresolved concern warrants it; record exactly what source/results were verified.

The controller has also requested the current Cloudflare SSL/TLS mode, apex/www proxy state and HTML/stats cache rules asynchronously. Check for any answer before declaring these settings unknown; do not infer a mode from a public HTTPS response.

Runner follow-up: Yarn 1 still warned with YARN_GLOBAL_FOLDER alone in C1. A2 produced clean output using PREFIX=/private/tmp/react-resume-prefix and YARN_CACHE_FOLDER=/private/tmp/react-resume-yarn-cache plus env -u NO_COLOR. Prefer that known-working environment for subsequent checks; do not rerun completed tasks solely for this cosmetic runner warning.

Terraform input preflight: no *.tfvars file exists in this execution worktree. Original checkout has /Users/andrew/Scripts/react-resume/terraform/terraform.tfvars; controller inspected variable names only and found email_address. No values were printed/copied. cloudflare_zone_id defaults to empty in source but is supplied by the main workflow repo variable, so a real plan must recover/preserve the actual configured value through authorized inputs, not accept empty merely because local defaults permit it. Backend-disabled validation has no input requirement and remains distinct from a real state-backed plan. Do not initialize/migrate the execution worktree backend or save state/plan secrets to source casually; prepare a separate explicitly scoped plan environment and report unavailable inputs/access precisely. No real Terraform plan/backend connection has yet run.

Terraform input follow-up: controller successfully read the existing GitHub repository CLOUDFLARE_ZONE_ID variable without printing its value and combined it with the original checkout's unchanged tfvars in /private/tmp/react-resume-infra-review-vu595k01/inputs.auto.tfvars (parent0700/file0600). Inputs contain email_address and cloudflare_zone_id. Use this private existing-input file for a later scoped real infrastructure review; never print/copy its values into source, reports or tool output. This resolves the input-availability issue above; still no backend initialization or real plan/apply has run. Controller will coordinate one final state-backed plan after all relevant configuration changes rather than redundant intermediate remote plans. Task agents should run backend-disabled validation and describe expected scope; do not claim a reviewed real plan yet. The final review environment should remain separate from the execution checkout, with private plan/state outputs.

Cloudflare API access follow-up: the repository deliberately documents its existing SSM integration token as Analytics:Read (terraform/statsLambda.tf local token comment). Cloudflare's current primary API reference for GET /zones/{zone_id}/settings/{setting_id} requires Zone Settings Read or Write: https://developers.cloudflare.com/api/resources/zones/subresources/settings/methods/get/ . The analytics integration therefore is not established settings access; no secret value was retrieved, printed, or tested, and no settings permission was inferred. F19 still needs authenticated settings evidence or owner-supplied nonsecret mode/proxy/cache details. Do not broaden or rotate the analytics token to solve this discovery gap.

E4 cross-CDN verification detail (primary Cloudflare docs verified 2026-09-08): Browser Cache TTL can increase a lower origin max-age, and applicable cache rules can override origin directives. Therefore prepared S3/CloudFront60s browser/300s shared metadata alone cannot establish end-to-end freshness while Cloudflare settings remain unknown. Inspect Browser Cache TTL (including Respect Existing Headers behavior) and matching browser/edge Cache Rules before release; record coordinated setting changes for approval, then verify actual public headers. Our observed PDF/chunk max-age14400 is public behavior, not proof of which account setting produced it. Cache purge does not clear visitors' existing browser caches. Primary sources: https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/set-browser-ttl/ and https://developers.cloudflare.com/cache/concepts/cache-control/ . Do not promise the declared freshness window from Terraform compilation alone.

Additional transport baseline 2026-09-08T09:46:52–54UTC, evidence/delivery-entry-paths-before.json: public HTTP apex and www each return one Cloudflare301 to same-host HTTPS then200. HTTPS www homepage/graph and apex graph/stats return200 without redirects. Direct www HTTPS origin via curl --connect-to retaining www hostname/Host/SNI also returns200 with normal certificate validation (ssl_verify_result0); this complements the earlier apex origin check. No certificate errors ignored. These prove observed entry-path behavior and both origin hostname prerequisites, not authenticated Cloudflare SSL mode/proxy/cache settings. No production configuration changed. Existing delivery-cache-before.json already records successful PDF/statsJSON/actual-chunk requests; do not repeat preflight solely for freshness. Post-release verification remains distinct.

CloudFront→S3 transport follow-up: live GetOriginAccessControl E3Q6QZXOS9AMQ8 returned OriginTypes3,SigningBehavioralways,SigningProtocolsigv4. This is the previously verified default S3 origin attachment onEDHU4C51HW4BG. AWS primary docs statealways-sign S3 OAC usesHTTPS: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html (Prerequisites). Evidence delivery-origin-access-control.json. This proves the configuredCloudFront→S3 transport contract, not a packetcapture or the Cloudflare→CloudFront hop/accountSSLmode. No settings changed.

Carry E2's deferredMinor wheneditingdeliveryrecord: the 'comparableboundedmethod' language mustnotimply that repeating a100pagecap measuresactualtotalprefixgrowth. Such observationsarelowerboundsonly; quantifiedgrowthrequirescompletecomparablecoverageoranotherexplicitlyjustifiedmetric. No newlisting/query/testjustforthisprose. E1's earlier403/404wordingMinorwasfixedbyE2andverified.

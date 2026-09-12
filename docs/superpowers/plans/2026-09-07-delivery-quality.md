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

## Task E1: Normalize public page URLs and provide purposeful missing-page recovery

**Finding:** F15. **Dependency:** A1 for browser tests; does not depend on the analytics producer.

**Files:** Modify main Terraform; create the extracted edge function, 404 page and two route test files from the map. Record staging and public checks in `docs/operations/delivery.md`.

**Interfaces:**

- Extract the existing CloudFront Function source into the named JavaScript file, still defining the CloudFront-required `handler(event)` entry point. Terraform loads that file as the function’s code. Node tests execute that exact file in an isolated VM context.
- `/` maps to `/index.html`; extensionless `/stats` and `/graph` map to `.html`; non-root trailing-slash paths redirect to their no-slash equivalent. Preserve the original query fields and repeated values in redirects using the CloudFront event representation.
- Static asset paths keep their extensions. Unknown paths produce a site-styled 404 with links to the résumé and contact. Origin 403/404 missing-object responses use `/404.html` with response status 404 and a short 10-second error-cache TTL.

- [ ] **Step 1: Add a route matrix against the actual edge function.** Test `/`, `/stats`, `/stats/`, `/graph`, `/graph/`, `/assets/resume.pdf`, `/_next/static/example.js`, and `/does-not-exist`. Add trailing-slash query cases with multiple values, spaces, encoded plus signs and encoded ampersands; following the redirect must preserve their meaning, not double-encode or drop them.

```js
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../../terraform/functions/rewrite-extensionless.js', import.meta.url), 'utf8');

test('the slash redirect preserves repeated query values', () => {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  const result = context.handler({request: {
    method: 'GET', uri: '/graph/', headers: {}, cookies: {},
    querystring: {view: {value: 'list'}, tag: {
      value: 'skills', multiValue: [{value: 'skills'}, {value: 'roles'}],
    }},
  }});
  assert.ok([301, 308].includes(result.statusCode));
  const target = new URL(result.headers.location.value, 'https://andrewmalvani.com');
  assert.equal(target.pathname, '/graph');
  assert.equal(target.searchParams.get('view'), 'list');
  assert.deepEqual(target.searchParams.getAll('tag'), ['skills', 'roles']);
});
```

Use AWS's [event structure](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html) for the encoded-value cases and validate those event fixtures against an actual CloudFront test invocation before production rollout. VM tests do not establish the deployed runtime's capabilities by themselves.

- [ ] **Step 2: Add the missing-page browser check.** In the static-export preview, an unknown page must return 404, show `Page not found`, and expose ordinary links to the homepage and contact. The page must fit 320 pixels and have a clear page title and non-indexing metadata. No screenshots are needed to test exact prose beyond its navigational purpose.
- [ ] **Step 3: Run the current failures.** Run `node --test tests/infra/edge-routing.test.mjs` and, after `yarn build`, `yarn test:e2e tests/e2e/not-found.spec.ts --project=chromium`. The edge behavior must be tested separately because the local preview server cannot prove CloudFront configuration.
- [ ] **Step 4: Implement the routing contract.** Preserve static file addresses, normalize non-root trailing slashes consistently and maintain safe query serialization. Build the 404 with the existing Page/typography patterns and useful navigation. Configure the distribution’s 403 and 404 response mappings without changing successful-route behavior.
- [ ] **Step 5: Validate the export and infrastructure.** Rebuild; confirm `out/404.html`, `out/stats.html` and `out/graph.html` exist. Run tests, typechecks/lint, `terraform -chdir=terraform fmt -check`, then isolated `terraform -chdir=terraform init -backend=false -lockfile=readonly` and `terraform -chdir=terraform validate`.
- [ ] **Step 6: Review and stage delivery.** Inspect the real Terraform plan using existing authorized variables; require only the function/error-response changes for this task. Make the new `404.html` available before enabling its error response. Do not introduce a window in which the recovery document itself is absent.
- [ ] **Step 7: Verify public responses after rollout.** Use `curl -I`/browser navigation on both slash variants and a unique nonexistent path. Require working pages or one purposeful redirect, a true 404 for unknown content, and no XML access-denied screen. Check a known asset as a guard against a broader origin-permission problem being disguised as a 404.
- [ ] **Step 8: Commit code and record results** as `fix: normalize public routes and serve useful 404 pages`.

## Task E2: Stop log destinations from logging themselves

**Finding:** F18; verify F14 methodology remains accurate. **Dependency:** None on application code.

**Files:** Self-logging configuration and delivery operations record.

**Interfaces:** Retain the existing log bucket, CloudFront log destination, website-access log destination and 90-day current-object lifecycle. Only the bucket’s logging-to-itself setting is removed. AWS confirms the problem in its [logging-destination guidance](https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-server-access-logging.html).

- [ ] **Step 1: Record current logging relationships.** Inspect the current configured source/destination pairs and, with authorized read-only access, verify the destination bucket’s logging setting. Record aggregate object counts/volume by prefix; do not download or publish raw records.
- [ ] **Step 2: Prepare removal of the self-logging configuration.** Preserve the bucket and all data/lifecycle resources. A Terraform plan showing bucket replacement, deletion or unrelated retention changes is a failure for this task.
- [ ] **Step 3: Run formatting/validation and review the real plan.** The expected change disables one logging relationship and leaves normal operational log collection intact.
- [ ] **Step 4: Apply through the normal reviewed execution path and verify.** Confirm the destination bucket no longer logs to itself, while the original website/CloudFront sources still deliver logs. Existing queued deliveries may arrive briefly; do not interpret that alone as a failed change.
- [ ] **Step 5: Record follow-up evidence.** Compare subsequent prefix growth with the initial snapshot and document the observation window. If enough time has not elapsed, record that operational observation as remaining; do not claim a measured savings figure.
- [ ] **Step 6: Commit** as `fix: stop recursive access logging`, including the delivery record and any corrected methodology wording needed by D1.

## Task E3: Verify and correct the transport path as a coordinated change

**Finding:** F19. **Dependency:** Read-only AWS/Cloudflare account access; no speculative account mutation.

**Files:** Delivery behavior/comments, public output definitions where useful, delivery operations record.

**Interfaces:** Produces a verified delivery diagram and mode record. Resolve distribution IDs through Terraform’s known resources or a read-only `aws cloudfront list-distributions` query restricted to IDs, domain names and aliases. Resolve Cloudflare settings through the connected account/dashboard; credentials never enter source or output artifacts.

- [ ] **Step 1: Inspect the actual configuration.** Record Cloudflare SSL mode, proxy status, hostname coverage, origin hostname, CloudFront aliases/certificate and current redirect behavior. Check public HTTPS pages plus the HTTPS origin connection with correct host/SNI. Do not infer the current mode solely from repository comments.
- [ ] **Step 2: Choose the explicit branch.** If Full (strict) is already active and origin validation succeeds, retain it and correct stale comments. If Flexible is active, prepare Full (strict) only after verifying an unexpired certificate covers the origin hostname and the HTTPS origin is reachable. If origin validation fails, identify and repair that exact certificate/hostname/reachability prerequisite before changing the mode; leave the working configuration in place meanwhile. See [Cloudflare’s Full (strict) requirements](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/).
- [ ] **Step 3: Prepare a bounded rollout and rollback record.** Save the nonsecret previous settings and define success as working homepage/graph/stats/assets with HTTPS on each hop and no redirect loop. A rollback restores the previous complete configuration, not just one redirect flag.
- [ ] **Step 4: Perform the mode transition under execution authorization.** For Flexible, move Cloudflare to the verified HTTPS origin mode first and verify traffic before tightening the CloudFront viewer policy. If redirect loops or certificate errors occur, restore the recorded coordinated settings and investigate the specific failing hop.
- [ ] **Step 5: Verify all entry paths.** Inspect HTTP-to-HTTPS behavior, the apex and any configured aliases, deep links, PDF, stats JSON and static chunks. Confirm certificate validation remains enabled; do not “verify” success by ignoring certificate errors.
- [ ] **Step 6: Update Terraform/documentation and commit** as `fix: verify encrypted site delivery end to end`. If external access prevents the live checks, retain an explicit F19 dependency with the verified code/configuration work and the exact unperformed check.

## Task E4: Establish intentional static caching without stale releases

**Finding:** F28. **Dependencies:** E3 transport known; D3 producer/workflow changes merged before editing their cache metadata.

**Files:** CloudFront cache behaviors, upload metadata in workflow, stats object cache metadata, delivery operations record.

**Interfaces:**

- HTML, PDF and other stable-address public content: browser max-age 60 seconds and shared-cache max-age 300 seconds; minimum cache TTL 0 so explicit no-cache responses can still work.
- Content-hashed `/_next/static/*`: browser/shared max-age 31,536,000 seconds and immutable; no cookies, arbitrary viewer headers or tracking queries in the cache key.
- `stats.json`: browser max-age 60 seconds, shared max-age 300 seconds, independently published by Lambda. Preserve its ownership/exclusion in frontend deployment.
- New cache policies must agree with origin response metadata; an origin’s one-hour browser max-age is not fixed merely by changing edge TTLs. Compression support remains enabled where appropriate.

- [ ] **Step 1: Measure current behavior.** Record cache-control, Age and available cache-status headers for HTML, a hashed chunk, PDF and stats JSON across repeat requests. Inspect relevant Cloudflare cache rules as well. Report latency only as a small sample, not field Core Web Vitals or a guaranteed speedup.
- [ ] **Step 2: Prepare policies for the three classes above.** Replace the all-path CachingDisabled arrangement with deliberate path behaviors. Ignore campaign query values for these static objects without discarding query values used by client navigation. Keep origin identity/permissions intact.
- [ ] **Step 3: Align object metadata.** Update frontend uploads and the stats producer to the class-specific cache controls. Existing unchanged S3 objects may retain old metadata, so plan a scoped metadata refresh for the affected known keys; do not rewrite unrelated bucket contents.
- [ ] **Step 4: Verify a local release manifest and reviewed Terraform plan.** Check that every HTML-referenced hashed asset is included. Confirm the plan changes only caching/metadata behavior and does not replace the distribution or bucket. Test that dynamic `stats.json` remains excluded from frontend sync/deletion.
- [ ] **Step 5: Deploy and verify repeat requests plus an update.** Check the public headers/cache state, then deploy a controlled content update through the usual process and confirm it becomes visible within the declared freshness window/invalidation policy. Verify the PDF and separately refreshed stats too.
- [ ] **Step 6: Record actual measurements and commit** as `perf: define cache behavior for static site assets`. Preserve prior hashed assets for older open tabs; E5 formalizes that release ordering. Do not apply an age-only lifecycle rule that can delete an old-but-still-referenced hash.

## Task E5: Add nonmutating PR checks and guard deployment continuity

**Finding:** F29. **Dependencies:** A1 tooling and all relevant tests; D3 packaging changes merged. This task follows E4’s cache contract.

**Files:** New checks workflow, existing deployment workflow, shared scripts only as needed for the defined commands.

**Interfaces:**

- PR checks run with `contents: read`, without cloud secrets, state refresh, infrastructure apply or contact traffic. Reuse the same verification entry points on main.
- Frontend build output is produced once per checked commit and reused for browser tests and deployment. Do not rebuild altered source after review.
- Stats bootstrap/update archives contain `lambda_function.py`, `payload.py`, `ledger.py`; the contact archive retains only its own handler. D3 remains the source of this packaging contract.
- Upload referenced hashed assets before HTML; retain previous hashes so already-open tabs can finish navigation. Keep `stats.json` outside frontend ownership. Do not use blanket deletion to clean unrelated generated data.

- [ ] **Step 1: Add checks.yml for pull requests.** Use Node 22/Yarn Classic and Python 3.12, install locked dependencies, run both typechecks and nonmutating lint, install Chromium, build once, and run the browser/unit suites on the generated export. Install `tests/requirements.txt` and run Python tests with dummy credentials/metadata lookup disabled. Run the Node edge-function tests and Terraform formatting/validation with backend disabled; no real plan/apply is part of PR checks.
- [ ] **Step 2: Make check failures actionable.** Upload failed browser traces/screenshots and concise test logs with short retention; no raw contact or cloud data. Missing WebGL support must be visible as an environment failure or documented manual requirement, not silently counted as graph verification.
- [ ] **Step 3: Verify checks do not modify reviewed source.** Snapshot tracked source state before checks and compare afterward; ignore intended untracked test/build outputs. Confirm `lint` and typechecks no longer run formatting/autofixing. Review any external branch protection separately rather than claim this workflow automatically configures it.
- [ ] **Step 4: Integrate the same checks before main deployment.** Ensure deploy jobs depend on the passing checked artifact. Preserve OIDC only where deployment requires it. Keep provider locks and existing secret injection, and coordinate the new archive members from D3 rather than overwrite its changes.
- [ ] **Step 5: Implement safe asset ordering.** Upload content-hashed assets first with immutable metadata and without deleting previous hashes; then upload stable-address files with their short freshness policy. Explicitly exclude stats JSON. Record removed fixed-address files for scoped cleanup rather than deleting unknown bucket contents. Use the existing invalidation only after the new referenced assets are available.
- [ ] **Step 6: Verify behavior, not just workflow syntax.** Exercise a PR run without cloud secrets, a known failing regression in a temporary test branch, and a passing run. In a controlled release, keep an older tab open across deployment and verify it can still load its referenced assets; verify a fresh tab receives the new page.
- [ ] **Step 7: Commit** as `ci: verify user journeys before deploying checked artifacts`. Keep any repository-setting change distinct from merely adding workflow files.

## Task E6: Document operation and close each finding with evidence

**Finding:** F30; final cross-plan closure. **Dependency:** All completed implementation tasks and their evidence. Owner/external dependencies may be recorded as still open without blocking documentation.

**Files:** README, historical review, new remediation status file, delivery and analytics operation records. Read [LICENSE](/Users/andrew/Scripts/react-resume/LICENSE:1) and preserve the existing MIT notice and attribution.

**Interfaces:** The status file contains one row per F01–F30: status (`open`, `implemented`, `verified`, or `blocked`), owning task, commit, acceptance evidence, and any exact remaining dependency. `verified` means the required checks actually ran; a local implementation is not automatically live verification.

- [ ] **Step 1: Rewrite repository orientation.** Explain the homepage/graph/stats roles, prerequisites, locked install, local development, production build/preview, tests and lint/format differences. Explain that `stats.json` is published separately and that local missing data is expected unless tests provide fixtures.
- [ ] **Step 2: Correct licensing and historical context.** State that the project uses the existing MIT license and retain upstream attribution. Mark the older design review as historical with links to the newer report and status table; do not erase its findings or retroactively claim completion.
- [ ] **Step 3: Document operational boundaries.** Summarize contact test isolation, analytics source units/freshness, ledger-aware rollback, delivery/cache settings and how to inspect failures. Keep credentials/raw data out of examples. Record the actual discovered account-dependent configuration, not assumptions copied from the old report.
- [ ] **Step 4: Run the integrated acceptance pass.** Build the reviewed commit, run typechecks/lint/browser/unit/backend/edge tests once, and inspect desktop plus 320/390-pixel and landscape flows. Verify PDF facts against the approved record. Recheck every High finding and all affected cross-page navigation.
- [ ] **Step 5: Complete the finding ledger.** Map every report acceptance criterion to its task result. Leave owner facts, credential evidence, scheduled-update observations or unavailable account checks open with a precise dependency; do not downgrade severity just to close them.
- [ ] **Step 6: Commit documentation** as `docs: document verified UX remediation and operations`. Deliver the status ledger plus a concise summary of what changed, how it was verified, and what remains externally dependent.

## Execution verification commands

These commands assume the earlier tasks have established their declared scripts and test files, and run from the execution checkout:

```sh
yarn typecheck
yarn typecheck:tests
yarn lint
yarn build
yarn test:e2e --project=chromium
python -m unittest discover -s tests/stats -p 'test_*.py' -v
node --test tests/infra/edge-routing.test.mjs
terraform -chdir=terraform fmt -check
terraform -chdir=terraform init -backend=false -lockfile=readonly
terraform -chdir=terraform validate
git diff --check
```

Initialization/validation belongs in an isolated execution workspace. A real infrastructure plan uses the normal authorized backend and variables; it must not be confused with backend-disabled PR validation. Public verification happens after the associated release, and must be reported separately from local pass results.

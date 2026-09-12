# E1 implementation report

Status: DONE_WITH_CONCERNS, pending independent task review and the separately owned release gates. Base `e22ea71`. Commit `fe1a239`. No deployment, push, CloudFront invocation, public mutation, contact send, backend/state access, or real Terraform plan was performed.

## Behavior and delivery changes

The existing `aws_cloudfront_function.rewrite_extensionless` resource now loads the exact source in `terraform/functions/rewrite-extensionless.js`; the Node VM tests execute that same file. `/` rewrites to `/index.html`, extensionless paths rewrite to `.html`, and paths with extensions remain unchanged. Non-root trailing slashes produce one 308 to the no-slash equivalent, including repeated trailing slashes such as `/stats///`. Redirects serialize each CloudFront `multiValue` occurrence once and pass through the event's encoded `%20`, `%2B`, `%26`, and `%25` values without blind double encoding. Leading slash and backslash variants are converted to a site-local `Location`.

The new static `404.html` uses the site's dark/orange presentation, a specific title, `noindex, nofollow`, a clear `Page not found` heading, and ordinary résumé/contact links. CloudFront's existing distribution identity now maps origin 403 and 404 responses to `/404.html` with viewer status 404 and a 10-second error-cache TTL. Existing successful routes, static addresses, origin selection, hostnames, and resource identities remain unchanged.

The apply job downloads the same `out` artifact made by the plan job and checks that `404.html` exists and every direct `_next/static` reference exists in that candidate. Before Terraform apply, it uploads the candidate's full `_next/static` tree without deletion, then uploads `404.html` last. This includes page chunks, CSS, and nested static font/media assets while retaining old hashed files. It does not touch `stats.json`. A missing bucket or missing candidate recovery dependency stops the job before the error policy can be enabled. The D4 pre-apply producer-bootstrap reader gate and ordinary post-publication reader gate remain intact. `docs/operations/delivery.md` records the contract, ordering, rollback limits, and required post-release checks.

## TDD evidence

Initial route RED:

```sh
env -u NO_COLOR PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH node --test tests/infra/edge-routing.test.mjs
```

Failed with `ENOENT` because the extracted handler did not exist. The focused follow-up for `/stats///` then failed on the first implementation because it returned `/stats//` rather than the one-redirect canonical `/stats`.

Final route GREEN used the same command: **4 tests passed, 0 failed**. It covers `/`, `/stats`, `/stats/`, `/stats///`, `/graph`, `/graph/`, the résumé PDF, a Next static asset, an unknown extensionless path, encoded and repeated query fields, and leading slash/backslash safety against an external origin.

Initial browser RED after the baseline build:

```sh
env -u NO_COLOR PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH PREFIX=/private/tmp/react-resume-prefix YARN_CACHE_FOLDER=/private/tmp/react-resume-yarn-cache yarn test:e2e tests/e2e/not-found.spec.ts --project=chromium
```

Both cases failed because the baseline used the generic Next error title/content. Final GREEN: **2 tests passed** against the static-export preview. The checks require a real HTTP 404, exact title/robots metadata and recovery links, then repeat an unknown route at 320x720 and assert no horizontal overflow. External browser traffic remained blocked by the existing fixture.

## Final validation

- `yarn build`: pass; TypeScript compilation and static export completed for all five pages, including `/404`, `/stats`, and `/graph`; `out/404.html`, `out/stats.html`, and `out/graph.html` exist. The final handler-only slash correction is not a Next build input.
- Local candidate-reference check using the workflow's exact matching logic: 13 references, 12 unique, 0 missing. The workflow stages the entire candidate `_next/static` tree, including transitive fonts/media.
- `yarn lint`: pass, zero warnings.
- `yarn typecheck`: pass.
- `yarn typecheck:tests`: pass.
- `terraform -chdir=terraform fmt -check -no-color`: pass.
- `terraform -chdir=terraform validate -no-color`: `Success! The configuration is valid.` after backend-disabled initialization; provider execution required the established local escalation and performed no state/backend access.
- `/private/tmp/react-resume-actionlint-1.7.12/actionlint .github/workflows/main.yml`: pass, no findings.
- `git diff --check`: pass.

The exact required `terraform -chdir=terraform init -backend=false -lockfile=readonly -input=false -no-color` was attempted. It failed before validation because the committed baseline lock retains the known unused `hashicorp/null` entry and Terraform 1.14.7 wanted to prune it while readonly. Following the controller's documented preflight, backend-disabled init without readonly reused archive 2.4.2, AWS 5.50.0, and random 3.6.2, pruning only that stale null entry; validation then passed. The exact tracked lock was restored, and `git diff --exit-code -- terraform/.terraform.lock.hcl` passes. No provider selection or cache change is included in the task commit.

## Self-review and limits

Reviewed the full source/test/Terraform/workflow/docs diff and checked the workflow statically after its final changes. The upload uses one candidate artifact, stages assets before HTML, retains old hashes, performs no blanket deletion, and remains before apply. Both D4 reader gates and the later `stats.json` exclusion are preserved. No static extension rewrite or production total/caching behavior was added.

The VM tests establish behavior for explicit event fixtures, not the live viewer-to-event boundary or CloudFront runtime. No actual CloudFront TestFunction invocation, public encoded-query round trip, error mapping, or two-host rollout check has occurred. A consolidated state-backed plan is also intentionally unperformed and remains controller-owned; it must show the reviewed function/error-response changes alongside only other accepted release changes. After approved rollout, verify both hostnames, encoded/repeated redirects, a unique true 404, known pages, a versioned asset, and the résumé PDF as documented. These release evidence gaps are why the local result is `DONE_WITH_CONCERNS`, not a claim that F15 is live-closed.

## Preserved command evidence

No verification was rerun for evidence packaging. The completed command transcript is preserved with explicit labels where transcript compaction left only the result summary:

- `evidence/e1-tdd-transcript.md`: initial handler/browser RED summaries, exact repeated-slash RED, exact final edge GREEN, and final browser GREEN summary.
- `evidence/e1-validation-transcript.md`: build/export summary, exact candidate-reference count, lint/type outputs, actionlint/static results, and commit/source closure.
- `evidence/e1-terraform-transcript.md`: strict readonly-init failure summary, exact successful backend-disabled init/validate outputs, and exact lock-restoration distinction.

The strict sequence is: readonly init failed and changed nothing; non-readonly backend-disabled init reused the locked provider versions and pruned the unused null entry; validation passed; then the exact tracked lock was restored. No provider churn entered the commit.

## Commit handoff

`fe1a239` — `fix: normalize public routes and serve useful 404 pages` (7 files, 295 insertions, 22 deletions). The tracked worktree is clean after commit; the task report remains in the ignored SDD workspace for controller review.

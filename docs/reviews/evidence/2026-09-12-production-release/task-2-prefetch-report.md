# Task 2 — optional prefetch response accounting

Base `e2f891a5f189bc9ead9cefa0491d2e7cb9eaa2b3`. Implementation is ready for independent review. No cloud/public-site calls, invocations, security changes, headers/configuration changes, frontend rebuild/deployment, producer changes or subagents.

The controller's private `reader-error-diagnosis.json` contains two 503 asset responses with request `sec-purpose: prefetch`, resource type `other`, and `cf-speculation-refused: prefetch refused: not eligible`. I read only that existing diagnostic and recorded a sanitized status/type/purpose/refusal summary, excluding URLs/bodies/other headers, in `evidence/task2-prefetch-scope.json`. The controller additionally observed a canceled optional fetch yielding 200/empty bytes. The old verifier indiscriminately hashed every same-origin `/_next/static/` response, confusing these optional future-navigation requests with reader execution. It also let any matching response, including a speculative-only fetch, satisfy expected-script accounting.

Primary source read: https://developers.cloudflare.com/speed/optimization/content/speed-brain/#how-speed-brain-works . Cloudflare documents the explicit prefetch request purpose and unsuccessful prefetch 503 response. No cloud account or production site was queried by this worker.

## Narrow correction

Inside the existing asset-response verification promise, inspect the request. Return without status/body/hash accounting **only if all are true**: method GET, resourceType `other`, not a navigation request, and `sec-purpose` (trimmed/case-normalized) exactly `prefetch`. No status code or Cloudflare response marker alone qualifies. Script/stylesheet requests cannot qualify even with a prefetch header. Absent/unrecognized purpose fails closed through the existing verification path. Skipped requests never enter the asset map and therefore cannot satisfy `expectedScripts`.

The existing status=200, size/path bound, exact SHA256, expected-script completeness, HTML byte equality, live/v1/v2 payload behavior, same-origin GET restriction and browser service-worker restriction remain unchanged. No UA/header override or Cloudflare feature toggle was added. The docs describe this precise boundary. The browser context's `newContext({serviceWorkers: 'block'})`, routes and ordinary navigation are unchanged.

## RED / GREEN

Tests extend the existing reader suite and use the unchanged actual local `out/stats.html` and its assets. A bounded test-only browser adapter forwards real page response events while supplying recorded metadata-shaped optional/error responses to the real verifier listener. It can hide one response from accounting to prove speculative-only coverage fails while the actual browser still loads/renders the checked reader. It does not modify browser headers, HTTP HTML bytes, application source or the production verifier interface. The optional empty body is a synthetic reproduction, not a claim of a live cancellation during this local run.

RED command:

```sh
PATH="/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH" \
 node --test --test-name-pattern='prefetch|speculative' scripts/tests/analytics-release.test.mjs
```

`evidence/task2-prefetch-red.log`: 3 selected tests, 1 pass/2 fail. The original verifier blocks a valid reader because of optional 503; the speculative-only expected-script test fails because the old verifier incorrectly accepts it. The protective script/stylesheet/unproven-other 503 test passes already. These are behavioral assertion failures, not setup failures.

GREEN command:

```sh
PATH="/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH" \
 node --test scripts/tests/analytics-release.test.mjs scripts/tests/workflow-pipelines.test.mjs
```

`evidence/task2-prefetch-green.log`: 15/15 pass, zero skips/failures, including real checked-reader live/v1/v2 rendering, stale HTML rejection, actual changed JS rejection, optional 503 and optional 200-empty exclusion, required script/stylesheet 503 rejection even with prefetch header, other-request 503 rejection without purpose, and speculative-only expected-script rejection. Existing release boundary/workflow checks pass. Local Chromium/server sockets required sandbox escalation; all test HTTP was loopback. No broader frontend/backend suites were run.

`node --check scripts/verify_public_stats_reader.mjs` passes (`evidence/task2-prefetch-syntax.log`, empty). `git diff --check` passes (`evidence/task2-prefetch-diff-check.log`, empty). `evidence/task2-prefetch-scope.json` records exact three changed paths/hashes, existing local stats HTML hash, sanitized controller diagnostic, and unchanged publisher/workflows/producer/lock. Root-owned untracked release/evidence files are untouched.

## Artifact and release boundary

This changes the verifier and its tests/documentation only. Deployed checked artifacts remain the controller-verified `e2f891a` artifacts from CI run `34679848934`; no new frontend publication is required. Tests reused the existing local export and record its stats HTML digest rather than claiming a new CI build. Root may run the reviewed corrected verifier against the existing exact checked/deployed artifact directory. Actual public success is still a controller-run check, not established by loopback tests. No status/byte error in actual script/stylesheet requests is waived, and optional requests cannot manufacture evidence that required code executed.

Self-review: the only executable production addition is the six-line request classification/early return before existing asset verification. No public script allow-list, response-header-only exemption, broad status suppression, browser/security changes, producer/frontend edit or deployment action. Missing-header uncertainty remains a failure rather than an inferred optional request. Independent scoped review remains required.

Final commit: `53a6749c8b326ec4387eb4d66e57618ea92c2895` — `fix: exclude optional prefetches from reader asset proof`. Final staged whitespace check passed. Packaged exact three-file review diff: `task-2-prefetch-review.diff` (base `e2f891a5f189bc9ead9cefa0491d2e7cb9eaa2b3`). No source changes after final checks. Ready for independent review.

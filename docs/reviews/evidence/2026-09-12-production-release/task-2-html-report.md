# Task 2 release blocker — HTML no-transform

Base: `867694c068fc8d72539250cd44ce7934667d02a9`. Local implementation/verification complete; independent review, actual new CI artifacts, controller publication/cache actions and public closure remain pending. No subagents, production queries/mutations, upload, invocation, frontend build, provider or producer change.

## Evidence and diagnosis

The controller's public release check found S3/CloudFront stats HTML matching the checked artifact while Cloudflare added 1305 bytes containing JavaScript Detections and an automatic Web Analytics beacon. This prevented the exact reader gate from passing and meant source-only absence of client analytics did not establish public absence. The live body comparison is controller evidence, not a new worker query.

I read the primary documentation:

- https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/#if-your-origin-sends-a-no-transform-header — origin `Cache-Control: no-transform` prevents JSD injection; the JSD result field is missing for these requests.
- https://developers.cloudflare.com/web-analytics/faq/#my-website-is-proxied-through-cloudflare-but-web-analytics-automatic-setup-is-not-working — the directive prevents automatic beacon modification/injection and its Web Analytics collection.

Those documentation reads were the only network reads by this implementation worker. No site/account query or setting change was made.

## Bounded correction

`scripts/publish_static_site.mjs` appends `, no-transform` to the existing cache directive only when the candidate extension is `.html`. It preserves existing cache classification/TTLs and manifest shape; normal HTML and `404.html` become `public, max-age=60, s-maxage=300, no-transform`. JS/CSS/images/fonts/PDF and other non-HTML assets retain their previous stable or immutable directives. Producer-owned `stats.json` remains excluded before metadata generation/publication. The uploader still revalidates the exact manifest before any AWS call, refreshes known candidate metadata even for unchanged bytes, stages hashes before HTML, and retains old hashes/unrelated objects. The exact public-reader verifier is unchanged.

The existing focused tests were extended instead of creating another publisher implementation or duplicating the full fixture machinery. Manifest checks cover all four HTML pages, stable image/PDF, hashed JS/CSS/image and font MIME. The real CLI subprocess with a local fake AWS executable checks the actual cache arguments for recovery `404.html` and full HTML publication, unchanged non-HTML policies, and existing stats/old-hash/unrelated ownership. Two small image fixture files provide representative stable/hashed media coverage. Upload ordering assertions now account for the fourth hashed fixture. No real AWS executable or credential path is used by these tests.

Delivery docs split the HTML cache row and explain RUM/JSD suppression, the missing JSD browser signal, preserved BIC/WAF/Bot Fight Mode zone settings, unchanged other-host/unrelated-media settings, and potential origin-encoding pass-through instead of intermediary HTML recompression. They do not claim all bot signals are unchanged. Analytics docs distinguish source absence from the observed proxy injection and link the correction. The existing plan has a bounded Task 2 blocker checklist. The root-owned untracked production-release report and controller ledger are untouched.

## RED → GREEN and commands

Executed from the existing worktree using Node 22.16.0:

```sh
PATH="/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH" \
  node --test scripts/tests/static-publication.test.mjs
PATH="/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH" \
  node --test scripts/tests/static-publication.test.mjs scripts/tests/workflow-pipelines.test.mjs
PATH="/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH" \
  node --check scripts/publish_static_site.mjs
git diff --check
```

- `evidence/task2-html-red.log`: original publisher, 7 tests: 5 pass/2 fail. Both manifest and actual CLI recovery upload fail because HTML metadata lacks no-transform. Product assertion failure, not setup/import failure.
- `evidence/task2-html-green.log`: corrected publisher, all 10 static-publication/workflow tests pass, zero skips/failures. This is the only combined covering run.
- `evidence/task2-html-syntax.log`: successful syntax check, empty output.
- `evidence/task2-html-diff-check.log`: successful whitespace check, empty output.
- `evidence/task2-html-scope.json`: exact five changed paths and their SHA256; unchanged exact public-reader gate, package builder, both workflows, provider lock and producer source; new relative documentation link/heading resolved. No frontend/producer/Terraform inputs changed. A comment-only wording clarification followed GREEN; executable code and test behavior remained identical.

No broader frontend/backend/build/TF suites were repeated because their inputs are unchanged. No new local export is presented as a CI release artifact. No artifact was published.

## Release boundary and self-review

Self-review confirmed the one metadata-expression change leaves non-HTML policies/ownership/deletion behavior intact. Existing checked manifests with old metadata do not match regenerated metadata and must not be hand-edited to bypass checking. Require independent acceptance and actual successful new GitHub CI artifacts plus their matching manifest before controller publication. The production reader still requires exact ordinary HTML/asset identity and supported payload behavior; it is not weakened to ignore injected bytes. After approved metadata upload and cache invalidation/purge, verify apex/www response directives and byte identity, absence of RUM/JSD scripts, actual encoding, and ordinary navigation. Existing browser caches/open tabs are not cleared by this local change. Until those checks occur, public remediation and analytics reader-before-producer gate remain open.

Final commit: `e2f891a5f189bc9ead9cefa0491d2e7cb9eaa2b3` — `fix: preserve checked HTML through proxy transformations`. Exactly the five authorized paths committed; staged whitespace check passed. Post-commit status contains only the pre-existing root-owned untracked production-release report, left untouched. No push/publication or new CI claim.

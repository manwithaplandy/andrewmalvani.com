# E4 implementation report

Status: local implementation DONE, pending independent task review. Base `796e7de`; final commit recorded below. Ruling19 permits this local preparation despite unknown Cloudflare settings. No cloud/account query, login/token retrieval, production upload, invocation, plan/apply, deployment, push/merge, automation or contact send occurred. F28 public freshness remains open.

## Implemented scope

- Two `aws_cloudfront_cache_policy.site` instances: stable default/max300s and immutable default/max31,536,000s, **both minimum0**. Default HTML/PDF/other stable paths and stats use stable policy; new `_next/static/*` behavior uses immutable policy. Both enable gzip/Brotli cache variants and eligible automatic compression. No cookie, arbitrary header or query cache-key dimensions; existing CORS origin-request policy remains. Query selection is removed only from static cache/origin selection, not browser URL/client navigation or E1 query-preserving redirects.
- Existing distribution/bucket/origin/resource identities, default S3 OAC, `allow-all`, aliases/certificate, security response policy, E1 exact function and status404/error10s mappings remain. The hash behavior has the same route function/security response/viewer policy. MinTTL0 avoids a year-long minimum overriding missing-hash recovery or explicit cache restrictions.
- `scripts/publish_static_site.mjs` replaces inline E1 reference checks and destructive `sync --delete` within the existing workflow. The version1 candidate manifest records key, byte count, SHA256, MIME, Cache-Control and resolved HTML/CSS static references. It requires nonempty index/graph/stats/404 pages with references, checks referenced assets, rejects symlinks/unsafe paths, and bounds entries/bytes/references/manifest size.
- Before each upload phase, the complete manifest is regenerated and compared to the downloaded candidate. Commands use argument arrays, with no shell interpolation. Actual `aws s3 cp` calls unconditionally refresh each candidate key's metadata even when content is unchanged. Recovery phase writes all candidate hashes then404; full phase independently orders all hashes before stable files. Failure stops further publication. No remote inventory, deletion, old-hash garbage collection, unrelated-object rewrite or frontend stats write exists. `stats.json` is excluded even if accidentally present in the export.
- Stable origin metadata is `public, max-age=60, s-maxage=300`; hashed metadata is `public, max-age=31536000, s-maxage=31536000, immutable`. MIME is explicit for HTML/CSS/JS/JSON/PDF/fonts/images and standard export files, with binary fallback.
- Lambda changes **one CacheControl argument only**, from max-age3600 to public/browser60/shared300. Ownership, payload fields, D2 checkpoint, D3 ledger/active guard/concurrency, and three-module package paths remain intact.
- Main workflow saves the candidate manifest, stages hashes/404 before apply, then full manifest publication after apply. Both D4 reader gates remain: producer creation/replacement proof before apply and ordinary code update after full publication/invalidation/public reader proof. E5 keeps responsibility for broader permissions, checked-build/artifact provenance, final archive, required checks and strict provider initialization.
- Delivery docs record source/metadata classes, bounded publication and partial-release limits, existing baseline, Cloudflare gate, expected plan and actual remaining release verification. Analytics docs label the99b0a4e D4 archive as historical pre-E4 bytes because this header changes the handler/archive digest.

## Decisions / boundaries raised to controller

The controller approved the bounded manifest/AWS CLI design and expressly required full-phase hash ordering independent of the recovery phase; the tests assert that ordering. Stable policy is reused for stats/default rather than adding a redundant identical policy. Both minima remain zero to preserve E1's short-error contract; no unknown SSL setting was guessed or modified.

A short primary-doc check inspected AWS custom-error caching semantics, not production resources. AWS documents error minimum10s, with origin error headers able to lengthen duration; docs preserve a real missing-stable/missing-hash release check rather than claiming compilation proves every CDN error lifetime. Sources: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-error-pages-expiration.html and https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesErrorPages.html . Cloudflare baseline/settings documentation was already supplied and was not rediscovered.

No new backup, garbage-collection or deployment framework was introduced. Bounds (10,000 directory entries,64MiB/file,256MiB total,50,000 references,1,024 ASCII key characters,8MiB manifest) fail closed; a future export beyond these documented limits needs review. The complete static tree is uploaded, while reference parsing covers HTML src/href/srcset and CSS url references; it does not claim exhaustive JavaScript execution. Candidate files must remain immutable during upload. Per-key stable publication is not atomic; the existing downstream reader gate prevents accepting a failed partial phase as a successful producer prerequisite.

## TDD evidence

New uploader tests first failed before implementation with the missing module. The first invocation accidentally selected ambient Node26; that exact diagnostic is preserved, then the intended Node22 command was run before implementation and also failed correctly:

```sh
env -u NO_COLOR PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH node --test scripts/tests/static-publication.test.mjs
```

RED logs: `evidence/e4-manifest-red.log` (ambient26) and `evidence/e4-manifest-red-node22.log` (Node22); expected ERR_MODULE_NOT_FOUND for absent publish_static_site module. Initial GREEN `evidence/e4-manifest-green.log`:5/5 passing.

The real handler's metadata test first failed on actual existing output:

```sh
.venv-stats/bin/python -m unittest discover -s tests/stats -p test_cache_metadata.py -v
```

`evidence/e4-producer-red.log`: `max-age=3600` differs from `public, max-age=60, s-maxage=300`. After the one-line producer change, `evidence/e4-producer-green.log`:1 test passed. It drives the actual handler with existing fake services/synthetic credentials/disabled real HTTP, wraps the actual put_object call, and asserts destination key, JSON type, header, schema2 and unchanged total10. No live invocation or credential discovery.

Self-review caught an E1 prerequisite regression in the initial generic manifest: empty404 could pass because other pages provided static references. Added a focused test before correcting it:

```sh
env -u NO_COLOR PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH node --test --test-name-pattern='empty recovery' scripts/tests/static-publication.test.mjs
```

`evidence/e4-empty-recovery-red.log`: Missing expected exception. Implemented per-required-page nonempty/reference checks. The next combined run revealed the old mutation test replaced HTML entirely and therefore hit the new missing-reference guard before its expected manifest-mismatch guard (`evidence/e4-manifest-guard-iteration.log`). The fixture now appends a comment to otherwise valid HTML, specifically exercising altered bytes without conflating malformed HTML/reference failures.

Final same Node22 full focused command: `evidence/e4-manifest-final.log`, **6 tests,6 pass,0 fail/skipped/cancelled**, ~0.74s. Coverage:

1. Actual manifest cache classes/MIME/digests/reference inclusion and stats exclusion.
2. Missing direct JS or transitive CSS font dependency fails.
3. Empty404 fails.
4. Forged/modified candidate manifests and symlinks reject before AWS work.
5. Actual CLI/subprocess argument path, using a local fake `aws` executable with isolated environment: unchanged bytes get new metadata, hashes precede stable files in both phases, old hashes/live stats/unrelated objects remain unchanged, MIME/cache headers match their classes.
6. Asset-upload failure stops before recovery HTML.

The fake command only supports candidate `s3 cp`; it rejects recursive/delete operations and never loads an SDK or accesses the network. Tests do not rely only on assertions about source strings.

## Final focused validation and persisted outputs

All logs were written to WS/evidence as commands ran, outside test-runner cleanup. No unchanged frontend, browser, analytics recovery or whole backend suite was repeated. No UI source changed; the existing verified `out` export was reused.

Actual final manifest command:

```sh
env -u NO_COLOR PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH node scripts/publish_static_site.mjs manifest --artifact-dir out --manifest .superpowers/sdd/2026-09-07-design-ux-remediation/evidence/e4-candidate-manifest.json
```

`evidence/e4-candidate-manifest-final.log`: **Verified54 candidate files and73 static references; stats.json excluded.** 39 hashed files,15 stable files,3,040,812 bytes. `evidence/e4-candidate-summary.json` records manifest SHA256 `5e13326eede717de03fe8abeadc4cd79543faeae507dc028ddc4231df677ef99` and module source digests. This is a local manifest, not deployed remote evidence or final E5 artifact provenance.

- `terraform -chdir=terraform fmt -check -no-color`: pass, empty `evidence/e4-terraform-fmt.log`.
- `terraform -chdir=terraform validate -no-color`: pass via existing backend-disabled cached providers (local provider IPC escalation only), exact `Success! The configuration is valid.` in `evidence/e4-terraform-validate.log`. No init/backend/state access or plan. Used provider versions and tracked lock unchanged; Ruling18's unused-null cleanup stays with E5.
- `/private/tmp/react-resume-actionlint-1.7.12/actionlint .github/workflows/main.yml`: pass, empty `evidence/e4-actionlint.log`.
- `git diff --check`: pass, empty `evidence/e4-diff-check.log`.
- `git diff --exit-code -- terraform/.terraform.lock.hcl`: pass, empty `evidence/e4-lock-check.log`.

New handler SHA256: `468c882dc2a1702955514b25c2592f72500bf9a443d56ab9342e43127e36dde5`. Unchanged payload SHA256 `a770481263ed87b94d82ba928f8a4b67790049b3c812b8b6a4ff11968b64467e`, ledger SHA256 `eb2488abd4b00fce1a2345005ab91d650f5de840c809f73354a02b2ee7622718`. No new final deployment zip was claimed; E5 owns creation/testing/digest of that exact checked archive. The D4 archive at99b0a4e remains preserved historical evidence.

## Self-review

Reviewed all changed source/config/workflow/test/docs. Corrected the empty recovery guard as documented above. Verified no --delete/sync or remote-list path remains in the frontend uploader, every known key gets metadata refresh, both independent upload phases enforce asset order, stats cannot be inserted through a forged manifest, and both reader gates retain their original conditional/dependency boundaries. Confirmed minimum TTL0 in both policies and existing error minimum10/status404 unchanged, working allow-all retained, and new behaviors use the existing S3 OAC/function/security policy. No retention/ledger/checkpoint/lock change. Documentation no longer describes the removed sync path or the D4 candidate as current.

No unresolved local correctness concern found. Independent review remains separate; this report is not an independent approval.

## Explicit unperformed release checks

- Authenticated Cloudflare SSL/proxy/cache-rule/Browser Cache TTL record and approved coordinated settings, including browser-header override behavior.
- Controller's consolidated real state-backed plan: expected E4 changes are two policy creations and in-place default/hashed behavior/compression changes; bucket/distribution/origin replacement, permission/retention/viewer-policy changes fail scope.
- E5 final checked website manifest/build provenance, three-module archive/tests/digest, strict provider initialization and broader CI integration.
- Approved publication/apply/invalidation or Cloudflare purge; metadata restoration/rollback evidence; D4 quiescence/backup prerequisites.
- Actual producer refresh adopting new stats metadata; frontend must not rewrite stats while waiting.
- Both-host ordinary repeat requests and controlled content/PDF/stat update with identity/header/Age/cache/compression checks, query-bearing navigation and missing stable/hash errors.
- Observed propagation/invalidation completion and existing-browser-cache limits. Public max-age14400/3600 pre-release metadata can outlive a purge in browsers. No60/300-second end-to-end guarantee, speedup or F28 live closure is claimed.

## Commit handoff

`06fda8b` — `perf: define cache behavior for static site assets` (8 files,393 insertions,30 deletions). Tracked worktree clean after commit. Local implementation DONE; independent review and the explicitly listed release/account/freshness gates remain pending.

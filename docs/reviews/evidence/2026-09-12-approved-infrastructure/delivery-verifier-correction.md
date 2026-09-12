# Delivery verifier correction — local implementation report

Ready for independent scoped review, then controller-owned network rerun. No production setting, website file, checked artifact, tracked source, browser identity, header, routing/cache configuration, or analytics state was changed by this worker.

## Observed cause and preserved evidence

The controller's first live run at 15:59:40–15:59:48 UTC performed 22 checks: 18 passed and four failed. Both public hosts returned the correct graph HTML and 308 redirect but ordered distinct query names as `tag=a&tag=b&view=list`. Both also returned the exact checked JS bytes as `text/javascript`, while the S3 manifest uses `application/javascript`. The two direct CloudFront repeated-GET check groups passed, including page/JS cache HIT and compressed JS. These are readings of the saved controller receipt, not new network observations.

The unchanged original receipt is preserved as `post-apply-delivery-verification-initial-failure.json`, SHA256 `a4193abf29ad666a833a0f05e3a8015915aef8f0dcf566385c849300359578e1`. The original helper, tests, and preparation report were also copied before correction. The original failed receipt is not relabeled as a pass; a corrected live result requires a separate controller run.

## Bounded corrections

- Redirect validation now compares the exact origin, pathname, hash and credentials, the exact decoded query-name set, and each name's complete ordered value array. Distinct names may reorder. Lost/added/renamed names, lost/changed/extra/reordered duplicate values, changed origin/path/hash and unexpected credentials still fail. Both the original 308 Location and the final browser response URL must satisfy the same boundary. Status 308 and the single original GET response remain mandatory.
- If the expected MIME is JavaScript, only `application/javascript` and `text/javascript` are interchangeable. Every other MIME category retains its previous exact base-type comparison. HTML, JSON, plain text, octet stream and legacy `application/x-javascript` are not admitted for expected JavaScript. Status, byte length, SHA256 and cache-policy checks are unchanged.

These corrections align with the requested parameter-preservation and executable-JavaScript contracts. The previous helper incorrectly required raw ordering of independent query names and one exact JavaScript spelling. They do not permit a changed page, missing parameter, swapped repeated value, or arbitrary executable response type.

## Verification and scope

- `delivery-helper-correction-red.log`: original logic, 5 groups, 3 pass/2 fail. The new positive cases fail specifically on observed query-name reordering and `text/javascript`.
- `delivery-helper-correction-green.log`: corrected logic, all 5 groups pass. Added negative cases exercise both Location and final response URL for missing/changed/reversed/extra values, lost/extra names, wrong host/path/trailing slash, credentials and fragment; MIME negatives remain strict. Existing body, cache, status, required repeated CloudFront HIT and compression tests pass unchanged.
- `delivery-helper-correction-prepared.json`: all 54 exact checked files validate locally. Node syntax check passes. No browser launch, socket or live request was run by this worker.
- `delivery-helper-correction.diff`: exact private helper/test correction relative to copies made before editing. `delivery-helper-correction-identity.json` pins those files and original receipt. No source-control mutation is involved.

The original preparation report's literal query-order and JavaScript-MIME assumptions are superseded only as described above. All transport limits, no-workaround rules, candidate identity, exact bytes, recovery/noindex, cache/compression requirements and the `--after-apply` latch remain unchanged. Root owns review acceptance and the actual rerun; this report claims local correction only.

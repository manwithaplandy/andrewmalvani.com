# Prepared backup helper — read-only review

Reviewed `/private/tmp/react-resume-release-20260911/prepare_backup.py` before execution. No backup, upload or other cloud mutation was performed by this review.

## Correction status — ready for controller review

The findings below were corrected in the private helper after controller authorization. The final helper:

- requires a `READY` gate less than five minutes old, with exact account/resource identities and the actual rule-disable/concurrency-zero times from `pause-state.json`;
- preserves/counts legacy marker TTLs, reports expired and next-hour expiry risk, rejects TTL on other record families, and emits a private schema failure report before `create_backup`;
- pins CI run 34676780236's exact manifest and archive/source-member identities (`d6c417…`, contact `4031b6…`, stats `b68c47…`);
- performs two equal full strong scans and exact public bytes/version/metadata checks before creating the native backup;
- repeats stable table/public/gate checks before durable upload, requires native backup `AVAILABLE`, verifies supported bucket access/encryption/versioning/lifecycle controls, and records version-specific byte/metadata SHA-256 readbacks;
- permits a confirmed absent bucket policy only with owner-only ACL and all four public-access-block settings; it does not infer privacy from a failed policy query.

Focused TDD evidence: the initial five cases failed because marker TTL, unknown/checkpoint, gate and archive behavior was absent. The final command `python3 /private/tmp/react-resume-release-20260911/test_prepare_backup.py -v` passed 7/7 cases, including the actual downloaded CI archives. `python3 -m py_compile` passed for both private helpers. No capture/upload phase was run.

Use `/Users/andrew/.pyenv/versions/3.11.7/bin/python3`, which has boto3 1.34.59; the default system Python does not include boto3.

## Must correct before capture

1. `summarize()` rejects `expires_at` on every row. That conflicts with `terraform/main.tf`, which enables TTL specifically for legacy `marker#` rows, and with the runbook requirement to preserve every legacy marker. This assertion runs after `create_backup`, so the helper can create a native backup and then fail on an expected legacy record. Permit and record the existing marker expiry field; require no TTL on v2 ledger/active/source/aggregate records. Run all read-only validation before `create_backup` where possible.
2. The helper checks only `pause-state.json.backupReadyAfter`, current rule state and current concurrency. It does not require or archive a fresh `READY` gate showing clean post-disable EventBridge/Lambda/DynamoDB metrics. Bind capture to the exact gate summary/digest and freeze timestamps; fail if it is absent, not `READY`, stale, or uses different identities.
3. `total == daily == pages == public total` treats page equality as a source invariant. The producer increments total/daily for every accepted document request but adds a page counter only when the normalized page label passes its grammar. The contractual invariant is `total == sum(daily)` and `sum(page) <= total`. Equality may be retained as an explicit known-baseline pin only if the current quiesced read actually establishes it.

## Must correct before durable upload

4. The upload phase can wait for the native backup and then upload an older capture without a fresh gate or stable scan. Reconfirm the same rule/concurrency/freeze identities, obtain a new `READY` metric gate, and compare a fresh strong scan with the captured canonical bytes before upload. Any drift invalidates the checkpoint.
5. Candidate archives and `manifest.json` are copied without validating manifest-to-file names, sizes, hashes or ZIP member sets. Require the exact checked CI artifact identity and verify the manifest against both archives before preserving them.
6. The backend bucket check covers versioning, all four public-access-block booleans and default AES256 encryption, but does not inspect bucket-policy public status/access scope or lifecycle applicability to the release prefix. Verify and record those controls before choosing it as the durable recovery location.
7. The second `stats.json` read compares bytes and VersionId but not the saved content/cache/encryption metadata. Require the selected metadata to remain equal during the capture and record an explicit digest of the versioned readback.

## Record-family validation still needed

- The complete scan correctly preserves all rows, and the second deterministic strong scan is a useful stable-read check. The summary does not identify unknown families or validate source/checkpoint, cursor, legacy-marker and ledger/active schemas. Apply `/private/tmp/react-resume-release-20260911/analytics-snapshot-checklist.md` and preserve a compact, nonsecret family-validation result beside the raw snapshot.
- `families = Counter(k.split('#')[0] …)` cannot distinguish exact singleton keys or malformed variants. Classify exact and prefix families deliberately, list unknown keys by a non-sensitive hash/count if the IDs themselves are sensitive, and fail pending review rather than silently labeling the capture `legacyBaseline=true`.
- `no logv2#/active` is an appropriate expected pre-migration gate for this release. Record any deviation and stop; after ledger-era writes begin the old one-file package is investigation-only.

## Behaviors that are sound

- Full table scans use `ConsistentRead=true`, paginate, reject duplicate IDs, sort by ID and compare deterministic bytes.
- The all-row gzip snapshot is deterministic and preserves the full low-level item representation.
- The deployed Lambda archive is fetched privately and its SHA-256 is checked against `Configuration.CodeSha256`.
- Durable uploads use explicit per-object version IDs, AES256, local SHA-256 metadata and byte-for-byte versioned readback. Extend the receipt to assert returned metadata/digest and make repeated upload attempts fail closed rather than producing another version unintentionally.
- Upload waits for the native DynamoDB backup to become `AVAILABLE`; keep the runbook caveat that this status alone does not prove application consistency or restore behavior.

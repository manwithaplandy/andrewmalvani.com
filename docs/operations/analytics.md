# Analytics operations

The static `/stats` reader supports legacy payloads and schema version 2. Version 2 keeps every legacy field and adds independent CloudFront/Cloudflare status, day-precision coverage and success dates, and exactly 30 daily observations ending yesterday. `uniqueVisitors` remains a sum of daily unique visits; countries count zone requests, not people or homepage requests. Coverage is the range of stored measurement dates, not a completeness guarantee.

Absent observations are null/missing. A stored numeric zero is measured; yesterday is provisional. Legacy `dailySeries` contains numeric available observations only. Public lists retain the threshold of five for named buckets, aggregate remaining valid buckets into Other, and contain at most five names plus Other. Counts are bounded at one billion. Existing page/domain/IP and uppercase two-letter country validation remain in place. No new identifiers, tracking, raw request records or finer-than-day public timestamps are introduced.

Source records use the existing table under `source#cloudfront` and `source#cloudflare`; daily Cloudflare items remain `cf#daily#YYYY-MM-DD`. A successful refresh records its own date and actual stored coverage. Failure retains prior success and coverage and becomes stale if measurements remain, otherwise unavailable. Legacy measurements have no recoverable success timestamp: they stay stale with a null success date until successful refresh. The reader preserves these measurements and shows “Last successful update: Unavailable”; a current source with a null success date is rejected as unavailable. A successful publication is not proof both sources are fresh.

Cloudflare configuration, token retrieval, HTTP, API, malformed/empty response and daily-write errors are handled as one source outcome. Valid CloudFront aggregates can publish before an error is raised for a configured Cloudflare failure. Fully absent optional Cloudflare configuration is visible without a recurring alarm; partial configuration is an error. Responses are fully validated before any daily write. Storage failure after some daily writes can leave partial stored rows; publication continues using the last accepted bounded Cloudflare checkpoint, so those rows cannot silently change the failed source’s public measurements, availability or coverage. CloudFront truncation/object errors also prevent its success date advancing. Metadata/scan/publication failures may prevent publication entirely: the Lambda error alarm does not promise partial publication for those failures.

## Accepted Cloudflare checkpoint

The internal `source#cloudflare` record adds `checkpointVersion` (DynamoDB N, currently 1) and `publicProjection` (JSON string containing only bounded `uniqueVisitors` and privacy-filtered `countries`). The five source metadata attributes and that projection are accepted in one item write. These internal fields never enter the public schema. The record represents the last accepted dataset; a failed attempt presents its status as stale/unavailable without advancing the stored accepted success date.

Before the first new daily write, seed this checkpoint from the existing legacy aggregate baseline. An existing record with neither checkpoint field is legacy; once either field is present, missing/malformed/unknown-version checkpoint content fails closed as unavailable, never falling back to partial daily rows. Do not delete checkpoint markers or independently edit their metadata/projection. Complete deletion of a checkpoint is indistinguishable from legacy storage and is not a supported recovery action. Future migrations must preserve this record or explicitly migrate its version and bounded projection.

Only a complete daily refresh accepts a replacement checkpoint. If its write throws, publish the previous consistent dataset and raise; do not roll back the checkpoint, because an uncertain response may already have committed. The next strongly consistent read observes either the old checkpoint or the complete new one with its matching metadata. Failure to establish the initial checkpoint aborts before any daily writes and may prevent publication, as the storage-failure alarm caveat describes. Daily history is neither erased nor rolled back.

## Local verification

Use Python 3.12 and a fresh environment, independent of an AWS login:

```sh
python3 -m venv .venv-stats
PIP_NO_CACHE_DIR=true .venv-stats/bin/python -m pip install -r tests/requirements.txt
PIP_NO_CACHE_DIR=true .venv-stats/bin/python -m pip check
.venv-stats/bin/python -m unittest discover -s tests/stats -p 'test_*.py' -v
STATS_TEST_PYTHON="$PWD/.venv-stats/bin/python" yarn playwright test tests/unit/statsPayload.spec.ts tests/e2e/stats-producer.spec.ts --project=chromium
```

The tests set synthetic credentials/region, disable metadata lookup, point shared config files at the null device, and replace SDK clients before import/execution. All service responses are in-memory; the browser intercepts stats and blocks external traffic. The exporter in `tests/stats/export_fixture.py` executes the actual handler against fakes for current, stale legacy and zero scenarios; its JSON is normalized and rendered by the actual reader. No Lambda invocation or public request is part of this check.

`scripts/package_release_artifacts.py` is the only archive producer. It creates a deterministic one-file contact archive and a three-file analytics archive containing exactly `lambda_function.py`, `ledger.py` and `payload.py`, plus a digest manifest. The archive tests inspect those generated bytes, import both extracted handlers and run the recovery matrix against the extracted analytics package using dummy clients. Terraform keeps its existing bootstrap filenames but no longer has `archive_file` generators; the release workflow copies the checked bytes to those paths before plan/apply and passes the same archives to code update. Run the reusable checks workflow for Terraform formatting/backend-disabled validation, actionlint, the build and type/lint/browser/backend/release suites. A state-backed plan and real CI runs remain separate release evidence.

## Durable ingestion and publication

`apply_log_counts(client, table_name, log_key, payload_digest, counts, remaining_ms)` verifies SHA-256 of sorted compact UTF-8 JSON counts. Input identity is SHA-256 of the bucket-qualified object key. Sanitized counters are sorted into deterministic chunks of at most 90 keys. Each transaction contains those counter ADDs and one conditional chunk record, at most 91 distinct actions. `logv2#<hash>#chunk#<index>` stores the payload/chunk digests, counter count, total chunk count and format version; `logv2#<hash>#complete` is conditionally written only after all chunk proofs match. Records contain no raw object keys, request details or count mappings and have no TTL.

The durable `ingestion#active` guard stores the expected hashed completion record before any chunk writes. It is preserved after completion and can be replaced only after strongly verifying the previous completion. Before normal listing progress, unresolved active input is located by streaming the log-prefix listing and comparing bucket-key hashes. This lets it resume even if a newly arrived earlier key would otherwise block it. No cursor advances during that lookup, and ordinary ordered processing still handles earlier new inputs. If the active object disappears through retention/deletion, or its sanitized content changes, publication remains blocked pending evidence-backed recovery. Do not delete this guard or reconstruct totals automatically. Preserve it with chunk/completion records, source checkpoints and aggregates in backups and migrations.

Every durable proof is read strongly consistently. Failed or uncertain transaction/record responses count as success only when an exact matching committed record is read; otherwise errors propagate. Replays outside a request-token window remain safe because this protocol relies on durable conditional records, not short-lived token deduplication. Invalid counts/keys/digests fail before writes. Counter keys are at most 1024 UTF-8 bytes and input counts are nonnegative integers below 10^38; aggregate overflow remains a service error. Counter/record item serialization is checked against a conservative 350,000-byte ceiling, transaction request serialization against 3,500,000 bytes, and action count against 100. Tiny fixed-shape id/count items and at most 91 actions also keep aggregate transaction item size below 4 MB. Oversized referrer hosts are dropped during sanitization instead of blocking an otherwise valid input.

The orchestrator parses one complete input before applying counts. Empty/header-only inputs are completed but establish no measured day. A complete valid dated record establishes a real daily observation, including zero when no document request passes filtering. No new legacy markers are created; existing marker# inputs are skipped without reparsing or replay, preserving the historical baseline.

Budget exhaustion raises `IngestionIncomplete` inside the ledger. The orchestrator preserves the last public payload and returns `truncated: true`, retaining completed-input cursor progress for the next scheduled invocation. Service failures propagate for normal error/retry handling. Publication waits for a full ingestion pass, even when interruption occurred between completed inputs. This deliberately trades freshness during catch-up for aligned totals, observations and coverage; it does not advance either source's success metadata or touch the Cloudflare checkpoint during an incomplete CloudFront pass. The existing reader ages the last good payload. A missing active input raises an error and holds publication until explicit evidence-backed recovery.

The cursor is monotonic and advances only after matching durable completion or a preserved legacy marker. Its rewind is based on the saved object-key date, not wall-clock time. The active guard independently prevents skipped partial input even if S3 no longer lists it. Publication checks the guard once more and scans only required metric/source families with `ConsistentRead: true`. The configured reserved concurrency is 1; these consistency assumptions also require that no other process writes aggregates. Multi-item Scan is not a transactional snapshot.

Existing table-scoped GetItem/PutItem/UpdateItem grants authorize the read/transaction operations. There is no separate TransactWriteItems IAM permission and no new DeleteItem requirement. Expected Terraform scope is an in-place reserved-concurrency change to 1 and updated local archive content; no table replacement, resource rename, IAM expansion or data reset. The controller's consolidated real state-backed plan is a separate gate.

Monitor table growth and scan cost as durable records accumulate. Filtering keeps ledger rows out of returned metric memory but does not reduce the underlying Scan read work. Recovery lookup can scan the log-prefix listing while searching for a hashed active input. A different storage layout or record-retention policy requires measured evidence; do not expire the new ledger/guard merely because raw-log retention is finite.

## Release dependencies and recovery boundaries

Publish the compatible reader before any v2 producer. The workflow's code-update job depends on `verify-analytics-reader`, which follows website publication and CloudFront invalidation. The gate verifies ordinary public HTML and loaded assets against the downloaded candidate, then exercises the live payload and synthetic v1/v2 responses in that actual reader. Initial creation/replacement of `aws_lambda_function.stats_aggregator` embeds the producer during Terraform apply, so plan inspection requires the same public gate **before apply** on that branch. An unrecognized plan fails closed. No upload, cache invalidation or production invocation is performed by the verifier itself.

Preserve the existing historical aggregate baseline and legacy markers. Never erase counts or automatically replay marked objects to repair uncertain history. New inputs use the durable ingestion protocol described above; this does not reconcile uncertain counts from historical marker-first processing. D4 owns reviewed migration/release checks, including verification of the existing daily schedule and the configured single-writer limit. Keep these later gates before production use of the combined remediation. A failed refresh can be retried by existing scheduling, but an uncertain transaction outcome must never be treated as proof it did not commit.

## Migration preparation record — September 8, 2026

This is a locally prepared release procedure, not a record of deployment. The D1 reader, D2 producer/checkpoint and D3 recovery protocol have local test evidence and task review. The production checks below remain open until an approved release records their results. Do not close F10–F13 live behavior from source inspection, local tests or this document.

The secured read-only preflight found the following relationships. The producer remained active and the separate scans/listings were not simultaneous; these are diagnostic observations, not a quiesced cutover backup or a transactional snapshot.

| Evidence | Observed baseline | Interpretation |
| --- | --- | --- |
| Known-family table export, 09:07 UTC | 59,207 items; total, sum of daily counts, sum of page counts and public total each 57,535 | No discrepancy in these relationships at preflight; historical marker-first loss is still possible |
| Document days | 869 stored days, April 2, 2024–September 7, 2026; 20 absent dates in the 889-day span | Stored coverage bounds; missing rows do not establish zero |
| Cloudflare days | 102 days, May 29–September 7, 2026; daily-unique sum 37,253, matching public payload | Daily sum, not distinct people across the period; no recoverable legacy success date |
| Other aggregates | Country request sum 450,316; referrer request sum 1,062 | Different scope/units and filtered subsets, not values expected to equal document requests |
| Log version metadata, 09:35 UTC | 11,902 current keys; 3,216 additional keys only in noncurrent versions | Metadata availability, not verified content integrity or safe replay |
| Legacy marker comparison | Of 58,187 markers: 11,853 current matches, 3,216 noncurrent-only matches, 43,118 with no listed version | Exact reconstruction from listed inputs is unavailable for that last group; external backups were not inspected |

The listing covered 15,118 object versions and 9,643 delete markers. Current key dates span June 9–September 8; all listed version key dates span May 9–September 8. The 49 current keys absent from the earlier marker export do not establish an ingestion defect because the writer was active between observations. No log bodies were read, restored or replayed. Do not claim permanent global loss from an S3 listing alone. Any proposed historical correction needs a separate owner-reviewed artifact identifying supported before/after relationships and uncertainty; this rollout makes none.

Read-only configuration confirms 90-day current-object expiration and expiration 30 days after a version becomes noncurrent for the log prefixes. Those clocks have different origins; this is not a single 90-day total-retention promise or an audit of physical deletion. Keep the existing retention policy unchanged in this migration.

The deployed baseline was `statsAggregator`, Python 3.12, `lambda_function.lambda_handler`, with no reserved concurrency. Rule `stats-aggregator-daily` was enabled at `cron(0 0 * * ? *)` with one matching target. The privately preserved old archive is 6,761 bytes, contains only `lambda_function.py`, and has SHA-256 `e3f30b13d0335aa5d898d2c21f71ef9153d769f96e07510e9be137f2254eee51`, matching the deployed code digest. It is for investigation, **not a safe rollback after ledger writes**.

The D4 local review archive uses producer source commit `99b0a4e`. Its three members are exactly `lambda_function.py`, `payload.py`, `ledger.py`; SHA-256 is `10696a55066614b49ea6f216865cff0c9b3e0faf1d8d23f6d286e5922824c82a` (13,521 bytes). This deterministic local archive was not deployed. E4 subsequently changed the stats Cache-Control header, so this digest identifies historical pre-E4 bytes. E5's deterministic packager and reusable verification now define the candidate archive; the specific checked workflow run, commit, manifest digest and deployment outcome must still be recorded in the final release record. A local archive digest or source-equivalent reconstruction is not a GitHub/deployment result.

The local E5 full check at `3408657` produced `stats-aggregator.zip` (40,351 bytes), SHA256 `b68c47a7774b1d575b910a60d7ceded54cf9d2b9a398334f00476113cbc945ca`, and `contact-lambda.zip` (4,277 bytes), SHA256 `3998f18a127c13ab8292af7100ab5fc36e84c5a069c2b9b16e7b0d7da3b80ce3`. The source/package inputs remain unchanged through E5 fix `7eb35b4` and E6's frontend-only reflow correction. These are **locally checked candidates**, not artifacts from an executed GitHub release. See the [manifest](../reviews/remediation-evidence/2026-09-07-design-ux-remediation/evidence/e5-release-artifact-manifest.json), [E5 report](../reviews/remediation-evidence/2026-09-07-design-ux-remediation/task-E5-report.md) and [read-only plan review](../reviews/remediation-evidence/2026-09-07-design-ux-remediation/terraform-final-read-only-plan-report.md). A later authorized release must record its own checked run identity and revalidate deployed state.

## Approved-release gates

The following commands describe future release work. They have **not** been executed as part of this migration preparation. Use the established authorized AWS environment and keep private outputs out of CI logs and source. Stop on a failed gate; do not rename resources, discard processing records, or substitute fabricated history to proceed.

1. **Approve the concrete release record and plan.** Record the consumer and producer commits, checked website artifact, checked three-module archive and SHA-256, real state-backed Terraform plan and its digest, private backup destination, invoker inventory, quiescence evidence and rollback operator. Expected analytics infrastructure change is reserved concurrency 1 and the three-module package, with no table replacement, resource rename, new collection, historical rewrite or IAM expansion. Inspect the consolidated plan for other tasks' intended changes. E1 must upload and verify the checked `404.html` before applying its CloudFront error policy. E5 must retain both reader prerequisites while consolidating artifact provenance and testing; the current gate alone does not prove the downloaded build was the final checked E5 artifact.

2. **Establish a proven no-writer window before backup or configuration apply.** The qualifying daily schedule may use the [conditional short handover](#conditional-short-stopteststart-handover) below instead of the generic rollout ordering; that alternative forbids Terraform during the stopped interval. Freeze deployment jobs and every other aggregate writer/invoker; disable `stats-aggregator-daily` and prevent new event admission through the agreed release procedure. Record the effective freeze time and evidence, rather than equating an API success with immediate propagation. Wait for in-flight executions, upstream delivery/retry and Lambda internal async work to resolve or expire, then establish there are no remaining writers. Setting reserved concurrency to zero is a temporary execution stop, not evidence that all queues are empty. Applying Terraform's desired concurrency 1 can reopen execution of the still-old code before the later code-update job; therefore this proof must precede apply and remain valid until the checked new package is installed. Do not add temporary Terraform flags or change resource identities to evade that boundary.

   The September 8 read-only preflight found no `$LATEST` EventInvokeConfig and no target RetryPolicy or DeadLetterConfig override. AWS defaults allow Lambda async event age up to 21,600 seconds with two function-error retries, and EventBridge delivery up to 86,400 seconds with up to 185 retries. Disabling a rule has an unspecified short propagation delay. These defaults are not proof that a particular event has drained: a conservative time argument must start after a **proven effective admission freeze**, cover both sequential queues plus the verified maximum running duration, and include every other invoker. New async events at concurrency zero go directly to a configured failure destination/DLQ without retries; do not assume they all enter a six-hour queue. Revalidate effective settings and destinations at release. If admission/queued work cannot be bounded or excluded with evidence, quiescence is an explicit unmet release gate and backup/apply must wait. See [Lambda settings](https://docs.aws.amazon.com/lambda/latest/api/API_PutFunctionEventInvokeConfig.html), [EventBridge retries](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-retry-policy.html), [DisableRule propagation](https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_DisableRule.html), and [zero-concurrency async handling](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html).

3. **Create and validate a durable, quiesced recovery checkpoint.** The existing private temporary preflight files are not durable backups. Proposed release storage is an on-demand DynamoDB backup plus a private, access-restricted release prefix outside the website bucket, for example `s3://mostly-upward-lion-log-bucket/analytics-release-backups/<release-id>/`. Before using that proposed location, verify encryption, access restrictions, retention/lifecycle applicability and recovery access; it has not been created or validated for this purpose. Record its resolved URI and the table backup ARN/status in the release manifest. A suitable approved command is:

   ```sh
   umask 077
   aws dynamodb create-backup --table-name mostly-upward-lion-data-table \
     --backup-name "analytics-cutover-$RELEASE_ID" > "$PRIVATE_RELEASE_DIR/table-backup.json"
   # Record the returned ARN; require describe-backup to report AVAILABLE.
   ```

   Re-export aggregate and processing records with strongly consistent reads after quiescence. Include `total#views`, `daily#`, `page#`, `referrer#`, `cf#daily#`, all `marker#`, `cursor#cloudfront-logs`, both `source#` records including the complete accepted Cloudflare checkpoint, all `logv2#` chunk/completion proofs, and `ingestion#active`. The full table backup is preferred as the preservation boundary; a family export is supplemental inspection evidence, never a reason to omit future record formats. Preserve the current public `stats.json` bytes, content/cache metadata and code package privately, with SHA-256 manifests, at the durable destination. Read back/verify the backups and compare total/day/page/public relationships, source coverage, active/completion consistency and record counts against the quiesced export. Repeat stable reads as corroboration, not as a substitute for writer exclusion. DynamoDB backups/exports can contain part of a recent transaction while changes propagate: explicitly verify the recovery checkpoint against settled application-level proofs; an AVAILABLE backup alone is insufficient. See [transaction propagation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html). No cutover backup, durable upload or restore validation is claimed here.

4. **Publish and verify the compatible reader before the producer.** Preserve the existing public payload. The ordinary update workflow publishes the same-run `out` artifact, requests CloudFront invalidation, and gates code update on:

   ```sh
   node scripts/verify_public_stats_reader.mjs --artifact-dir out \
     --origin https://andrewmalvani.com --origin https://www.andrewmalvani.com \
     --report public-reader-verification.json
   ```

   Archive the successful report with the consumer commit and candidate artifact manifest. It records HTML/loaded-asset digests, observed cache headers, time and live/v1/v2 checks, without publishing synthetic data. It verifies daily-unique wording, legacy uncertainty, source-specific v2 coverage, yesterday's provisional observation, absence of today and accurate privacy text. The live payload must already be HTTP 200 and supported. On first infrastructure creation/replacement the same check runs before apply; if the site or `stats.json` does not exist, a separately reviewed staged bootstrap is required. It must establish an evidence-backed initial dataset or a separately verified reader empty-state contract; **do not manufacture a zero historical payload to satisfy this gate**. The current gate intentionally blocks that unsupported bootstrap case.

   Exact ordinary HTML and executable asset identity must match the candidate. Stale edge caches, HTML rewriting or asset minification may intentionally block the gate until the cache/transform settings and candidate are coordinated. Do not replace this with a cache-busting query or successful upload assertion. It observes apex and www from the runner, not every CDN point of presence, already-open tabs or all existing browser caches. Record these limits and E4's approved cache-metadata/invalidation procedure; the compatible legacy fields remain necessary even after the gate passes.

5. **Apply reviewed prerequisites and install the checked producer with admission still frozen.** The bootstrap gate precedes create/replace; the public reader job precedes ordinary code updates. Confirm the deployed package digest matches the checked artifact, recovered archive imports resolve all three modules, runtime/handler remain correct, reserved concurrency is 1, and effective table-scoped GetItem/PutItem/UpdateItem permissions cover the transactions. There is no fictitious `TransactWriteItems` IAM action. Confirm no unexpected schedule admission or other writer resumed during apply. Keep the legacy baseline and every checkpoint/proof; do not replay legacy-marked logs.

6. **Run a controlled invocation and verify its publication boundary.** After approval, use the established deployment environment and keep invocation outputs private:

   ```sh
   aws lambda invoke --function-name statsAggregator --invocation-type RequestResponse \
     --payload '{}' --cli-binary-format raw-in-base64-out \
     "$PRIVATE_RELEASE_DIR/invoke-response.json" > "$PRIVATE_RELEASE_DIR/invoke-metadata.json"
   ```

   Inspect both transport metadata (`FunctionError`) and returned handler outcome, aggregate-only diagnostics, and public result. A 200 Invoke API response is not proof of successful processing. A truncated pass must preserve the last-good public payload and source dates; completion may require subsequent controlled invocations. A configured Cloudflare failure can publish independently valid CloudFront data and then raise; check the accepted Cloudflare projection/coverage/success date remains internally consistent and stale/unavailable, rather than calling both sources current. For successful completion, compare total/day/page relationships, privacy-filtered bounds, exact source dates/scope, 30 daily observations ending yesterday, null missing days and genuine observed zeros. Verify active input matches completion and chunk proofs before accepting publication. Record source dates actually observed, not hoped-for dates.

   Invoke again only as an approved controlled verification, using no synthetic production traffic or induced failure. Confirm no duplicate counts for already completed inputs and no new legacy markers. If upstream logs arrive between invocations, explain any delta with completed-input/aggregate evidence; identical totals are expected only when the input set is unchanged. Preserve the new proofs and accepted checkpoint for both runs. Re-run the ordinary public reader gate against the actual v2 payload and inspect the public consumer's displayed measurements/coverage. None of these live invocations or confirmations has occurred yet.

7. **Resume and observe scheduling.** Re-enable the existing daily rule only after the above checks pass and the no-writer restriction can safely end. Record its effective state/target and the next expected 00:00 UTC execution. Observe the next actual scheduled completion and public consumer: fresh source dates when that source succeeds, honest stale/unavailable status otherwise, and no current-day zero plunge. Record publication time, source coverage/success dates and consistent totals. This next-run observation remains pending; create a reminder/automation only if the owner requests one.

## Conditional short stop/test/start handover

This independently reviewed alternative uses the successful daily-delivery
record to exclude an outstanding upstream retry backlog, then waits out the
last Lambda async admission. It is an **operational inference with fail-closed
conditions**, not an AWS queue-empty guarantee or a generic five-minute pause.
It does not relax the backup, compatible reader, ledger/checkpoint preservation,
controlled/repeated verification, or scheduled-observation requirements above.
The September 12 read-only review observed one unqualified midnight-UTC target,
only `$LATEST`, no aliases/numbered versions, eight successful daily deliveries
and no retry/failure evidence. Refresh those facts; historical observations do
not authorize a later stop by themselves. No step below is claimed executed.

1. Record the release ID, exact checked website/producer digests, current Lambda
   revision/digest, and recovery operator. Freeze deployment jobs and obtain
   explicit holds from every manual/identity-policy invoker. Refresh more than
   24 hours of EventBridge `InvocationAttempts`, `SuccessfulInvocationAttempts`,
   `RetryInvocationAttempts`, `FailedInvocations` and Lambda `AsyncEventsReceived`,
   `Invocations`, `Errors`, `Throttles`, `AsyncEventsDropped`,
   `ConcurrentExecutions`. Require the expected successful latest daily run and
   no retry, failed delivery, unexplained admission or other invoker. Ambiguous or delayed evidence, or missing necessary delivery evidence,
   blocks the short route.
2. Disable `stats-aggregator-daily` well away from 00:00 UTC. Repeatedly read back
   `DISABLED`, allow five minutes of propagation observation, and require no new
   EventBridge attempt/retry or Lambda async receipt/invocation. Disable before
   setting concurrency zero: otherwise a delivery during propagation can create
   an upstream retry backlog. AWS specifies a short propagation delay without
   an exact SLA; five minutes is the reviewed operational margin, not a service
   guarantee. See [DisableRule](https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_DisableRule.html).
3. Set reserved concurrency to 0 and read back 0. Backup readiness is the later
   of that observation plus the full configured timeout (currently 300 seconds)
   and the latest `AsyncEventsReceived` timestamp plus the current maximum async
   age (six hours), **then at least one minute of metric-publication margin**.
   Continue observing no invocation/concurrency/error/throttle or unaccounted
   DynamoDB write activity, with all holds active. Revalidate timeout/async age;
   use any longer effective setting. An already-running execution is not
   canceled by concurrency zero. For a last admission at 00:00 UTC, the reviewed
   illustrative earliest point was about 06:05 UTC if all other checks had
   completed; recompute from actual evidence rather than reusing that time.
4. Create the on-demand DynamoDB backup and wait for `AVAILABLE`. Preserve the
   strongly consistent complete record-family export, prior public `stats.json`
   bytes/metadata/version, old investigation package and exact new package,
   including hashes and readback verification required above. Use the approved
   private encrypted, versioned release prefix outside the served website; the
   September 12 choice is in the existing private Terraform backend bucket,
   superseding the earlier proposed log-bucket example. Revalidate access,
   versioning, encryption, lifecycle and recovery controls. Preserve all source
   checkpoints, `ingestion#active`, chunk/completion proofs, cursors, markers and
   counters. `AVAILABLE` alone does not establish application consistency.
5. Publish the exact checked reader, invalidate through the reviewed path, and
   pass the public reader verifier on apex and `www` against the real existing
   legacy payload and synthetic v1/v2 contracts. With the rule disabled and
   concurrency still 0, install the checked producer using its recorded
   revision guard. Wait for `State=Active` and `LastUpdateStatus=Successful`;
   verify deployed CodeSha256/size, runtime, handler, role, environment and
   concurrency. Do not assume a pre-update queued event will rebind to new
   `$LATEST` code: AWS does not guarantee that. The gate requires newly initiated
   controlled work after the verified update, with prior admissions aged out.
6. **Do not run Terraform during this stopped interval.** The pinned AWS 5.50
   provider preserves the refreshed state of this existing rule when both
   `state` and `is_enabled` are omitted. The September 12 paused-state plan
   confirmed a rule no-op with `state=DISABLED` and `is_enabled=false`; do not
   infer that result from the latest registry text or reuse it without a fresh
   state-backed plan. The same paused plan changed reserved concurrency from 0
   to 1, which would reopen execution of the old producer if applied before the
   checked package is installed. Set reserved concurrency directly to 1 and
   confirm it while the rule remains disabled. Watch the first several minutes
   for an unexpected async invocation before issuing the approved synchronous
   controlled test.
   If one appears, stop and investigate. Verify handler and transport success,
   code digest, source/checkpoint/active-completion consistency, truthful public
   v2 measurements and no current-day false zero. After the first settles, run
   the approved repeat and require no duplicate input effects. Verify the real
   public v2 reader again.
7. Enable the daily rule, read back `ENABLED`, confirm its target and next
   00:00 UTC expectation, and monitor for unexpected retries. Only when the
   schedule is enabled and concurrency is 1 again, create a fresh refreshed
   Terraform plan. Reject schedule/concurrency rollback, checked-code overwrite,
   or any unreviewed analytics action. Apply only the accepted reconciliation
   and recheck rule/target/concurrency/digest. If Terraform must precede testing,
   install and verify the checked producer first while concurrency remains 0,
   then require a fresh reviewed plan that keeps the rule disabled and changes
   no unapproved admission/code boundary. Do not use `-target`, ignore drift,
   or race a re-disable after apply. The pinned behavior is visible in the
   provider's [`state`/`is_enabled` schema and diff suppression](https://github.com/hashicorp/terraform-provider-aws/blob/v5.50.0/internal/service/events/rule.go#L83-L136).
   The latest registry's creation-default wording is not a substitute for the
   actual refreshed plan. Observe the next actual scheduled completion and
   public reader before claiming full handover.

Any late upstream retry, async receipt, invocation, unaccounted write, newly
found invoker, failed update, backup inconsistency, or unexpected event after
restoring concurrency invalidates the short-path premise. Stop for investigation
or use the full effective admission/retention bound above; never infer that
queued old work is safe because the new ledger tolerates duplicates. Preserve
the ledger-aware recovery path below. The six-hour admission bound and timeout
are distinct from the chosen propagation/observation margins. Relevant AWS
boundaries are [async handling](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html),
[update states](https://docs.aws.amazon.com/lambda/latest/dg/functions-states.html),
[async retries](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html),
and [concurrency metrics](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-concurrency.html).

## Rollback and release closure

On a failed release, pause new admissions and establish the same proven no-writer window before recovery. Preserve all counters, legacy markers, source metadata/accepted Cloudflare projection, active guard, cursor and chunk/completion proofs, including records created after cutover. Do not reset the table or restore an older table snapshot over new ledger-era counts. A pre-cutover backup supports investigation and evidence-backed recovery planning; it is not permission to erase legitimate subsequent writes.

If necessary, restore only the privately preserved last-good public payload through the approved S3/cache-metadata procedure and approved invalidation/purge, recording its digest and historical observation date. That restores display availability, not ingestion freshness. The reader will age its source status. Keep ingestion paused, repair forward, or deploy a tested version that understands the existing ledger, active guard and source checkpoint. The old marker-first one-file package can duplicate or lose counts against new processing state and must not be re-enabled as a rollback. Missing active input or mismatched proofs require evidence-backed recovery; do not delete the guard, invent completion, reset counts or blanket replay history.

| Finding scope | Local status | Required live closure evidence |
| --- | --- | --- |
| F10 measurement labels | Reader/producer contract tests and independent task reviews recorded | Compatible public v1 reader before release; actual v2 consumer with daily sums and zone/document scopes distinguished |
| F11 incomplete-day decline | Daily observation/reader checks recorded | Actual public observations end yesterday, provisional/missing states remain visible and today creates no false zero |
| F12 missing/stale source data | Source-failure and reader contract tests recorded | Observed independent source coverage/success dates and truthful absence/staleness in the public consumer |
| F13 interrupted aggregation | Durable ledger/orchestrator recovery matrix and independent task review recorded | Quiesced backup; checked package/configuration; controlled completion and repeat without duplicate input effects; preservation of historical baseline/proofs |
| Scheduled operation | Procedure prepared only | Next real scheduled update and public consumer evidence after approved release |

Attach the final checked consumer/producer commits and artifact digests, resolved durable backup locations, quiescence proof, actual source coverage dates, controlled/repeated invocation results, next-schedule observation and explicit finding closure decisions to the release record. Until those checks occur, operational verification remains open.

# Analytics Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish understandable metrics that distinguish measurement units and freshness and survive processing interruptions without losing or duplicating new observations.

**Architecture:** Deploy a backward-compatible reader first, then enrich the existing static payload with source metadata and explicit daily observations. Keep the existing historical aggregate baseline. Replace early processing claims with bounded atomic counter batches and durable completion records; publish only after the current ingestion pass reaches a consistent boundary.

**Tech Stack:** React/TypeScript static client, Python 3.12, boto3, DynamoDB transactions, S3, Cloudflare daily analytics, Terraform and the existing Lambda deployment job. Playwright Test supplies client/unit checks; Python unittest supplies backend checks.

**Spec:** [Quality report](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07.md), F10–F14. [Master plan](/Users/andrew/Scripts/react-resume/docs/superpowers/plans/2026-09-07-design-ux-remediation.md).

## Global Constraints

- “Data absence and staleness remain visible; successful updates from one source do not imply that all sources are current.”
- Preserve the existing historical baseline; do not erase counts or replay legacy-marked objects automatically.
- Continue publishing anonymous aggregates only. Keep domain/IP filtering, ISO country validation, bounded public arrays/counts, and the small-bucket threshold of 5.
- Public dates remain UTC calendar days, not per-event timestamps. Do not store raw request details in the new ledger.
- No client-side tracking, additional collection service or per-person identifier is introduced.
- New producer output must remain parseable by old readers during rollout. Readers must support both payload versions.
- Never mark a whole input complete before its counter effects are durably recorded. An uncertain response is not proof that a transaction did not commit.
- Fix implementations are omitted; contracts, fixtures, test cases and rollout actions are explicit.

---

## File map

| Responsibility | Files |
|---|---|
| Public data contract | Modify [dataDef](/Users/andrew/Scripts/react-resume/src/data/dataDef.ts:55); create `/Users/andrew/Scripts/react-resume/src/utils/statsPayload.ts` |
| Data loading and presentation | Modify [useStats](/Users/andrew/Scripts/react-resume/src/hooks/useStats.ts:1), [stats page](/Users/andrew/Scripts/react-resume/src/pages/stats.tsx:1), [StatCard](/Users/andrew/Scripts/react-resume/src/components/Sections/Stats/StatCard.tsx:1), [Sparkline](/Users/andrew/Scripts/react-resume/src/components/Sections/Stats/Sparkline.tsx:1), [BarList](/Users/andrew/Scripts/react-resume/src/components/Sections/Stats/BarList.tsx:1) |
| Producer and recovery | Modify [Lambda](/Users/andrew/Scripts/react-resume/stats_aggregator/lambda_function.py:1); create `/Users/andrew/Scripts/react-resume/stats_aggregator/payload.py` and `/Users/andrew/Scripts/react-resume/stats_aggregator/ledger.py` |
| Deployment integration | Modify [stats Terraform](/Users/andrew/Scripts/react-resume/terraform/statsLambda.tf:1) and [workflow](/Users/andrew/Scripts/react-resume/.github/workflows/main.yml:1); D owns these stats-specific changes before E4 cache metadata and E5 CI integration |
| Tests and evidence | Create `/Users/andrew/Scripts/react-resume/tests/unit/statsPayload.spec.ts`, `/Users/andrew/Scripts/react-resume/tests/e2e/stats.spec.ts`, `/Users/andrew/Scripts/react-resume/tests/fixtures/stats-v1.json`, `/Users/andrew/Scripts/react-resume/tests/fixtures/stats-v2-current.json`, `/Users/andrew/Scripts/react-resume/tests/stats/test_payload.py`, `/Users/andrew/Scripts/react-resume/tests/stats/test_source_failures.py`, `/Users/andrew/Scripts/react-resume/tests/stats/test_ledger.py`, `/Users/andrew/Scripts/react-resume/tests/stats/fakes.py`, `/Users/andrew/Scripts/react-resume/tests/requirements.txt` |
| Operations record | Create `/Users/andrew/Scripts/react-resume/docs/operations/analytics.md` |

## Shared contract: version 2 and normalized client model

The new producer retains every current top-level field with its current JSON type: `totalViews`, `uniqueVisitors`, `lastUpdated`, `since`, `dailySeries`, `topPages`, `topReferrers`, and `countries`. In particular, the legacy `uniqueVisitors` field continues carrying the sum of daily uniques; the new UI gives it a truthful name. It must not be silently redefined as deduplicated people.

Add these exact fields:

| Field/type | Contract |
|---|---|
| `schemaVersion: 2` | Declares the enriched format. Unknown later versions must not be guessed as v2. |
| `sources.cloudfront: StatsSource` | Metadata for filtered document requests observed in CloudFront logs. |
| `sources.cloudflare: StatsSource` | Metadata for Cloudflare zone requests and summed daily uniques. |
| `StatsSource.status` | `'current' \| 'stale' \| 'unavailable' \| 'unknown'`; `unknown` is reserved for adapting legacy input. |
| `StatsSource.since`, `.through`, `.lastSuccessfulUpdate` | Valid UTC `YYYY-MM-DD` strings or null. Period bounds describe observed coverage, not guaranteed complete delivery. |
| `StatsSource.scope` | `'site-document-requests'` for CloudFront or `'zone-requests'` for Cloudflare. Do not label zone-wide metrics as homepage-only metrics. |
| `dailyObservations: StatsObservation[]` | Exactly 30 calendar days from today minus 30 through yesterday in producer output; client accepts up to 30 sorted, unique days. |
| `StatsObservation` | `{date: string; views: number \| null; status: 'observed' \| 'provisional' \| 'missing'}`. Null means missing, never zero. Yesterday is provisional if a value exists. Older supplied counts are observed, not a promise that late logs can never arrive. |

Client normalization lives in `src/utils/statsPayload.ts` and exports `normalizeStatsPayload(raw: unknown, today: string): StatsViewModel | null`. `today` is an explicit UTC day so stale-data tests are deterministic. `StatsViewModel` has exactly `generatedOn: string`, `documentRequests: number | null`, `dailyUniqueVisits: number | null`, `documentSource: StatsSource`, `edgeSource: StatsSource`, `observations: StatsObservation[]`, and the three existing lists `topPages`, `topReferrers`, `countries`.

Normalization rules:

- Validate real calendar dates, unique ascending observations, finite nonnegative counts and existing label restrictions. Preserve genuine zero when source metadata establishes availability. Invalid optional measurements become unavailable, not fabricated zero; invalid overall structure returns null.
- Adapt v1’s `totalViews` as document requests and `uniqueVisitors` as summed daily unique visits. Its source freshness is unknown; the Cloudflare period is unknown. A legacy zero unique count is unavailable because its meaning cannot be distinguished from missing configuration. Do not invent historical collection bounds.
- Convert legacy zero daily points into missing observations where zero cannot be distinguished from absence; omit today and future days. Keep supplied positive earlier observations. Explain legacy uncertainty in the display.
- Even if a stored v2 status says current, render it stale when `today - lastSuccessfulUpdate` exceeds two UTC days. A stopped producer must not leave a permanently fresh-looking page.

## Task D1: Ship a truthful reader before changing the producer

**Findings:** Frontend portions of F10–F12 and F14. **Dependency:** A1. This task can ship with the old producer.

**Files:** Client files, two JSON fixtures, unit/client tests from the map.

**Interfaces:** Implements `StatsSource`, `StatsObservation`, `StatsViewModel` and `normalizeStatsPayload` above. `useStats` success carries `StatsViewModel`. Change `StatCard` to accept a nullable displayed value plus explicit unavailable text; do not change unrelated general `Stat` consumers just to permit null. Sparkline accepts `StatsObservation[]` and does not connect missing points as zero.

- [ ] **Step 1: Create a small legacy fixture.** Include two daily unique visits in `uniqueVisitors: 2`, `totalViews: 10`, `lastUpdated: '2026-09-08'`, `since: '2026-09-01'`, positive September 6 views, zero September 7 views, zero September 8 views, and country requests US=12. Use only synthetic domains such as `example.com`. Include every existing top-level field.
- [ ] **Step 2: Create the v2-current fixture.** Retain those legacy fields, add schemaVersion 2, set both source statuses current with success date September 8; CloudFront coverage September 1–7, Cloudflare coverage September 2–7. Set September 6 observed views 10 and September 7 provisional views 0. Use the exact contract field names above. The v2 source establishes that zero is a measurement, unlike the ambiguous legacy fixture.
- [ ] **Step 3: Add deterministic normalization tests.** Include this core example, then tests for zero/missing distinctions, malformed dates, duplicate dates, unknown version, invalid labels, and stale aging:

```ts
import {test, expect} from '@playwright/test';
import legacy from '../fixtures/stats-v1.json';
import current from '../fixtures/stats-v2-current.json';
import {normalizeStatsPayload} from '../../src/utils/statsPayload';

test('legacy uniques are relabeled without inventing coverage', () => {
  const model = normalizeStatsPayload(legacy, '2026-09-08');
  expect(model?.dailyUniqueVisits).toBe(2);
  expect(model?.edgeSource.since).toBeNull();
  expect(model?.observations.some(point => point.date === '2026-09-08')).toBe(false);
});

test('a frozen payload eventually looks stale', () => {
  const model = normalizeStatsPayload(current, '2026-09-12');
  expect(model?.edgeSource.status).toBe('stale');
  expect(model?.documentSource.status).toBe('stale');
});
```

- [ ] **Step 4: Run the failing unit cases.** Run `yarn playwright test tests/unit/statsPayload.spec.ts --project=chromium` with A1’s existing export available. Initially expect the missing normalizer or incorrect adaptation assertions, not a fixture parsing error.
- [ ] **Step 5: Implement the client contract and loading states.** Move sanitization into the focused utility, adapt v1/v2 to the view model, and retain bounded lists/privacy rules. Remove the blanket rule that zero page views hides all statistics; valid zero is useful data. Preserve page-level loading/error/retry states and add a 10-second fetch timeout with cancellation on retry/unmount.
- [ ] **Step 6: Make measurement meanings explicit.** Use visible labels `Observed document requests`, `Daily unique visits (sum)`, and `Requests by country`. Explain that a person can count on several days, countries count requests across the measured zone, and document logs omit some client-side transitions. Show separate periods/freshness for the two sources; unavailable means unavailable, not zero.
- [ ] **Step 7: Make the chart interpretable.** Display dates and a text-accessible list/table of daily values in a native disclosure. Show provisional values distinctly and gaps as gaps. Exclude the current day. Show “No observations available for this period” when every value is missing; do not draw a flat zero line. Do not imply that all 30 days are complete merely because the job ran.
- [ ] **Step 8: Correct privacy copy.** State that the page publishes anonymous aggregates without a client-side tracking script, while operational access logs are retained. Explain the configured current-object 90-day expiration and separate version policy with a link to methodology. Avoid “No personal data” and avoid claiming raw logs were independently audited. Keep implementation detail in the methodology section, not card labels.
- [ ] **Step 9: Test presentation with intercepted payloads.** In `stats.spec.ts`, fulfill `/stats.json` with each fixture plus missing-source and malformed variants. Verify labels, separate periods, stale/unavailable text, valid zero, chart disclosure, error Retry and 320-pixel reflow. No public endpoint is mutated.
- [ ] **Step 10: Build, run focused suites/typechecks/lint and commit** as `fix: present analytics units and freshness honestly`. Deploy this reader before D2 output; it must work correctly with the current v1 file.

## Task D2: Publish source freshness and explicit daily observations

**Findings:** Producer portions of F10–F12. **Dependency:** D1 reader prepared; release order remains reader before producer.

**Files:** Lambda, new payload module, stats Terraform/workflow packaging, backend payload/source-failure tests, test requirements and analytics operations record.

**Interfaces:**

- `payload.py` exports `render_payload(items: list[dict], today: date, source_status: dict[str, dict]) -> dict`. `items` is the existing low-level DynamoDB aggregate representation; `source_status` provides the two `StatsSource` records. Output follows the v2 contract and retains legacy fields.
- The orchestrator persists day-precision source metadata under `source#cloudfront` and `source#cloudflare`. `lastSuccessfulUpdate` advances only after that source succeeds; a failed source retains its previous success/coverage and becomes stale, or unavailable without prior measurements.
- Existing daily Cloudflare items remain `cf#daily#YYYY-MM-DD`; summed uniques stay a sum. The query’s current zone scope is explicitly declared, not silently narrowed or relabeled.

- [ ] **Step 1: Establish isolated Python testing.** Use a fresh virtual environment, install boto3 for local tests, freeze that environment’s dependencies to `tests/requirements.txt`, and ignore the local environment directory. Use unittest rather than adding another test framework. Set dummy region/credentials and disable metadata lookup before importing the Lambda in tests; replace clients before exercising any orchestration.
- [ ] **Step 2: Add exact source/period test cases.** `test_payload.py` supplies low-level items for one visitor on each of two days and asserts the sum is two, country requests retain their own units, and the period starts from actual stored source dates. Assert 30 observation dates ending yesterday, no today value, null for absent days and provisional yesterday. A supplied daily item with numeric zero remains a real observed zero.

```python
from datetime import date
import unittest

from stats_aggregator.payload import render_payload


class PayloadTests(unittest.TestCase):
    def test_absent_observations_do_not_become_zero_traffic(self):
        sources = {
            "cloudfront": {
                "status": "unavailable", "since": None, "through": None,
                "lastSuccessfulUpdate": None, "scope": "site-document-requests",
            },
            "cloudflare": {
                "status": "unavailable", "since": None, "through": None,
                "lastSuccessfulUpdate": None, "scope": "zone-requests",
            },
        }
        result = render_payload([], date(2026, 9, 8), sources)
        observations = result["dailyObservations"]
        self.assertEqual(len(observations), 30)
        self.assertEqual(observations[0]["date"], "2026-08-09")
        self.assertEqual(observations[-1]["date"], "2026-09-07")
        self.assertTrue(all(point["views"] is None for point in observations))
        self.assertTrue(all(point["status"] == "missing" for point in observations))
        self.assertEqual(result["schemaVersion"], 2)
```

The pure payload module must be importable without creating AWS clients. Keep network-client creation confined to the existing orchestrator.

- [ ] **Step 3: Add source-failure tests.** In `test_source_failures.py`, simulate absent Cloudflare configuration, denied token read, HTTP timeout, API errors, empty usable results, and recovery. Existing CloudFront output must remain publishable on those Cloudflare failures with truthful source state. Test that source success does not advance on a failed query and that a genuinely fresh zero is distinct from absence.
- [ ] **Step 4: Run `python -m unittest discover -s tests/stats -p 'test_*.py' -v`.** Confirm assertions fail against existing behavior, with no AWS network calls or credential discovery.
- [ ] **Step 5: Implement payload construction and source bookkeeping.** Move pure rendering into `payload.py`. Preserve real coverage bounds and source-specific success dates; include only dates before today in observations. Mark missing dates null, yesterday provisional when measured, and older measurements observed. Keep the legacy dailySeries numeric for compatibility, derived from available observations only; the new reader uses dailyObservations.
- [ ] **Step 6: Make all Cloudflare failure boundaries recoverable.** Cover configuration, token retrieval, transport, API errors and parsing within the same source outcome. Publish CloudFront-derived data with stale/unavailable Cloudflare metadata, then preserve a clear alarm outcome when a configured source fails. Update the existing alarm description so it no longer promises partial publication after every possible kind of failure.
- [ ] **Step 7: Package the new module everywhere.** Update the Terraform bootstrap archive to contain `lambda_function.py` and `payload.py`, and the workflow’s bootstrap/code-update zip creation to include the same explicit files. Keep tests, local environments and caches out of the archive. Verify archive members and that importing the handler from an extracted archive succeeds with dummy clients.
- [ ] **Step 8: Verify compatibility and commit.** Run backend tests, the D1 client tests against generated v2 JSON, build/typechecks/lint, and Terraform formatting/validation using the existing provider lock. Commit as `feat: publish source-aware analytics observations`. Do not publish the producer ahead of the compatible reader.

## Task D3: Make new input processing recoverable and replay-safe

**Findings:** F13. **Dependency:** D2. This task also owns stats packaging/IAM changes before E4 adjusts upload metadata and E5 edits general CI.

**Files:** New ledger module, Lambda, stats Terraform/workflow, fake-service and ledger tests, analytics operations record.

**Interfaces:**

- `ledger.py` exports `apply_log_counts(client, table_name: str, log_key: str, payload_digest: str, counts: dict[str, int], remaining_ms: Callable[[], int]) -> bool`. Return true for newly completed input, false for already completed input. Raise on unresolved interruption, inconsistent input content or service failure; do not convert those into successful completion.
- Export `IngestionIncomplete` for remaining-budget exhaustion. Only the orchestrator interprets it, by preserving the last good public payload and retrying on a later invocation.
- Log identity is a SHA-256 of bucket-qualified object key; counts are already sanitized aggregate counters. Store a digest of the sorted counts and deterministic chunks of at most 90 distinct counter keys. Chunk records use `logv2#<identity>#chunk#<index>`; the final record is `logv2#<identity>#complete`. The bracket notation describes generated identifiers, not literal placeholder values.
- `log_key` is the complete bucket-qualified key. `payload_digest` is SHA-256 of UTF-8 JSON for the sanitized count mapping with sorted keys and compact separators, so the same observations produce the same digest across retries. The ledger verifies this value before applying counts.
- Each transaction updates that chunk’s counters and creates its chunk record conditionally in the same transaction. Store chunk digest and count for verification; do not rely solely on DynamoDB’s short-lived request-token deduplication. New completion/chunk records have no TTL until a separate evidence-backed retention policy can prove input cannot recur.
- Treat existing `marker#` inputs as legacy completed inputs and never replay them automatically. Advance the listing cursor only beyond complete inputs. Set Lambda reserved concurrency to 1 to keep publication from racing a second writer.

- [ ] **Step 1: Add an atomic fake and request-shape checks.** `fakes.py` stages a transaction and commits all its actions together, can fail before commit, and can commit then simulate a lost response. It records requests for assertions. Test the application’s calls and outcomes, not merely the fake’s own behavior; use boto3/botocore validation to check actual transaction request shapes.

Define the test-only `AtomicDynamo(fail_once_after_commits: int | None = None)` adapter with the boto3 low-level `get_item`, `put_item` and `transact_write_items` methods used by the ledger. Its configured failure raises `TimeoutError` once, before the transaction following that many successful commits; `aggregate_counts() -> dict[str, int]` exposes aggregate values only. Add a separate commit-then-lost-response mode for the uncertainty case. This adapter must honor conditions and atomic writes rather than blindly return success.

```python
import hashlib
import json
import unittest

from stats_aggregator.ledger import apply_log_counts
from fakes import AtomicDynamo


class LedgerTests(unittest.TestCase):
    def test_retry_after_one_chunk_matches_one_complete_processing(self):
        counts = {f"page#/synthetic-{index}": 1 for index in range(181)}
        counts.update({"total#views": 181, "daily#2026-09-07": 181})
        digest = hashlib.sha256(json.dumps(
            counts, sort_keys=True, separators=(",", ":"),
        ).encode("utf-8")).hexdigest()
        client = AtomicDynamo(fail_once_after_commits=1)
        args = (client, "test-stats", "test-logs/cloudfront-logs/synthetic.gz",
                digest, counts, lambda: 120_000)
        with self.assertRaises(TimeoutError):
            apply_log_counts(*args)
        self.assertTrue(apply_log_counts(*args))
        self.assertEqual(client.aggregate_counts(), counts)
        self.assertFalse(apply_log_counts(*args))
        self.assertEqual(client.aggregate_counts(), counts)
```

`unittest discover -s tests/stats` places that start directory on the import path for `from fakes import AtomicDynamo`. Retain the separate real-orchestrator test below; the helper test alone cannot catch premature public output.

- [ ] **Step 2: Add the recovery matrix.** In `test_ledger.py`, exercise normal processing, replay, failure before any transaction, failure between chunks, committed transaction with lost response, final-completion-record failure, insufficient remaining time, changed digest for the same input, legacy marker, and more than 180 distinct counters. After each retriable failure, rerun the same input and require final totals equal exactly one uninterrupted processing.
- [ ] **Step 3: Assert publication boundaries.** Drive the real orchestrator with fake services: if an input remains partly applied, no new `stats.json` may be written and the cursor must not skip that input. After successful retry, publish once with matching total/day/page counts. Marked zero-view days should be represented as measured zero only when input actually established that observation.
- [ ] **Step 4: Run the backend suite and confirm the current failure.** The original marker-first behavior must fail the interrupted-write case. Do not mark the regression satisfied by only testing the proposed helper outside its orchestrator.
- [ ] **Step 5: Implement bounded atomic counter application.** Parse and aggregate one input before any completion decision; sort keys deterministically; verify existing chunk records with strongly consistent reads. For a transaction failure/uncertain response, recognize success only from a matching committed record; otherwise propagate and retry later. Reject a changed digest instead of counting a modified input as another visit set.
- [ ] **Step 6: Complete and publish only at consistent boundaries.** Write the final completion record after every chunk is verified. A failure or low budget inside an input leaves no public update and no advanced cursor. Stopping between completed inputs may publish with CloudFront marked stale/catching up if more work remains. Read aggregate pages with `ConsistentRead: true` after ingestion writes complete; combined with reserved concurrency 1 and no other aggregate writers, this prevents eventual-read lag from publishing mismatched totals. Test a fake that exposes stale values to ordinary reads to catch this regression. Keep only required aggregate families in the publication scan; do not accumulate ledger records in memory as if they were metrics. A scan filter does not avoid reading ledger items: record table/scan growth, and consider a later storage-layout change only if measurements justify it.
- [ ] **Step 7: Update packaging and concurrency; verify existing permissions.** Add `ledger.py` to both bootstrap and update archives and set reserved concurrency to 1. Verify the role's existing table-scoped `PutItem`, `UpdateItem` and `GetItem` grants against the actual calls: [transaction IAM permissions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis-iam.html) follow those underlying operations. Do not invent a separate `dynamodb:TransactWriteItems` IAM action or broaden access when the current grants suffice. [AWS’s transaction reference](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html) limits one transaction to 100 actions/4 MB and gives request tokens a 10-minute window; the 90-counter-plus-record design stays below the action limit and durable records cover later retries. Check byte size before submitting as well.
- [ ] **Step 8: Verify the extracted deployment artifact.** Run all recovery tests against modules imported from an extracted zip, using fake services. Inspect a Terraform plan for only expected permission/concurrency changes; no table replacement, data reset or resource renaming is acceptable.
- [ ] **Step 9: Commit** as `fix: make analytics ingestion recoverable across interruptions`. Keep historical reconciliation and production cutover separate in D4.

## Task D4: Roll out the reader, producer and ledger without losing history

**Findings:** Completes F10–F13 operational verification. **Dependencies:** D1–D3 verified; coordinate cache metadata with E4 and release mechanics with E5.

**Files:** Update `/Users/andrew/Scripts/react-resume/docs/operations/analytics.md`; modify release configuration only if needed to preserve the ordering already specified. No blanket data rewrite.

**Interfaces:** Consumes the v2 reader, packaged producer, transaction-capable IAM, single-writer configuration and existing production counts. Produces a release record containing commit/package digest, prior payload backup location, safe rollback boundary, source coverage dates, and a finding closure decision.

- [ ] **Step 1: Record the historical baseline privately.** Save the current public payload and a secured backup/export of aggregate counters and processing metadata using existing authorized account access. Do not commit raw logs, credentials or full table exports. Compare total/day/page relationships and record discrepancies already present before the change.
- [ ] **Step 2: Reconcile only what evidence supports.** Determine which original logs still exist. Document that expired inputs cannot be reconstructed exactly. Keep legacy totals intact; if corrections to them are proposed, produce a separate before/after reconciliation artifact for owner review instead of silently adjusting them in this rollout.
- [ ] **Step 3: Deploy the compatible reader first.** Verify it against the still-existing v1 payload in production: daily-unique sum label, unknown coverage, no current-day plunge and accurate privacy text. Record the consumer commit before publishing v2.
- [ ] **Step 4: Apply the reviewed prerequisite configuration and new package.** Confirm archive membership, transaction permissions and reserved concurrency before invoking the new producer. Keep a copy of the old package for investigation, but do not treat it as a safe post-ledger rollback: old code does not understand new completion records.
- [ ] **Step 5: Verify a controlled processing run.** Run the producer through the established deployment process, inspect its aggregate-only diagnostics, and verify source-specific dates plus stable repeated invocation. Confirm new records prevent duplicate counts and public totals remain consistent after the run. Do not induce an outage or write synthetic visitor events into production.
- [ ] **Step 6: Define the safe rollback action.** If the new producer fails after ledger writes begin, pause its schedule/invocations and restore the previous public payload if necessary while preserving the ledger and counts. Repair forward or deploy a version that understands the ledger. Re-enabling marker-first code against the same inputs is not an acceptable rollback.
- [ ] **Step 7: Observe the next scheduled update.** Verify it arrives with expected source dates and no false current-day zero. Use a scheduled follow-up only if the user requests one; otherwise record the exact remaining observation rather than claiming it occurred.
- [ ] **Step 8: Commit the release record** as `docs: record analytics migration and historical limits`. Close code-level findings with their passing tests; close live behavior only after the corresponding production checks are actually complete.

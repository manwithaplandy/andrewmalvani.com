## Task 13: D3 — Make new input processing recoverable and replay-safe

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




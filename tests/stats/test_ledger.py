"""Recovery matrix for durable, bucket-qualified counter application."""
import hashlib
import json
import unittest
from unittest.mock import patch

try:  # The identical suite also runs against the extracted flat deployment.
    import ledger
except ModuleNotFoundError:
    from stats_aggregator import ledger
from fakes import AtomicDynamo


def digest(counts):
    return hashlib.sha256(json.dumps(counts, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


class LedgerTests(unittest.TestCase):
    def setUp(self):
        self.counts = {f'page#/synthetic-{index}': 1 for index in range(181)}
        self.counts.update({'total#views': 181, 'daily#2026-09-07': 181})
        self.key = 'test-logs/cloudfront-logs/synthetic.gz'

    def apply(self, client, counts=None, remaining=lambda: 120_000, key=None):
        counts = self.counts if counts is None else counts
        return ledger.apply_log_counts(client, 'test-stats', key or self.key, digest(counts), counts, remaining)

    def assert_recovery(self, client):
        self.assertTrue(self.apply(client))
        self.assertEqual(client.aggregate_counts(), self.counts)
        self.assertFalse(self.apply(client))
        self.assertEqual(client.aggregate_counts(), self.counts)
        records = {key: item for key, item in client.items.items() if key.startswith('logv2#')}
        identity = hashlib.sha256(self.key.encode()).hexdigest()
        self.assertEqual(set(records), {f'logv2#{identity}#chunk#{i}' for i in range(3)} | {f'logv2#{identity}#complete'})
        self.assertTrue(all('expires_at' not in item and 'ttl' not in item for item in records.values()))
        self.assertNotIn(self.key, json.dumps(records))
        reads = [request for name, request in client.requests if name == 'GetItem']
        self.assertTrue(all(request['ConsistentRead'] for request in reads))
        transactions = [request for name, request in client.requests if name == 'TransactWriteItems']
        self.assertTrue(all(len(request['TransactItems']) <= 91 for request in transactions))
        self.assertTrue(all(len(json.dumps(request).encode()) < 4_000_000 for request in transactions))

    def test_normal_processing_and_replay_more_than_180_counters(self):
        self.assert_recovery(AtomicDynamo())

    def test_failure_before_any_commit_then_exact_recovery(self):
        client = AtomicDynamo(fail_once_after_commits=0)
        with self.assertRaises(TimeoutError):
            self.apply(client)
        self.assertEqual(client.aggregate_counts(), {})
        self.assert_recovery(client)

    def test_failure_between_chunks_then_exact_recovery(self):
        client = AtomicDynamo(fail_once_after_commits=1)
        with self.assertRaises(TimeoutError):
            self.apply(client)
        self.assertEqual(len(client.aggregate_counts()), 90)
        self.assert_recovery(client)

    def test_committed_chunk_with_lost_response_is_verified_without_double_add(self):
        self.assert_recovery(AtomicDynamo(lose_response_after_commits=1, ordinary_reads_stale=True))

    def test_completion_record_before_commit_failure_then_recovery(self):
        client = AtomicDynamo()
        client.fail_complete_once = True
        with self.assertRaises(TimeoutError):
            self.apply(client)
        self.assertEqual(client.aggregate_counts(), self.counts)
        self.assert_recovery(client)

    def test_completion_commit_with_lost_response_is_verified(self):
        client = AtomicDynamo(ordinary_reads_stale=True)
        client.lose_complete_response = True
        self.assert_recovery(client)

    def test_budget_exhaustion_before_or_inside_input_preserves_recovery(self):
        for after_commits in [0, 1, 3]:
            with self.subTest(after_commits=after_commits):
                client = AtomicDynamo()
                with self.assertRaises(ledger.IngestionIncomplete):
                    self.apply(client, remaining=lambda: 0 if client.commits >= after_commits else 120_000)
                self.assertFalse(any(key.endswith('#complete') for key in client.items))
                self.assert_recovery(client)

    def test_changed_mapping_rejected_after_partial_or_complete_input(self):
        for complete in [False, True]:
            with self.subTest(complete=complete):
                client = AtomicDynamo(fail_once_after_commits=None if complete else 1)
                if complete:
                    self.apply(client)
                else:
                    with self.assertRaises(TimeoutError):
                        self.apply(client)
                prior = client.aggregate_counts()
                changed = {**self.counts, 'total#views': 999}
                with self.assertRaises(ValueError):
                    self.apply(client, changed)
                self.assertEqual(client.aggregate_counts(), prior)

    def test_supplied_digest_is_verified_before_any_write(self):
        client = AtomicDynamo()
        with self.assertRaises(ValueError):
            ledger.apply_log_counts(client, 'test-stats', self.key, '0' * 64, self.counts, lambda: 120_000)
        self.assertEqual(client.requests, [])

    def test_legacy_marker_is_never_replayed(self):
        client = AtomicDynamo(items=[{'id': {'S': 'marker#cloudfront-logs/synthetic.gz'}}])
        self.assertFalse(self.apply(client))
        self.assertEqual(client.aggregate_counts(), {})
        self.assertFalse(any(name in ['PutItem', 'TransactWriteItems'] for name, _ in client.requests))

    def test_bucket_is_part_of_identity_and_empty_input_has_durable_completion(self):
        client = AtomicDynamo()
        self.assertTrue(self.apply(client, {}))
        self.assertFalse(self.apply(client, {}))
        self.assertTrue(self.apply(client, {}, key='other-logs/cloudfront-logs/synthetic.gz'))
        self.assertEqual(sum(key.endswith('#complete') for key in client.items), 2)

    def test_counter_key_number_and_request_bounds_rejected_before_writes(self):
        for counts in [{'source#cloudflare': 1}, {'page#/' + 'x'*2048: 1}, {'total#views': -1},
                       {'total#views': True}, {'total#views': 1.5}, {'total#views': 10**38}]:
            with self.subTest(counts=counts):
                client = AtomicDynamo()
                with self.assertRaises(ValueError):
                    self.apply(client, counts)
                self.assertEqual(client.aggregate_counts(), {})
        with patch.object(ledger, 'MAX_ITEM_BYTES', 20):
            with self.assertRaises(ValueError):
                self.apply(AtomicDynamo())
        with patch.object(ledger, 'MAX_TRANSACTION_BYTES', 100):
            with self.assertRaises(ValueError):
                self.apply(AtomicDynamo())

    def test_conditional_record_conflict_cannot_commit_counter_updates(self):
        client = AtomicDynamo(fail_once_after_commits=1)
        with self.assertRaises(TimeoutError):
            self.apply(client)
        request = next(request for name, request in client.requests if name == 'TransactWriteItems')
        before = client.aggregate_counts()
        with self.assertRaises(client.TransactionCanceledException):
            client.transact_write_items(**request)
        self.assertEqual(client.aggregate_counts(), before)

    def test_corrupt_chunk_record_never_counts_as_matching_commit(self):
        client = AtomicDynamo(fail_once_after_commits=1)
        with self.assertRaises(TimeoutError):
            self.apply(client)
        record = next(item for key, item in client.items.items() if '#chunk#' in key)
        record['chunkDigest'] = {'S': '0'*64}
        with self.assertRaises(ValueError):
            self.apply(client)
        self.assertEqual(len(client.aggregate_counts()), 90)

    def test_active_guard_write_failure_and_lost_response_recover_with_strong_proof(self):
        for committed in [False, True]:
            with self.subTest(committed=committed):
                client = AtomicDynamo(ordinary_reads_stale=True)
                if committed:
                    client.lose_active_response = True
                else:
                    client.fail_active_once = True
                    with self.assertRaises(TimeoutError):
                        self.apply(client)
                    self.assertEqual(client.aggregate_counts(), {})
                self.assert_recovery(client)
                guard = client.items['ingestion#active']
                self.assertNotIn(self.key, json.dumps(guard))
                self.assertNotIn('expires_at', guard)

    def test_unresolved_other_input_cannot_replace_active_guard(self):
        client = AtomicDynamo(fail_once_after_commits=1)
        with self.assertRaises(TimeoutError):
            self.apply(client)
        before = json.dumps(client.items, sort_keys=True)
        with self.assertRaises(RuntimeError):
            self.apply(client, {'total#views': 1}, key='test-logs/cloudfront-logs/other.gz')
        self.assertEqual(json.dumps(client.items, sort_keys=True), before)
        with self.assertRaises(RuntimeError):
            ledger.assert_publication_safe(client, 'test-stats')
        self.assert_recovery(client)
        ledger.assert_publication_safe(client, 'test-stats')

    def test_corrupt_active_guard_blocks_publication_instead_of_disappearing(self):
        client = AtomicDynamo()
        self.apply(client)
        client.items['ingestion#active']['complete']['M']['counterCount'] = {'N': '-1'}
        with self.assertRaises(ValueError):
            ledger.assert_publication_safe(client, 'test-stats')

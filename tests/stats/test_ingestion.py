"""Real handler regression: interrupted input must never publish or be skipped."""
import io
import unittest
from unittest.mock import patch

from fakes import AtomicDynamo, LogS3, log_text, load_handler
from test_source_failures import FixedDatetime

KEY = 'cloudfront-logs/SYNTHETIC.2026-09-07-00.example.gz'


class Context:
    def get_remaining_time_in_millis(self):
        return 120_000


class IngestionTests(unittest.TestCase):
    def test_real_handler_interruption_preserves_public_payload_then_recovers_once(self):
        handler = load_handler()
        client = AtomicDynamo(fail_once_after_commits=1)
        client.fail_update_after = 1  # Red reproduces legacy marker-before-flush failure.
        s3 = LogS3({KEY: log_text()})
        with patch.multiple(handler, dynamodb=client, s3=s3, datetime=FixedDatetime,
                            CF_ZONE_ID='', CF_TOKEN_SSM_PARAM=''), patch('sys.stdout', new_callable=io.StringIO):
            with self.assertRaises(Exception):
                handler.lambda_handler({}, Context())
            self.assertEqual(s3.published, [], 'partially applied input must preserve last public payload')
            self.assertNotIn('cursor#cloudfront-logs', client.items)
            self.assertNotIn('marker#' + KEY, client.items)
            handler.lambda_handler({}, Context())
            self.assertEqual(len(s3.published), 1)
            payload = s3.published[0]
            self.assertEqual(payload['totalViews'], 181)
            self.assertEqual(payload['dailyObservations'][-1]['views'], 181)
            expected = {f'page#/p{i}': 1 for i in range(181)}
            expected.update({'total#views': 181, 'daily#2026-09-07': 181})
            self.assertEqual(client.aggregate_counts(), expected)
            handler.lambda_handler({}, Context())
            self.assertEqual(client.aggregate_counts(), expected)

    def run_real(self, client, s3, context=None):
        handler = load_handler()
        with patch.multiple(handler, dynamodb=client, s3=s3, datetime=FixedDatetime,
                            CF_ZONE_ID='', CF_TOKEN_SSM_PARAM=''), patch('sys.stdout', new_callable=io.StringIO):
            return handler.lambda_handler({}, context or Context())

    def test_real_handler_budget_inside_input_keeps_checkpoint_and_resumes(self):
        from copy import deepcopy
        checkpoint = {'id': {'S': 'source#cloudflare'}, 'checkpointVersion': {'N': '1'},
                      'publicProjection': {'S': '{"uniqueVisitors":1,"countries":[{"label":"US","value":7}]}'},
                      'status': {'S': 'current'}, 'scope': {'S': 'zone-requests'},
                      'since': {'S': '2026-09-02'}, 'through': {'S': '2026-09-02'},
                      'lastSuccessfulUpdate': {'S': '2026-09-03'}}
        client = AtomicDynamo(items=[deepcopy(checkpoint)])
        s3 = LogS3({KEY: log_text()})
        context = Context()
        context.get_remaining_time_in_millis = lambda: 0 if client.commits >= 1 else 120_000
        self.assertEqual(self.run_real(client, s3, context), {'truncated': True})
        self.assertEqual(s3.published, [])
        self.assertNotIn('cursor#cloudfront-logs', client.items)
        self.assertEqual(client.items['source#cloudflare'], checkpoint)
        self.run_real(client, s3)
        self.assertEqual(s3.published[0]['totalViews'], 181)
        self.assertEqual(s3.published[0]['uniqueVisitors'], 1)
        self.assertEqual(s3.published[0]['countries'], [{'label': 'US', 'value': 7}])
        self.assertEqual(client.items['source#cloudflare'], checkpoint)

    def test_between_complete_inputs_keeps_progress_without_partial_pass_publication(self):
        second = KEY.replace('-00.', '-01.')
        client = AtomicDynamo()
        s3 = LogS3({KEY: log_text(5, '2026-09-06'), second: log_text(3)})
        context = Context()
        context.get_remaining_time_in_millis = lambda: 0 if 'cursor#cloudfront-logs' in client.items else 120_000
        self.assertEqual(self.run_real(client, s3, context), {'truncated': True})
        self.assertEqual(s3.published, [])
        self.assertEqual(client.items['cursor#cloudfront-logs']['last_key']['S'], KEY)
        self.assertEqual(client.aggregate_counts()['total#views'], 5)
        self.run_real(client, s3)
        self.assertEqual(s3.published[0]['totalViews'], 8)
        self.assertEqual(client.items['cursor#cloudfront-logs']['last_key']['S'], second)
        self.assertEqual(s3.published[0]['sources']['cloudfront']['since'], '2026-09-06')
        self.assertEqual(s3.published[0]['sources']['cloudfront']['through'], '2026-09-07')

    def test_final_record_failure_prohibits_publication_and_cursor_then_retry_recovers(self):
        client = AtomicDynamo()
        client.fail_complete_once = True
        s3 = LogS3({KEY: log_text()})
        with self.assertRaises(TimeoutError):
            self.run_real(client, s3)
        self.assertEqual(s3.published, [])
        self.assertNotIn('cursor#cloudfront-logs', client.items)
        self.assertEqual(client.aggregate_counts()['total#views'], 181)
        self.run_real(client, s3)
        self.assertEqual(s3.published[0]['totalViews'], 181)

    def test_real_handler_only_actual_dated_records_establish_zero(self):
        for text, observed in [(log_text(2, documents=False), True), (log_text(0), False), ('', False)]:
            with self.subTest(observed=observed):
                client = AtomicDynamo()
                s3 = LogS3({KEY: text})
                self.run_real(client, s3)
                result = s3.published[0]
                self.assertEqual(result['sources']['cloudfront']['status'], 'current' if observed else 'unavailable')
                self.assertEqual(result['dailyObservations'][-1]['views'], 0 if observed else None)
                self.assertTrue(any(key.endswith('#complete') for key in client.items))

    def test_consistent_filtered_scan_keeps_ledger_out_and_latest_counts_in(self):
        client = AtomicDynamo(items=[{'id': {'S': 'logv2#unrelated#complete'}},
                                    {'id': {'S': 'marker#unrelated'}, 'expires_at': {'N': '123'}}],
                              ordinary_reads_stale=True)
        s3 = LogS3({KEY: log_text(5)})
        self.run_real(client, s3)
        self.assertEqual(s3.published[0]['totalViews'], 5)
        self.assertEqual(s3.published[0]['dailyObservations'][-1]['views'], 5)
        scans = [request for operation, request in client.requests if operation == 'Scan']
        self.assertTrue(scans)
        self.assertTrue(all(request['ConsistentRead'] and request['FilterExpression'] for request in scans))
        handler = load_handler()
        with patch.object(handler, 'dynamodb', client):
            scanned = handler._scan_aggregates()
        self.assertFalse(any(item['id']['S'].startswith(('logv2#', 'marker#', 'cursor#')) for item in scanned))
        self.assertTrue(any(item['id']['S'] == 'source#cloudflare' for item in scanned))

    def test_legacy_marked_objects_never_reparse_or_change_historical_counts(self):
        marker = {'id': {'S': 'marker#' + KEY}, 'expires_at': {'N': '123'}}
        client = AtomicDynamo(items=[marker, {'id': {'S': 'total#views'}, 'count': {'N': '41'}}])
        s3 = LogS3({KEY: log_text()})
        self.assertEqual(self.run_real(client, s3)['processedObjects'], 0)
        self.assertEqual(s3.read_keys, [])
        self.assertEqual(s3.published[0]['totalViews'], 41)
        self.assertEqual(client.items['marker#' + KEY], marker)
        self.assertFalse(any(operation == 'TransactWriteItems' for operation, _ in client.requests))

    def test_changed_completed_object_fails_without_second_publication(self):
        import gzip
        client = AtomicDynamo()
        s3 = LogS3({KEY: log_text(5)})
        self.run_real(client, s3)
        s3.objects[KEY] = gzip.compress(log_text(6).encode())
        with self.assertRaises(ValueError):
            self.run_real(client, s3)
        self.assertEqual(len(s3.published), 1)
        self.assertEqual(client.aggregate_counts()['total#views'], 5)

    def test_cursor_rewind_never_moves_checkpoint_backwards(self):
        previous = KEY.replace('-00.', '-03.')
        client = AtomicDynamo(items=[{'id': {'S': 'cursor#cloudfront-logs'}, 'last_key': {'S': previous}}])
        s3 = LogS3({KEY: log_text(5)})
        self.run_real(client, s3)
        self.assertEqual(client.items['cursor#cloudfront-logs']['last_key']['S'], previous)

    def test_disappeared_partial_input_still_blocks_later_publication(self):
        client = AtomicDynamo(fail_once_after_commits=1)
        s3 = LogS3({KEY: log_text()})
        with self.assertRaises(TimeoutError):
            self.run_real(client, s3)
        self.assertEqual(len(client.aggregate_counts()), 90)
        s3.objects.clear()  # Retention/deletion removed the input from listing and body.
        with self.assertRaises(RuntimeError):
            self.run_real(client, s3)
        self.assertEqual(s3.published, [])
        self.assertNotIn('cursor#cloudfront-logs', client.items)
        self.assertEqual(len(client.aggregate_counts()), 90)

    def test_active_input_resumes_before_newly_arrived_earlier_key(self):
        client = AtomicDynamo(fail_once_after_commits=1)
        s3 = LogS3({KEY: log_text()})
        with self.assertRaises(TimeoutError):
            self.run_real(client, s3)
        import gzip
        earlier = KEY.replace('2026-09-07', '2026-09-06')
        s3.objects[earlier] = gzip.compress(log_text(5, '2026-09-06').encode())
        self.run_real(client, s3)
        self.assertEqual(len(s3.published), 1)
        self.assertEqual(s3.published[0]['totalViews'], 186)
        self.assertEqual(s3.published[0]['dailyObservations'][-2]['views'], 5)
        self.assertEqual(client.items['cursor#cloudfront-logs']['last_key']['S'], KEY)

    def test_later_legacy_or_completed_keys_cannot_skip_missing_active_input(self):
        import hashlib
        import json
        for legacy in [True, False]:
            with self.subTest(legacy=legacy):
                client = AtomicDynamo(fail_once_after_commits=1)
                s3 = LogS3({KEY: log_text()})
                with self.assertRaises(TimeoutError):
                    self.run_real(client, s3)
                later = KEY.replace('-00.', '-01.')
                if legacy:
                    client.items['marker#' + later] = {'id': {'S': 'marker#' + later}}
                else:
                    identity = hashlib.sha256(('test-logs/' + later).encode()).hexdigest()
                    record_id = f'logv2#{identity}#complete'
                    client.items[record_id] = {'id': {'S': record_id}, 'ledgerVersion': {'N': '2'},
                        'payloadDigest': {'S': hashlib.sha256(b'{}').hexdigest()},
                        'counterCount': {'N': '0'}, 'chunkCount': {'N': '0'}}
                s3.objects = LogS3({later: ''}).objects
                before = json.dumps(client.items, sort_keys=True)
                with self.assertRaises(RuntimeError):
                    self.run_real(client, s3)
                self.assertEqual(json.dumps(client.items, sort_keys=True), before)
                self.assertEqual(s3.published, [])

    def test_malformed_records_do_not_establish_zero_and_oversized_referrer_is_dropped(self):
        handler = load_handler()
        from collections import Counter
        malformed = log_text(1).replace('GET\t200', 'not-a-method\tnot-a-status')
        counts = Counter()
        handler._tally_log_lines(malformed, counts)
        self.assertEqual(dict(counts), {})
        host = '.'.join(['a'*63] * 20) + '.com'
        counts = Counter()
        handler._tally_log_lines(log_text(1).replace('\t-\t', f'\thttps://{host}/\t'), counts)
        self.assertEqual(counts['total#views'], 1)
        self.assertFalse(any(key.startswith('referrer#') for key in counts))

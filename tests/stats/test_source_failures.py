from contextlib import ExitStack
from datetime import datetime, timezone
import io
import unittest
from unittest.mock import patch

from fakes import FakeDynamoDB, FakeS3, FakeSSM, Response, api_day, api_result, cf_item, count_item, load_handler

NOW = datetime(2026, 9, 8, 12, tzinfo=timezone.utc)


class FixedDatetime(datetime):
    @classmethod
    def now(cls, tz=None):
        return NOW


class SourceFailureTests(unittest.TestCase):
    def setUp(self):
        self.handler = load_handler()
        self.ddb = FakeDynamoDB([count_item('total#views', 10), count_item('daily#2026-09-01', 10)])
        self.s3 = FakeS3()
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        for name, value in [('dynamodb', self.ddb), ('s3', self.s3), ('ssm', FakeSSM()),
                            ('datetime', FixedDatetime), ('CF_ZONE_ID', 'test-zone'), ('CF_TOKEN_SSM_PARAM', 'test-token')]:
            self.stack.enter_context(patch.object(self.handler, name, value))
        self.http = self.stack.enter_context(patch.object(self.handler.urllib.request, 'urlopen',
            side_effect=AssertionError('Unconfigured network access is forbidden')))
        self.stack.enter_context(patch('sys.stdout', new_callable=io.StringIO))

    def run_handler(self, fails=False):
        if fails:
            with self.assertRaises(Exception):
                self.handler.lambda_handler({}, None)
        else:
            self.handler.lambda_handler({}, None)
        self.assertEqual(len(self.s3.published), 1)
        result = self.s3.published[0]
        self.assertEqual(result['totalViews'], 10)
        self.assertEqual(result['sources']['cloudfront']['status'], 'current')
        return result

    def test_missing_total_does_not_present_daily_subset_as_zero_total(self):
        del self.ddb.items['total#views']
        self.handler.CF_ZONE_ID = self.handler.CF_TOKEN_SSM_PARAM = ''
        self.handler.lambda_handler({}, None)
        result = self.s3.published[0]
        self.assertEqual(result['sources']['cloudfront']['status'], 'unavailable')
        self.assertEqual(result['dailyObservations'][-7]['views'], 10)

    def test_absent_configuration_is_unavailable_not_successful_zero(self):
        self.handler.CF_ZONE_ID = self.handler.CF_TOKEN_SSM_PARAM = ''
        result = self.run_handler()
        self.assertEqual(result['sources']['cloudflare'], {'status': 'unavailable', 'since': None,
            'through': None, 'lastSuccessfulUpdate': None, 'scope': 'zone-requests'})
        self.http.assert_not_called()

    def test_denied_token_read_still_publishes_documents_before_alarm(self):
        with patch.object(self.handler.ssm, 'get_parameter', side_effect=PermissionError('denied')):
            result = self.run_handler(fails=True)
        self.assertEqual(result['sources']['cloudflare']['status'], 'unavailable')
        self.http.assert_not_called()

    def test_transport_timeout_still_publishes_documents(self):
        self.http.side_effect = TimeoutError('synthetic timeout')
        self.assertEqual(self.run_handler(fails=True)['sources']['cloudflare']['status'], 'unavailable')

    def test_api_error_and_malformed_or_empty_results_are_source_failures(self):
        for body in [{'errors': [{'message': 'synthetic'}]}, [], {}, api_result([]),
                     api_result([{}]), api_result([api_day('2026-02-30')]),
                     api_result([api_day('2026-09-08')]), api_result([api_day('2026-09-07', None)]),
                     api_result([api_day('2026-09-07', -1)])]:
            with self.subTest(body=body):
                self.s3.published.clear()
                self.http.side_effect = None
                self.http.return_value = Response(body)
                result = self.run_handler(fails=True)
                self.assertIsNone(result['sources']['cloudflare']['lastSuccessfulUpdate'])

    def test_failure_preserves_prior_success_and_coverage(self):
        self.ddb.put_item(Item=cf_item('2026-09-02', 1, {'US': 7}))
        self.ddb.put_item(Item={'id': {'S': 'source#cloudflare'}, 'status': {'S': 'current'},
            'since': {'S': '2026-09-02'}, 'through': {'S': '2026-09-02'},
            'lastSuccessfulUpdate': {'S': '2026-09-03'}, 'scope': {'S': 'zone-requests'}})
        self.http.side_effect = TimeoutError()
        result = self.run_handler(fails=True)
        self.assertEqual(result['sources']['cloudflare'], {'status': 'stale', 'since': '2026-09-02',
            'through': '2026-09-02', 'lastSuccessfulUpdate': '2026-09-03', 'scope': 'zone-requests'})
        self.assertEqual(result['uniqueVisitors'], 1)
        self.assertEqual(self.ddb.items['source#cloudflare']['lastSuccessfulUpdate'], {'S': '2026-09-03'})

    def test_legacy_measurements_keep_actual_coverage_without_invented_success_date(self):
        self.ddb.put_item(Item=cf_item('2026-09-02', 1, {'US': 7}))
        self.http.side_effect = TimeoutError()
        source = self.run_handler(fails=True)['sources']['cloudflare']
        self.assertEqual(source['status'], 'stale')
        self.assertEqual((source['since'], source['through']), ('2026-09-02', '2026-09-02'))
        self.assertIsNone(source['lastSuccessfulUpdate'])

    def test_recovery_and_genuine_zero_advance_only_the_successful_source(self):
        self.http.side_effect = None
        self.http.return_value = Response(api_result([api_day('2026-09-07', 0, 0)]))
        result = self.run_handler()
        self.assertEqual(result['uniqueVisitors'], 0)
        self.assertEqual(result['sources']['cloudflare'], {'status': 'current', 'since': '2026-09-07',
            'through': '2026-09-07', 'lastSuccessfulUpdate': '2026-09-08', 'scope': 'zone-requests'})
        self.assertEqual(result['sources']['cloudfront']['since'], '2026-09-01')
        self.assertEqual(self.ddb.items['cf#daily#2026-09-07']['uniques'], {'N': '0'})

    def test_cloudfront_failure_preserves_prior_publication_and_does_not_query_cloudflare(self):
        with patch.object(self.handler, '_ingest_cloudfront_logs', side_effect=OSError('synthetic')):
            with self.assertRaises(OSError):
                self.handler.lambda_handler({}, None)
        self.assertEqual(self.s3.published, [])
        self.http.assert_not_called()

    def test_recovery_after_failure_keeps_actual_earliest_measurement(self):
        self.ddb.put_item(Item=cf_item('2026-09-02', 1, {'US': 7}))
        self.http.side_effect = TimeoutError()
        self.run_handler(fails=True)
        self.s3.published.clear()
        self.http.side_effect = None
        self.http.return_value = Response(api_result([api_day('2026-09-07', 0, 0)]))
        source = self.run_handler()['sources']['cloudflare']
        self.assertEqual(source, {'status': 'current', 'since': '2026-09-02', 'through': '2026-09-07',
                                  'lastSuccessfulUpdate': '2026-09-08', 'scope': 'zone-requests'})

    def test_partial_configuration_is_alarm_worthy_but_recoverable(self):
        self.handler.CF_ZONE_ID = ''
        result = self.run_handler(fails=True)
        self.assertEqual(result['sources']['cloudflare']['status'], 'unavailable')
        self.http.assert_not_called()

    def test_malformed_token_and_response_bytes_are_recoverable(self):
        with patch.object(self.handler.ssm, 'get_parameter', return_value={'Parameter': {'Value': ''}}):
            self.run_handler(fails=True)
        self.s3.published.clear()
        self.http.side_effect = None
        self.http.return_value = io.BytesIO(b'not JSON')
        self.run_handler(fails=True)

    def test_valid_day_is_not_written_before_later_malformed_day_is_rejected(self):
        self.http.side_effect = None
        self.http.return_value = Response(api_result([api_day('2026-09-06'), api_day('2026-09-07', None)]))
        self.run_handler(fails=True)
        self.assertNotIn('cf#daily#2026-09-06', self.ddb.items)

    def test_daily_storage_failure_preserves_publishable_independent_data(self):
        self.http.side_effect = None
        self.http.return_value = Response(api_result([api_day('2026-09-07')]))
        native_put = self.ddb.put_item
        def fail_daily(*, Item, **kwargs):
            if Item['id']['S'].startswith('cf#daily#'):
                raise OSError('synthetic storage failure')
            return native_put(Item=Item, **kwargs)
        with patch.object(self.ddb, 'put_item', side_effect=fail_daily):
            self.assertEqual(self.run_handler(fails=True)['sources']['cloudflare']['status'], 'unavailable')

    def test_partial_second_write_and_repeated_failure_keep_prior_dataset(self):
        for prior in [False, True]:
            with self.subTest(prior=prior):
                self.ddb.items = {item['id']['S']: item for item in
                    [count_item('total#views', 10), count_item('daily#2026-09-01', 10)]}
                if prior:
                    self.ddb.put_item(Item=cf_item('2026-09-02', 1, {'US': 7}))
                    self.ddb.put_item(Item={'id': {'S': 'source#cloudflare'}, 'status': {'S': 'current'},
                        'since': {'S': '2026-09-02'}, 'through': {'S': '2026-09-02'},
                        'lastSuccessfulUpdate': {'S': '2026-09-03'}, 'scope': {'S': 'zone-requests'}})
                self.http.side_effect = None
                response = api_result([api_day('2026-09-06', 100, 100), api_day('2026-09-07', 200, 200)])
                native_put = self.ddb.put_item
                def fail_second(*, Item, **kwargs):
                    if Item['id']['S'] == 'cf#daily#2026-09-07':
                        raise OSError('synthetic second-write failure')
                    return native_put(Item=Item, **kwargs)
                # Repeat against surviving partial daily storage, not a reset fake.
                for attempt in range(2):
                    self.s3.published.clear()
                    self.http.return_value = Response(response)
                    with patch.object(self.ddb, 'put_item', side_effect=fail_second):
                        result = self.run_handler(fails=True)
                    self.assertIn('cf#daily#2026-09-06', self.ddb.items)
                    self.assertEqual(result['uniqueVisitors'], 1 if prior else 0)
                    self.assertEqual(result['countries'], [{'label': 'US', 'value': 7}] if prior else [])
                    self.assertEqual(result['sources']['cloudflare'], {'status': 'stale' if prior else 'unavailable',
                        'since': '2026-09-02' if prior else None, 'through': '2026-09-02' if prior else None,
                        'lastSuccessfulUpdate': '2026-09-03' if prior else None, 'scope': 'zone-requests'})
                self.s3.published.clear()
                self.http.return_value = Response(response)
                recovered = self.run_handler()
                self.assertEqual(recovered['uniqueVisitors'], 301 if prior else 300)
                self.assertEqual(recovered['sources']['cloudflare']['status'], 'current')
                self.assertEqual(recovered['sources']['cloudflare']['through'], '2026-09-07')

    def test_checkpoint_bootstrap_failure_prevents_daily_writes_even_if_committed(self):
        for committed in [False, True]:
            with self.subTest(committed=committed):
                self.ddb.items.pop('source#cloudflare', None)
                native_put = self.ddb.put_item
                def fail_checkpoint(*, Item, **kwargs):
                    if Item['id']['S'] == 'source#cloudflare':
                        if committed:
                            native_put(Item=Item, **kwargs)
                        raise OSError('synthetic lost checkpoint response')
                    return native_put(Item=Item, **kwargs)
                with patch.object(self.ddb, 'put_item', side_effect=fail_checkpoint):
                    with self.assertRaises(OSError):
                        self.handler.lambda_handler({}, None)
                self.http.assert_not_called()
                self.assertFalse(any(key.startswith('cf#daily#') for key in self.ddb.items))
                self.assertEqual(self.s3.published, [])

    def test_checkpoint_acceptance_failure_keeps_projection_and_metadata_atomic(self):
        for committed in [False, True]:
            with self.subTest(committed=committed):
                self.ddb.items = {item['id']['S']: item for item in
                    [count_item('total#views', 10), count_item('daily#2026-09-01', 10)]}
                self.s3.published.clear()
                self.http.side_effect = TimeoutError()
                self.run_handler(fails=True)  # Persist accepted unavailable baseline.
                self.s3.published.clear()
                self.http.side_effect = None
                self.http.return_value = Response(api_result([api_day('2026-09-07', 100, 100)]))
                native_put = self.ddb.put_item
                def fail_acceptance(*, Item, **kwargs):
                    if Item['id']['S'] == 'source#cloudflare':
                        if committed:
                            native_put(Item=Item, **kwargs)
                        raise OSError('synthetic lost checkpoint response')
                    return native_put(Item=Item, **kwargs)
                with patch.object(self.ddb, 'put_item', side_effect=fail_acceptance):
                    result = self.run_handler(fails=True)
                self.assertEqual(result['uniqueVisitors'], 0)
                self.assertEqual(result['sources']['cloudflare']['status'], 'unavailable')
                self.s3.published.clear()
                self.http.side_effect = TimeoutError()
                result = self.run_handler(fails=True)
                self.assertEqual(result['uniqueVisitors'], 100 if committed else 0)
                self.assertEqual(result['sources']['cloudflare']['status'], 'stale' if committed else 'unavailable')
                self.assertEqual(result['sources']['cloudflare']['through'], '2026-09-07' if committed else None)
                self.assertEqual(result['sources']['cloudflare']['lastSuccessfulUpdate'], '2026-09-08' if committed else None)

    def test_malformed_or_missing_projection_does_not_promote_partial_rows(self):
        for projection in [None, '{bad JSON', '{"uniqueVisitors":100,"countries":[{"label":"US","value":1}]}']:
            with self.subTest(projection=projection):
                item = {'id': {'S': 'source#cloudflare'}, 'checkpointVersion': {'N': '1'}}
                if projection is not None:
                    item['publicProjection'] = {'S': projection}
                self.ddb.put_item(Item=item)
                self.ddb.put_item(Item=cf_item('2026-09-06', 100, {'US': 100}))
                self.s3.published.clear()
                self.http.side_effect = TimeoutError()
                result = self.run_handler(fails=True)
                self.assertEqual(result['uniqueVisitors'], 0)
                self.assertEqual(result['countries'], [])
                self.assertEqual(result['sources']['cloudflare']['status'], 'unavailable')

    def test_incomplete_cloudfront_pass_does_not_advance_any_source_or_publish(self):
        with patch.object(self.handler, '_ingest_cloudfront_logs', side_effect=self.handler.IngestionIncomplete()):
            result = self.handler.lambda_handler({}, None)
        self.assertEqual(result, {'truncated': True})
        self.assertEqual(self.s3.published, [])
        self.assertNotIn('source#cloudfront', self.ddb.items)
        self.assertNotIn('source#cloudflare', self.ddb.items)
        self.http.assert_not_called()

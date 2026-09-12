from datetime import date
import json
import unittest

from stats_aggregator.payload import read_cloudflare_checkpoint, render_payload
from fakes import cf_item, count_item

TODAY = date(2026, 9, 8)
SOURCES = {
    name: {'status': 'unavailable', 'since': None, 'through': None,
           'lastSuccessfulUpdate': None, 'scope': scope}
    for name, scope in [('cloudfront', 'site-document-requests'), ('cloudflare', 'zone-requests')]
}


class PayloadTests(unittest.TestCase):
    def test_absent_observations_do_not_become_zero_traffic(self):
        result = render_payload([], TODAY, SOURCES)
        observations = result['dailyObservations']
        self.assertEqual(len(observations), 30)
        self.assertEqual(observations[0]['date'], '2026-08-09')
        self.assertEqual(observations[-1]['date'], '2026-09-07')
        self.assertTrue(all(point['views'] is None and point['status'] == 'missing' for point in observations))
        self.assertEqual(result['schemaVersion'], 2)
        self.assertEqual(result['dailySeries'], [])

    def test_explicit_zero_and_yesterday_are_measurements_but_today_is_excluded(self):
        result = render_payload([count_item('daily#2026-09-05', 0), count_item('daily#2026-09-07', 2),
                                 count_item('daily#2026-09-08', 99)], TODAY, SOURCES)
        by_day = {point['date']: point for point in result['dailyObservations']}
        self.assertEqual(by_day['2026-09-05'], {'date': '2026-09-05', 'views': 0, 'status': 'observed'})
        self.assertEqual(by_day['2026-09-07']['status'], 'provisional')
        self.assertNotIn('2026-09-08', by_day)
        self.assertEqual(result['dailySeries'], [{'date': '2026-09-05', 'views': 0}, {'date': '2026-09-07', 'views': 2}])

    def test_daily_uniques_are_summed_and_country_requests_keep_zone_units(self):
        result = render_payload([cf_item('2026-09-02', 1, {'US': 7}), cf_item('2026-09-07', 1, {'US': 5}),
                                 cf_item('2026-09-08', 50, {'US': 100})], TODAY, SOURCES)
        self.assertEqual(result['uniqueVisitors'], 2)
        self.assertEqual(result['countries'], [{'label': 'US', 'value': 12}])

    def test_legacy_types_and_source_metadata_are_preserved_without_invented_bounds(self):
        result = render_payload([count_item('total#views', 123), count_item('daily#2025-01-02', 123)], TODAY, SOURCES)
        self.assertEqual(result['totalViews'], 123)
        self.assertEqual(result['since'], '2025-01-02')
        self.assertEqual(result['sources'], SOURCES)
        for key in ['dailySeries', 'topPages', 'topReferrers', 'countries']:
            self.assertIsInstance(result[key], list)
        self.assertIsInstance(result['uniqueVisitors'], int)
        self.assertIsInstance(result['lastUpdated'], str)

    def test_public_labels_floor_and_counts_remain_bounded(self):
        items = [count_item('page#/small', 4), count_item('page#/large', 5),
                 count_item('referrer#192.0.2.1', 90), count_item('referrer#bad domain', 90),
                 count_item('referrer#example.com', 5), count_item('daily#2026-02-30', 2),
                 count_item('total#views', 10**20), count_item('page#/invalid', -1),
                 cf_item('2026-09-07', 1, {'us': 99, 'US': 4, 'CA': 5})]
        result = render_payload(items, TODAY, SOURCES)
        self.assertEqual(result['topPages'], [{'label': '/large', 'value': 5}, {'label': 'Other', 'value': 4}])
        self.assertEqual(result['topReferrers'], [{'label': 'example.com', 'value': 5}])
        self.assertEqual(result['countries'], [{'label': 'CA', 'value': 5}, {'label': 'Other', 'value': 4}])
        self.assertEqual(result['totalViews'], 1_000_000_000)
        many = render_payload([count_item(f'page#/p{i}', 100-i) for i in range(20)], TODAY, SOURCES)
        self.assertEqual(len(many['topPages']), 6)
        self.assertEqual(sum(row['value'] for row in many['topPages']), sum(100-i for i in range(20)))

    def test_bad_optional_aggregate_counts_do_not_fabricate_daily_zero(self):
        result = render_payload([count_item('daily#2026-09-07', 'NaN'), cf_item('2026-09-07', 'bad')], TODAY, SOURCES)
        self.assertIsNone(result['dailyObservations'][-1]['views'])
        self.assertEqual(result['uniqueVisitors'], 0)

    def test_checkpoint_validation_enforces_private_record_and_public_bounds(self):
        source = {'status': 'stale', 'since': '2026-09-02', 'through': '2026-09-02',
                  'lastSuccessfulUpdate': None, 'scope': 'zone-requests'}
        item = {'id': {'S': 'source#cloudflare'}, 'checkpointVersion': {'N': '1'},
                **{key: {'NULL': True} if value is None else {'S': value} for key, value in source.items()}}
        good = {'uniqueVisitors': 1, 'countries': [{'label': 'US', 'value': 7}]}
        item['publicProjection'] = {'S': json.dumps(good)}
        self.assertEqual(read_cloudflare_checkpoint(item), (source, good))
        for invalid in [ {'uniqueVisitors': True, 'countries': []},
                         {'uniqueVisitors': 10**10, 'countries': []},
                         {'uniqueVisitors': 1, 'countries': [{'label': 'US', 'value': 4}]},
                         {'uniqueVisitors': 1, 'countries': [{'label': 'US', 'value': 7}] * 2},
                         {'uniqueVisitors': 1, 'countries': [{'label': 'XX', 'value': 7}] * 7}]:
            with self.subTest(invalid=invalid):
                item['publicProjection'] = {'S': json.dumps(invalid)}
                with self.assertRaises(ValueError):
                    read_cloudflare_checkpoint(item)
        item['publicProjection'] = {'S': json.dumps(good)}
        item['since'] = {'unexpected': True}
        with self.assertRaises(ValueError):
            read_cloudflare_checkpoint(item)

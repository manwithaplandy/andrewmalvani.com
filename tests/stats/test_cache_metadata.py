"""Exercise the real publication boundary with synthetic services only."""
from contextlib import redirect_stdout
import io
import unittest
from unittest.mock import patch

from fakes import FakeDynamoDB, FakeS3, count_item, load_handler


class CacheMetadataTests(unittest.TestCase):
    def test_published_stats_uses_short_browser_and_shared_cache_without_changing_ownership(self):
        handler = load_handler()
        s3 = FakeS3()
        with patch.object(handler, 's3', s3), patch.object(handler, 'dynamodb', FakeDynamoDB([
                count_item('total#views', 10), count_item('daily#2026-09-01', 10)])), \
                patch.object(handler, 'CF_ZONE_ID', ''), patch.object(handler, 'CF_TOKEN_SSM_PARAM', ''), \
                patch.object(s3, 'put_object', wraps=s3.put_object) as put, \
                patch.object(handler.urllib.request, 'urlopen', side_effect=AssertionError('network forbidden')), \
                redirect_stdout(io.StringIO()):
            handler.lambda_handler({}, None)
        self.assertEqual(put.call_count, 1)
        self.assertEqual(put.call_args.kwargs['Key'], 'stats.json')
        self.assertEqual(put.call_args.kwargs['ContentType'], 'application/json')
        self.assertEqual(put.call_args.kwargs['CacheControl'], 'public, max-age=60, s-maxage=300')
        self.assertEqual(s3.published[0]['totalViews'], 10)
        self.assertEqual(s3.published[0]['schemaVersion'], 2)

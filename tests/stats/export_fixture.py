"""Render real handler output using only synthetic services for client tests."""
from contextlib import nullcontext
import io
import json
from pathlib import Path
import sys
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from fakes import FakeDynamoDB, FakeS3, FakeSSM, Response, api_day, api_result, cf_item, count_item, load_handler
from test_source_failures import FixedDatetime


def generate(scenario):
    handler = load_handler()
    items = [count_item('total#views', 10), count_item('daily#2026-09-01', 0),
             count_item('daily#2026-09-06', 10), count_item('daily#2026-09-07', 0),
             count_item('page#/', 6), count_item('page#/graph', 4),
             count_item('referrer#example.com', 6), count_item('referrer#docs.example.com', 4)]
    if scenario == 'partial-prior':
        items += [cf_item('2026-09-02', 1, {'US': 7}),
                  {'id': {'S': 'source#cloudflare'}, 'status': {'S': 'current'},
                   'since': {'S': '2026-09-02'}, 'through': {'S': '2026-09-02'},
                   'lastSuccessfulUpdate': {'S': '2026-09-03'}, 'scope': {'S': 'zone-requests'}}]
    elif scenario not in {'zero', 'partial-empty'}:
        items += [cf_item('2026-09-02', 1, {'US': 7}), cf_item('2026-09-07', 1, {'US': 5})]
    s3 = FakeS3()
    response = api_result([api_day('2026-09-07', 0 if scenario == 'zero' else 1, 0 if scenario == 'zero' else 5)])
    if scenario.startswith('partial-'):
        response = api_result([api_day('2026-09-06', 100, 100), api_day('2026-09-07', 200, 200)])
    ddb = FakeDynamoDB(items)
    native_put = ddb.put_item
    def fail_second(*, Item, **kwargs):
        if Item['id']['S'] == 'cf#daily#2026-09-07':
            raise OSError('synthetic second-write failure')
        return native_put(Item=Item, **kwargs)
    with patch.multiple(handler, dynamodb=ddb, s3=s3, ssm=FakeSSM(), datetime=FixedDatetime,
                        CF_ZONE_ID='synthetic-zone', CF_TOKEN_SSM_PARAM='synthetic-token'), \
            patch.object(handler.urllib.request, 'urlopen', return_value=Response(response),
                         side_effect=TimeoutError() if scenario == 'stale' else None), \
            patch('sys.stdout', new_callable=io.StringIO), \
            (patch.object(ddb, 'put_item', side_effect=fail_second) if scenario.startswith('partial-') else nullcontext()):
        try:
            handler.lambda_handler({}, None)
        except RuntimeError:
            if scenario != 'stale' and not scenario.startswith('partial-'):
                raise
    return s3.published[0]


if __name__ == '__main__':
    scenario = sys.argv[1] if len(sys.argv) > 1 else 'stale'
    if scenario not in {'stale', 'current', 'zero', 'partial-prior', 'partial-empty'}:
        raise ValueError('Unknown synthetic fixture scenario')
    print(json.dumps(generate(scenario)))

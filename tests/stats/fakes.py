"""Synthetic low-level services. Importing the handler never discovers credentials."""
import importlib
import io
import json
import os
from copy import deepcopy
from unittest.mock import patch

DUMMY_ENV = {
    'AWS_ACCESS_KEY_ID': 'testing', 'AWS_SECRET_ACCESS_KEY': 'testing',
    'AWS_DEFAULT_REGION': 'us-west-1', 'AWS_EC2_METADATA_DISABLED': 'true',
    'AWS_CONFIG_FILE': os.devnull, 'AWS_SHARED_CREDENTIALS_FILE': os.devnull,
    'TABLE_NAME': 'test-stats', 'LOG_BUCKET': 'test-logs', 'WEBSITE_BUCKET': 'test-site',
}


def load_handler():
    module_name = os.environ.get('STATS_HANDLER_MODULE', 'stats_aggregator.lambda_function')
    with patch.dict(os.environ, DUMMY_ENV, clear=True), patch('boto3.client', return_value=object()):
        return importlib.import_module(module_name)


def count_item(key, count):
    return {'id': {'S': key}, 'count': {'N': str(count)}}


def cf_item(day, uniques=1, countries=None):
    return {'id': {'S': f'cf#daily#{day}'}, 'uniques': {'N': str(uniques)},
            'countries': {'S': json.dumps(countries or {})}}


class FakeDynamoDB:
    def __init__(self, items=()):
        self.items = {item['id']['S']: deepcopy(item) for item in items}

    def get_item(self, *, Key, **kwargs):
        item = self.items.get(Key['id']['S'])
        return {'Item': deepcopy(item)} if item else {}

    def put_item(self, *, Item, **kwargs):
        self.items[Item['id']['S']] = deepcopy(Item)

    def get_paginator(self, operation):
        assert operation == 'scan'
        return self

    def paginate(self, **kwargs):
        yield {'Items': deepcopy(list(self.items.values()))}


class FakeS3:
    def __init__(self):
        self.published = []

    def get_paginator(self, operation):
        assert operation == 'list_objects_v2'
        return self

    def paginate(self, **kwargs):
        yield {'Contents': []}

    def put_object(self, **kwargs):
        self.published.append(json.loads(kwargs['Body']))


class FakeSSM:
    def get_parameter(self, **kwargs):
        return {'Parameter': {'Value': 'synthetic-token'}}


class Response(io.BytesIO):
    def __init__(self, payload):
        super().__init__(json.dumps(payload).encode())


def api_result(groups):
    return {'data': {'viewer': {'zones': [{'httpRequests1dGroups': groups}]}}}


def api_day(day, uniques=1, requests=5):
    return {'dimensions': {'date': day}, 'uniq': {'uniques': uniques},
            'sum': {'countryMap': [{'clientCountryName': 'US', 'requests': requests}]}}


class AtomicDynamo(FakeDynamoDB):
    """Low-level atomic service fake with real botocore request validation."""
    class ConditionalCheckFailedException(Exception):
        pass

    class TransactionCanceledException(Exception):
        pass

    def __init__(self, fail_once_after_commits=None, *, lose_response_after_commits=None,
                 items=(), ordinary_reads_stale=False):
        from types import SimpleNamespace
        from botocore.session import Session
        super().__init__(items)
        self.model = Session().get_service_model('dynamodb')
        self.exceptions = SimpleNamespace(ConditionalCheckFailedException=self.ConditionalCheckFailedException)
        self.requests = []
        self.commits = 0
        self.fail_once_after_commits = fail_once_after_commits
        self.lose_response_after_commits = lose_response_after_commits
        self.failed_before = self.failed_after = False
        self.fail_complete_once = self.lose_complete_response = False
        self.fail_active_once = self.lose_active_response = False
        self.fail_update_after = None
        self.update_count = 0
        self.ordinary_reads_stale = ordinary_reads_stale
        self.old_items = deepcopy(self.items)

    def validate(self, operation, request):
        from botocore.validate import validate_parameters
        validate_parameters(request, self.model.operation_model(operation).input_shape)
        self.requests.append((operation, deepcopy(request)))

    def get_item(self, **request):
        self.validate('GetItem', request)
        values = self.items if request.get('ConsistentRead') or not self.ordinary_reads_stale else self.old_items
        item = values.get(request['Key']['id']['S'])
        return {'Item': deepcopy(item)} if item else {}

    def _put(self, values, request):
        item = request['Item']
        key = item['id']['S']
        condition = request.get('ConditionExpression')
        if condition:
            assert condition in ['attribute_not_exists(id)', 'attribute_not_exists(#id)']
            if condition.endswith('(#id)'):
                assert request['ExpressionAttributeNames']['#id'] == 'id'
            if key in values:
                raise self.ConditionalCheckFailedException(key)
        values[key] = deepcopy(item)

    def put_item(self, **request):
        self.validate('PutItem', request)
        active = request['Item']['id']['S'] == 'ingestion#active'
        if active and self.fail_active_once:
            self.fail_active_once = False
            raise TimeoutError('before active guard commit')
        complete = request['Item']['id']['S'].endswith('#complete')
        if complete and self.fail_complete_once:
            self.fail_complete_once = False
            raise TimeoutError('before completion commit')
        self._put(self.items, request)
        if active and self.lose_active_response:
            self.lose_active_response = False
            raise TimeoutError('active guard committed, response lost')
        if complete and self.lose_complete_response:
            self.lose_complete_response = False
            raise TimeoutError('completion committed, response lost')
        return {}

    def _update(self, values, request):
        assert request['UpdateExpression'] == 'ADD #c :n'
        assert request['ExpressionAttributeNames'] == {'#c': 'count'}
        key = request['Key']['id']['S']
        item = values.setdefault(key, {'id': {'S': key}, 'count': {'N': '0'}})
        item['count']['N'] = str(int(item['count']['N']) + int(request['ExpressionAttributeValues'][':n']['N']))

    def update_item(self, **request):
        # Also reproduces the old orchestrator's nontransactional lost counts.
        self.validate('UpdateItem', request)
        if self.fail_update_after is not None and self.update_count >= self.fail_update_after:
            self.fail_update_after = None
            raise TimeoutError('legacy update interrupted')
        self._update(self.items, request)
        self.update_count += 1
        return {}

    def transact_write_items(self, **request):
        self.validate('TransactWriteItems', request)
        if (not self.failed_before and self.fail_once_after_commits is not None
                and self.commits >= self.fail_once_after_commits):
            self.failed_before = True
            raise TimeoutError('before transaction commit')
        staged = deepcopy(self.items)
        keys = set()
        try:
            for action in request['TransactItems']:
                operation, value = next(iter(action.items()))
                key = (value['Item'] if operation == 'Put' else value['Key'])['id']['S']
                assert key not in keys, 'DynamoDB forbids two actions on one item'
                keys.add(key)
                if operation == 'Put':
                    self._put(staged, value)
                else:
                    assert operation == 'Update'
                    self._update(staged, value)
        except self.ConditionalCheckFailedException as exc:
            raise self.TransactionCanceledException() from exc
        self.items = staged
        self.commits += 1
        if (not self.failed_after and self.lose_response_after_commits is not None
                and self.commits == self.lose_response_after_commits):
            self.failed_after = True
            raise TimeoutError('transaction committed, response lost')
        return {}

    def get_paginator(self, operation):
        assert operation == 'scan'
        return self

    def paginate(self, **request):
        self.validate('Scan', request)
        values = self.items if request.get('ConsistentRead') or not self.ordinary_reads_stale else self.old_items
        items = list(values.values())
        if request.get('FilterExpression'):
            expected = {'total#views', 'daily#', 'page#', 'referrer#', 'cf#daily#', 'source#cloudfront', 'source#cloudflare'}
            prefixes = {attribute['S'] for attribute in request['ExpressionAttributeValues'].values()}
            assert prefixes == expected
            items = [item for item in items if any(
                item['id']['S'] == value if value in ['total#views', 'source#cloudfront', 'source#cloudflare']
                else item['id']['S'].startswith(value) for value in prefixes)]
        yield {'Items': deepcopy(items)}

    def aggregate_counts(self):
        return {key: int(item['count']['N']) for key, item in self.items.items()
                if key.startswith(('total#', 'daily#', 'page#', 'referrer#')) and 'count' in item}


class LogS3(FakeS3):
    def __init__(self, objects):
        super().__init__()
        import gzip
        self.objects = {key: gzip.compress(value.encode()) for key, value in objects.items()}
        self.list_requests = []
        self.read_keys = []

    def paginate(self, **kwargs):
        self.list_requests.append(deepcopy(kwargs))
        yield {'Contents': [{'Key': key} for key in sorted(self.objects)
                            if key > kwargs.get('StartAfter', '')]}

    def get_object(self, *, Key, **kwargs):
        self.read_keys.append(Key)
        return {'Body': io.BytesIO(self.objects[Key])}


def log_text(pages=181, day='2026-09-07', *, documents=True):
    header = '#Fields: date cs-method sc-status cs-uri-stem cs(Referer) cs(User-Agent)\n'
    return header + ''.join(f'{day}\tGET\t200\t/p{i}.{"html" if documents else "png"}\t-\tMozilla\n'
                            for i in range(pages))

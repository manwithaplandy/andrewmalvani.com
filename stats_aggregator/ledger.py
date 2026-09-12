"""Durable aggregate-only idempotency for one bucket-qualified log input.

No SDK clients, clocks, raw request data, short-lived deduplication assumptions,
or TTLs. A committed chunk record is the durable proof of its counter effects.
"""
import hashlib
import json
from typing import Callable

CHUNK_COUNTERS = 90
MAX_TRANSACTION_BYTES = 3_500_000  # conservative margin below DynamoDB's 4 MB
MAX_ITEM_BYTES = 350_000  # conservative margin below its 400 KB item limit
MAX_COUNTER_KEY_BYTES = 1024
MIN_REMAINING_MS = 45_000
ACTIVE_INPUT_ID = 'ingestion#active'


class IngestionIncomplete(Exception):
    """Stop before another write; a later invocation resumes durable chunks."""


def _json_bytes(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':')).encode('utf-8')


def _digest(value):
    return hashlib.sha256(_json_bytes(value)).hexdigest()


def _remaining(remaining_ms):
    if remaining_ms() < MIN_REMAINING_MS:
        raise IngestionIncomplete('Not enough time to finish input safely')


def _read(client, table_name, item_id):
    return client.get_item(TableName=table_name, Key={'id': {'S': item_id}}, ConsistentRead=True).get('Item')


def _matches(actual, expected):
    if actual is None:
        return False
    if actual != expected:
        raise ValueError('Input content or durable ledger record changed')
    return True


def _record(item_id, payload_digest, counter_count, chunk_count, chunk_digest=None):
    result = {'id': {'S': item_id}, 'ledgerVersion': {'N': '2'},
              'payloadDigest': {'S': payload_digest}, 'counterCount': {'N': str(counter_count)},
              'chunkCount': {'N': str(chunk_count)}}
    if chunk_digest is not None:
        result['chunkDigest'] = {'S': chunk_digest}
    if len(_json_bytes(result)) > MAX_ITEM_BYTES:
        raise ValueError('Ledger record exceeds item byte budget')
    return result



def _active_completion(client, table_name):
    active = _read(client, table_name, ACTIVE_INPUT_ID)
    if active is None:
        return None
    try:
        complete = active['complete']['M']
        identity = complete['id']['S'].removeprefix('logv2#').removesuffix('#complete')
        if len(identity) != 64 or any(character not in '0123456789abcdef' for character in identity):
            raise ValueError('Invalid active identity')
        payload_digest = complete['payloadDigest']['S']
        counter_count, chunk_count = int(complete['counterCount']['N']), int(complete['chunkCount']['N'])
        if (len(payload_digest) != 64 or any(character not in '0123456789abcdef' for character in payload_digest)
                or counter_count < 0 or chunk_count != (counter_count + CHUNK_COUNTERS - 1) // CHUNK_COUNTERS):
            raise ValueError('Invalid active input metadata')
        expected = _record(f'logv2#{identity}#complete', payload_digest, counter_count, chunk_count)
        if active != {'id': {'S': ACTIVE_INPUT_ID}, 'complete': {'M': expected}}:
            raise ValueError('Invalid active input guard')
        return expected
    except (KeyError, TypeError, AttributeError, ValueError) as exc:
        raise ValueError('Invalid active input guard; publication blocked') from exc


def pending_input_identity(client, table_name):
    """Return the unresolved hashed identity, independent of the S3 listing."""
    complete = _active_completion(client, table_name)
    if complete is not None and not _matches(_read(client, table_name, complete['id']['S']), complete):
        return complete['id']['S'].removeprefix('logv2#').removesuffix('#complete')
    return None


def assert_publication_safe(client, table_name):
    """A disappeared input cannot conceal its partly applied counter effects."""
    if pending_input_identity(client, table_name) is not None:
        raise RuntimeError('Active input remains incomplete; publication blocked')


def _activate(client, table_name, complete):
    previous = _active_completion(client, table_name)
    if previous == complete:
        return
    if previous is not None and previous['id'] == complete['id']:
        raise ValueError('Active input content changed')
    if previous is not None and not _matches(_read(client, table_name, previous['id']['S']), previous):
        raise RuntimeError('Another input remains incomplete; cannot advance')
    guard = {'id': {'S': ACTIVE_INPUT_ID}, 'complete': {'M': complete}}
    try:
        # Reserved single-writer operation. Keep the pointer after completion;
        # replace only once its proof matches, so no DeleteItem grant is needed.
        client.put_item(TableName=table_name, Item=guard)
    except Exception:
        if not _matches(_read(client, table_name, ACTIVE_INPUT_ID), guard):
            raise
    if not _matches(_read(client, table_name, ACTIVE_INPUT_ID), guard):
        raise RuntimeError('Active input guard is not durable')


def apply_log_counts(client, table_name: str, log_key: str, payload_digest: str,
                     counts: dict[str, int], remaining_ms: Callable[[], int]) -> bool:
    """Apply each deterministic chunk once; complete only after durable proof.

    Return True for newly completed input, False for a matching completed or
    legacy input. Propagate unresolved service errors and changed content.
    """
    if not isinstance(log_key, str) or '/' not in log_key or not all(log_key.split('/', 1)):
        raise ValueError('Expected bucket-qualified object key')
    if not isinstance(table_name, str) or not 1 <= len(table_name.encode()) <= 1024:
        raise ValueError('Invalid table name')
    if not isinstance(counts, dict):
        raise ValueError('Expected sanitized aggregate mapping')
    for key, count in counts.items():
        if (not isinstance(key, str) or not (key == 'total#views' or key.startswith(('daily#', 'page#', 'referrer#')))
                or len(key.encode('utf-8')) > MAX_COUNTER_KEY_BYTES
                or type(count) is not int or not 0 <= count < 10**38):
            raise ValueError('Invalid aggregate counter or counter byte budget')
        # Aggregate items have only id/count. Existing numeric overflow is a
        # service error, never permission to mark a chunk or input complete.
        if len(_json_bytes({'id': {'S': key}, 'count': {'N': str(count)}})) > MAX_ITEM_BYTES:
            raise ValueError('Counter exceeds item byte budget')
    if payload_digest != _digest(counts):
        raise ValueError('Sanitized count digest does not match input')

    identity = hashlib.sha256(log_key.encode('utf-8')).hexdigest()
    prefix = f'logv2#{identity}'
    keys = sorted(counts)
    chunks = [dict((key, counts[key]) for key in keys[start:start + CHUNK_COUNTERS])
              for start in range(0, len(keys), CHUNK_COUNTERS)]
    complete = _record(f'{prefix}#complete', payload_digest, len(keys), len(chunks))
    # Validate all request byte sizes before writing any chunk. At most 91
    # actions, distinct keys, tiny fixed-shape counter/record items per request.
    requests = []
    for index, chunk in enumerate(chunks):
        record = _record(f'{prefix}#chunk#{index}', payload_digest, len(chunk), len(chunks), _digest(chunk))
        actions = [{'Update': {'TableName': table_name, 'Key': {'id': {'S': key}},
                    'UpdateExpression': 'ADD #c :n', 'ExpressionAttributeNames': {'#c': 'count'},
                    'ExpressionAttributeValues': {':n': {'N': str(count)}}}} for key, count in chunk.items()]
        actions.append({'Put': {'TableName': table_name, 'Item': record,
                       'ConditionExpression': 'attribute_not_exists(#id)', 'ExpressionAttributeNames': {'#id': 'id'}}})
        request = {'TransactItems': actions}
        if len(actions) > 100 or len(_json_bytes(request)) > MAX_TRANSACTION_BYTES:
            raise ValueError('Transaction exceeds action or byte budget')
        requests.append((record, request))

    _remaining(remaining_ms)
    if _matches(_read(client, table_name, complete['id']['S']), complete):
        return False
    # Legacy marker keys were unqualified, for this single configured bucket.
    # Preserve that historical baseline; do not manufacture v2 proofs for it.
    if _read(client, table_name, 'marker#' + log_key.split('/', 1)[1]) is not None:
        return False
    _activate(client, table_name, complete)
    for record, request in requests:
        _remaining(remaining_ms)
        record_id = record['id']['S']
        if _matches(_read(client, table_name, record_id), record):
            continue
        try:
            client.transact_write_items(**request)
        except Exception:
            # Includes lost responses and conditional conflicts. Only matching
            # strongly consistent durable proof can turn uncertainty into success.
            if not _matches(_read(client, table_name, record_id), record):
                raise
        if not _matches(_read(client, table_name, record_id), record):
            raise RuntimeError('Committed chunk proof unavailable')

    _remaining(remaining_ms)
    try:
        client.put_item(TableName=table_name, Item=complete,
                        ConditionExpression='attribute_not_exists(#id)', ExpressionAttributeNames={'#id': 'id'})
    except Exception:
        if not _matches(_read(client, table_name, complete['id']['S']), complete):
            raise
    if not _matches(_read(client, table_name, complete['id']['S']), complete):
        raise RuntimeError('Completed input proof unavailable')
    return True

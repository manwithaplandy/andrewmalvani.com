import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../../terraform/functions/rewrite-extensionless.js', import.meta.url), 'utf8');

const runHandler = (uri, querystring = {}) => {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  return context.handler({
    request: {cookies: {}, headers: {}, method: 'GET', querystring, uri},
  });
};

test('the actual edge handler maps public pages and leaves static extensions unchanged', () => {
  const cases = [
    ['/', '/index.html'],
    ['/stats', '/stats.html'],
    ['/graph', '/graph.html'],
    ['/assets/resume.pdf', '/assets/resume.pdf'],
    ['/_next/static/example.js', '/_next/static/example.js'],
    ['/does-not-exist', '/does-not-exist.html'],
  ];

  for (const [uri, expected] of cases) {
    const result = runHandler(uri);
    assert.equal(result.uri, expected, uri);
  }
});

test('non-root trailing slashes redirect to the extensionless canonical path', () => {
  for (const uri of ['/stats/', '/graph/']) {
    const result = runHandler(uri);
    assert.ok([301, 308].includes(result.statusCode));
    assert.equal(result.headers.location.value, uri.slice(0, -1));
  }

  const repeatedSlash = runHandler('/stats///');
  assert.equal(repeatedSlash.statusCode, 308);
  assert.equal(repeatedSlash.headers.location.value, '/stats');
});

test('the slash redirect emits each multi-value once and preserves encoded event fields', () => {
  const result = runHandler('/graph/', {
    ampersand: {value: 'left%26right'},
    percent: {value: '100%25'},
    plus: {value: '%2B'},
    phrase: {value: 'hello%20world'},
    tag: {
      multiValue: [{value: 'skills'}, {value: 'roles'}],
      value: 'skills',
    },
  });

  assert.equal(
    result.headers.location.value,
    '/graph?ampersand=left%26right&percent=100%25&plus=%2B&phrase=hello%20world&tag=skills&tag=roles',
  );
  assert.doesNotMatch(result.headers.location.value, /%2520|%252B|%2526|%2525/);

  const target = new URL(result.headers.location.value, 'https://andrewmalvani.com');
  assert.equal(target.searchParams.get('ampersand'), 'left&right');
  assert.equal(target.searchParams.get('percent'), '100%');
  assert.equal(target.searchParams.get('plus'), '+');
  assert.equal(target.searchParams.get('phrase'), 'hello world');
  assert.deepEqual(target.searchParams.getAll('tag'), ['skills', 'roles']);
});

test('unusual slash and backslash paths cannot produce an external Location', () => {
  for (const uri of ['//example.com/path/', '///example.com/path/', '/\\example.com/path/', '\\example.com/path/']) {
    const result = runHandler(uri);
    assert.ok([301, 308].includes(result.statusCode));
    const target = new URL(result.headers.location.value, 'https://andrewmalvani.com');
    assert.equal(target.origin, 'https://andrewmalvani.com', `${uri} produced ${result.headers.location.value}`);
  }
});

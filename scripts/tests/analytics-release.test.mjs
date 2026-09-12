import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {after, before, test} from 'node:test';

import {chromium} from '@playwright/test';

import {analyticsPlanChange, requiresReaderBeforeApply, verifyPublicReader} from '../verify_public_stats_reader.mjs';

const artifactDirectory = path.resolve('out');
const fixture = JSON.parse(await readFile('tests/fixtures/stats-v1.json', 'utf8'));
let browser, server, origin, mode = 'valid';
before(async () => {
  browser = await chromium.launch();
  server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/stats.json') {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(fixture));
      return;
    }
    const filename = url.pathname === '/stats' ? 'stats.html' : url.pathname.slice(1);
    try {
      let bytes = await readFile(path.join(artifactDirectory, filename));
      if (mode === 'stale-html' && filename === 'stats.html') bytes = Buffer.from('<h1>Old reader</h1>');
      if (mode === 'stale-asset' && filename.endsWith('.js')) bytes = Buffer.concat([bytes, Buffer.from('\n/* stale */')]);
      response.setHeader('Content-Type', filename.endsWith('.html') ? 'text/html' : filename.endsWith('.js') ? 'application/javascript' : filename.endsWith('.woff2') ? 'font/woff2' : 'text/css');
      response.end(bytes);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await browser?.close();
  await new Promise(resolve => server?.close(resolve));
});

test('served candidate reader passes actual legacy and synthetic v1/v2 behavior', async () => {
  mode = 'valid';
  const result = await verifyPublicReader({origin, artifactDirectory, browser, allowLocal: true});
  assert.equal(result.livePayloadVersion, 1);
  assert.deepEqual(result.contracts, ['live', 'v1', 'v2']);
  assert.ok(result.assets.length > 0);
});

test('stale cached HTML blocks release before reader behavior can pass', async () => {
  mode = 'stale-html';
  await assert.rejects(verifyPublicReader({origin, artifactDirectory, browser, allowLocal: true}), /HTML differs/);
});

test('stale asset bytes block release even if appended bytes still render correctly', async () => {
  mode = 'stale-asset';
  await assert.rejects(verifyPublicReader({origin, artifactDirectory, browser, allowLocal: true}), /asset differs/);
});

// Deliver recorded response metadata through the real verifier's response
// listener while the actual checked reader/browser exercises all contracts.
function browserWithAssetResponses({extra = [], hidePath} = {}) {
  return {async newContext(options) {
    const context = await browser.newContext(options);
    const newPage = context.newPage.bind(context);
    context.newPage = async () => {
      const page = await newPage();
      const on = page.on.bind(page);
      page.on = (event, listener) => {
        if (event !== 'response') return on(event, listener);
        page.once('domcontentloaded', () => extra.forEach(listener));
        return on(event, response => {
          if (new URL(response.url()).pathname !== hidePath) listener(response);
        });
      };
      return page;
    };
    return context;
  }};
}

function assetResponse({pathname = '/_next/static/chunks/optional.js', status = 503,
  purpose = 'prefetch', resourceType = 'other', bytes = Buffer.alloc(0)} = {}) {
  return {
    url: () => origin + pathname,
    status: () => status,
    headers: () => ({'cf-speculation-refused': 'prefetch refused: not eligible'}),
    request: () => ({method: () => 'GET', resourceType: () => resourceType,
      isNavigationRequest: () => false, headerValue: async name => name === 'sec-purpose' ? purpose : null}),
    body: async () => bytes,
  };
}

test('proven optional prefetch refusal and canceled empty response do not block actual reader assets', async () => {
  mode = 'valid';
  const result = await verifyPublicReader({origin, artifactDirectory, allowLocal: true,
    browser: browserWithAssetResponses({extra: [assetResponse(), assetResponse({status: 200})]})});
  assert.deepEqual(result.contracts, ['live', 'v1', 'v2']);
  assert.ok(!result.assets.some(asset => asset.url.endsWith('/optional.js')));
});

test('prefetch headers never waive script, stylesheet or unproven other-request failures', async () => {
  mode = 'valid';
  for (const metadata of [{resourceType: 'script'}, {resourceType: 'stylesheet'}, {purpose: null}]) {
    await assert.rejects(verifyPublicReader({origin, artifactDirectory, allowLocal: true,
      browser: browserWithAssetResponses({extra: [assetResponse(metadata)]})}), /asset not available/);
  }
});

test('a speculative-only expected script cannot satisfy required asset accounting', async () => {
  mode = 'valid';
  const html = await readFile(path.join(artifactDirectory, 'stats.html'), 'utf8');
  const pathname = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)]
    .find(match => !/\bnomodule\b/i.test(match[0]))[1];
  const bytes = await readFile(path.join(artifactDirectory, pathname.slice(1)));
  await assert.rejects(verifyPublicReader({origin, artifactDirectory, allowLocal: true,
    browser: browserWithAssetResponses({hidePath: pathname,
      extra: [assetResponse({pathname, status: 200, bytes})]})}), /script was not loaded and verified/);
});

test('release endpoints require HTTPS and an origin without path/query/credentials', async () => {
  for (const invalid of ['http://example.com', 'https://example.com/stats', 'https://a:b@example.com', 'https://example.com/?bypass=1']) {
    await assert.rejects(verifyPublicReader({origin: invalid, artifactDirectory, browser}), /origin/);
  }
});

test('create and replace require pre-apply reader proof; update does not bypass later verification', () => {
  const plan = actions => ({format_version: '1.2', resource_changes: [
    {type: 'aws_lambda_function', name: 'stats_aggregator', change: {actions}},
  ]});
  assert.equal(requiresReaderBeforeApply(plan(['create'])), true);
  assert.equal(requiresReaderBeforeApply(plan(['delete', 'create'])), true);
  assert.equal(requiresReaderBeforeApply(plan(['update'])), false);
  assert.equal(requiresReaderBeforeApply(plan(['no-op'])), false);
  assert.throws(() => requiresReaderBeforeApply({}), /plan/);
  assert.throws(() => requiresReaderBeforeApply(plan(['unexpected'])), /actions/);
});

test('analytics plan changes are identified for the migration approval gate', () => {
  const plan = actions => ({format_version: '1.2', resource_changes: [
    {type: 'aws_lambda_function', name: 'stats_aggregator', change: {actions}},
  ]});
  assert.equal(analyticsPlanChange(plan(['create'])), true);
  assert.equal(analyticsPlanChange(plan(['update'])), true);
  assert.equal(analyticsPlanChange(plan(['delete', 'create'])), true);
  assert.equal(analyticsPlanChange(plan(['delete'])), true);
  assert.equal(analyticsPlanChange(plan(['no-op'])), false);
  assert.equal(analyticsPlanChange({format_version: '1.2', resource_changes: []}), false);
  assert.throws(() => analyticsPlanChange(plan(['unexpected'])), /actions/);
});

test('schedule-only admission changes require migration approval without bootstrap reader proof', () => {
  const plan = {format_version: '1.2', resource_changes: [
    {type: 'aws_lambda_function', name: 'stats_aggregator', change: {actions: ['no-op']}},
    {type: 'aws_cloudwatch_event_rule', name: 'stats_aggregator_daily', change: {
      actions: ['update'], before: {state: 'DISABLED'}, after: {state: 'ENABLED'},
    }},
  ]};
  assert.equal(analyticsPlanChange(plan), true);
  assert.equal(requiresReaderBeforeApply(plan), false);
});

test('analytics dependencies and recoverable website storage require migration approval', () => {
  const plan = (type, name, actions = ['update']) => ({format_version: '1.2', resource_changes: [
    {type, name, change: {actions}},
  ]});
  const dedicatedResources = [
    ['aws_cloudwatch_event_rule', 'stats_aggregator_daily'],
    ['aws_cloudwatch_event_target', 'stats_aggregator_daily'],
    ['aws_cloudwatch_log_group', 'stats_aggregator'],
    ['aws_cloudwatch_metric_alarm', 'stats_aggregator_errors'],
    ['aws_dynamodb_table', 'data_table'],
    ['aws_iam_policy', 'stats_aggregator_access'],
    ['aws_iam_role', 'stats_aggregator_exec'],
    ['aws_iam_role_policy_attachment', 'stats_aggregator_access_attach'],
    ['aws_iam_role_policy_attachment', 'stats_aggregator_basic_execution'],
    ['aws_lambda_function', 'stats_aggregator'],
    ['aws_lambda_permission', 'stats_aggregator_events'],
    ['aws_s3_bucket', 'log_bucket'],
    ['aws_s3_bucket_lifecycle_configuration', 'log_bucket_lifecycle'],
    ['aws_s3_bucket_ownership_controls', 'example'],
    ['aws_s3_bucket_policy', 'allow_cloudfront_logs'],
    ['aws_s3_bucket_versioning', 'log_bucket_versioning'],
    ['aws_s3_bucket_versioning', 'website_versioning'],
  ];
  for (const [type, name] of dedicatedResources) {
    assert.equal(analyticsPlanChange(plan(type, name)), true, `${type}.${name} escaped the analytics boundary`);
  }
  assert.equal(analyticsPlanChange(plan('aws_s3_bucket', 'website', ['delete', 'create'])), true);
  assert.equal(analyticsPlanChange(plan('aws_s3_bucket', 'website')), false);
  assert.equal(analyticsPlanChange(plan('aws_s3_bucket_logging', 'website_logs')), false);
  assert.equal(analyticsPlanChange(plan('aws_s3_bucket_logging', 'log_bucket_logs', ['delete'])), false);
  assert.equal(analyticsPlanChange(plan('aws_lambda_function', 'form_submission')), false);
  assert.equal(requiresReaderBeforeApply(plan('aws_dynamodb_table', 'data_table', ['create'])), false);
});

test('only CloudFront logging changes and real unknown logging leaves require approval', () => {
  const distribution = ({before, after, afterUnknown}) => ({format_version: '1.2', resource_changes: [{
    type: 'aws_cloudfront_distribution',
    name: 'website_distribution',
    change: {actions: ['update'], before, after, after_unknown: afterUnknown},
  }]});
  const logging = [{bucket: 'logs.s3.amazonaws.com', include_cookies: false, prefix: 'cloudfront-logs/'}];
  assert.equal(analyticsPlanChange(distribution({
    before: {logging_config: logging, default_cache_behavior: [{cache_policy_id: 'old'}]},
    after: {logging_config: logging, default_cache_behavior: [{cache_policy_id: 'new'}]},
    afterUnknown: {logging_config: [{}], default_cache_behavior: [{cache_policy_id: true}]},
  })), false);
  assert.equal(analyticsPlanChange(distribution({
    before: {logging_config: logging},
    after: {logging_config: [{...logging[0], prefix: 'new-prefix/'}]},
    afterUnknown: {logging_config: [{}]},
  })), true);
  assert.equal(analyticsPlanChange(distribution({
    before: {logging_config: logging},
    after: {logging_config: logging},
    afterUnknown: {logging_config: [{bucket: true}]},
  })), true);
});

/** Read-only release gate. Ordinary public requests; never uploads or purges. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';

import {chromium, expect} from '@playwright/test';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fixtureDirectory = fileURLToPath(new URL('../tests/fixtures/', import.meta.url));
const MAX_BYTES = 4 * 1024 * 1024;
const PLAN_ACTIONS = new Set(['no-op', 'create', 'read', 'update', 'delete']);
const ANALYTICS_RESOURCES = new Set([
  'aws_cloudwatch_event_rule.stats_aggregator_daily',
  'aws_cloudwatch_event_target.stats_aggregator_daily',
  'aws_cloudwatch_log_group.stats_aggregator',
  'aws_cloudwatch_metric_alarm.stats_aggregator_errors',
  'aws_dynamodb_table.data_table',
  'aws_iam_policy.stats_aggregator_access',
  'aws_iam_role.stats_aggregator_exec',
  'aws_iam_role_policy_attachment.stats_aggregator_access_attach',
  'aws_iam_role_policy_attachment.stats_aggregator_basic_execution',
  'aws_lambda_function.stats_aggregator',
  'aws_lambda_permission.stats_aggregator_events',
  'aws_s3_bucket.log_bucket',
  'aws_s3_bucket_lifecycle_configuration.log_bucket_lifecycle',
  'aws_s3_bucket_ownership_controls.example',
  'aws_s3_bucket_policy.allow_cloudfront_logs',
  'aws_s3_bucket_versioning.log_bucket_versioning',
  'aws_s3_bucket_versioning.website_versioning',
]);
const WEBSITE_BUCKET = 'aws_s3_bucket.website';
const DISTRIBUTION = 'aws_cloudfront_distribution.website_distribution';

function hasUnknownLeaf(value) {
  if (value === true) return true;
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).some(hasUnknownLeaf);
}

function isAnalyticsBoundaryChange(resource, actions) {
  const key = `${resource.type}.${resource.name}`;
  if (ANALYTICS_RESOURCES.has(key)) return actions.some(action => action !== 'no-op');
  if (key === WEBSITE_BUCKET) return actions.includes('create') || actions.includes('delete');
  if (key !== DISTRIBUTION) return false;

  const before = resource.change?.before?.logging_config ?? null;
  const after = resource.change?.after?.logging_config ?? null;
  const unknown = resource.change?.after_unknown?.logging_config;
  return !isDeepStrictEqual(before, after) || hasUnknownLeaf(unknown);
}

function analyticsActions(plan) {
  assert.ok(plan && /^1\./.test(plan.format_version) && Array.isArray(plan.resource_changes), 'Unrecognized Terraform plan; inspect before apply');
  const changes = [];
  for (const resource of plan.resource_changes) {
    assert.ok(resource && typeof resource.type === 'string' && typeof resource.name === 'string', 'Unrecognized resource in Terraform plan');
    const key = `${resource.type}.${resource.name}`;
    if (!ANALYTICS_RESOURCES.has(key) && key !== WEBSITE_BUCKET && key !== DISTRIBUTION) continue;
    const actions = resource.change?.actions;
    assert.ok(Array.isArray(actions) && actions.length > 0 && actions.every(action => PLAN_ACTIONS.has(action)), 'Unrecognized producer plan actions');
    changes.push({key, actions, analyticsBoundary: isAnalyticsBoundaryChange(resource, actions)});
  }
  return changes;
}

export function requiresReaderBeforeApply(plan) {
  return analyticsActions(plan).some(change => change.key === 'aws_lambda_function.stats_aggregator' && change.actions.includes('create'));
}

export function analyticsPlanChange(plan) {
  return analyticsActions(plan).some(change => change.analyticsBoundary);
}

function releaseOrigin(value, allowLocal) {
  const url = new URL(value);
  assert.ok((url.protocol === 'https:' || (allowLocal && url.protocol === 'http:' && url.hostname === '127.0.0.1')) &&
    !url.username && !url.password && !url.search && !url.hash && url.pathname === '/', 'Expected HTTPS origin without credentials, path or cache-busting query');
  return url.origin;
}

export async function verifyPublicReader({origin, artifactDirectory, browser, allowLocal = false}) {
  origin = releaseOrigin(origin, allowLocal);
  artifactDirectory = path.resolve(artifactDirectory);
  const expectedHtml = await readFile(path.join(artifactDirectory, 'stats.html'));
  assert.ok(expectedHtml.length < MAX_BYTES, 'Reader HTML exceeds verification bound');
  const expectedScripts = [...expectedHtml.toString().matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)]
    .filter(match => !/\bnomodule\b/i.test(match[0])).map(match => match[1]);
  assert.ok(expectedScripts.length > 0 && expectedScripts.every(src => src.startsWith('/_next/static/')), 'Candidate reader has unexpected script references');
  const fixtures = {
    v1: JSON.parse(await readFile(path.join(fixtureDirectory, 'stats-v1.json'), 'utf8')),
    v2: JSON.parse(await readFile(path.join(fixtureDirectory, 'stats-v2-current.json'), 'utf8')),
  };
  const result = {origin, observedAt: new Date().toISOString(), htmlSha256: sha256(expectedHtml), assets: [], contracts: []};
  for (const contract of ['live', 'v1', 'v2']) {
    const context = await browser.newContext({serviceWorkers: 'block'});
    try {
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (route.request().method() !== 'GET' || url.origin !== origin) return route.abort();
        if (contract !== 'live' && url.pathname === '/stats.json') return route.fulfill({json: fixtures[contract]});
        return route.continue();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(10_000);
      if (contract !== 'live') await page.clock.setFixedTime(new Date('2026-09-08T12:00:00Z'));
      const pending = [], assets = new Map(), assetErrors = [];
      page.on('response', response => {
        const url = new URL(response.url());
        if (url.origin !== origin || !url.pathname.startsWith('/_next/static/')) return;
        pending.push((async () => {
          const request = response.request();
          // Browser speculation can be refused or canceled without executing an
          // asset. Never let it fail verification or satisfy required scripts.
          if (request.method() === 'GET' && request.resourceType() === 'other' &&
              !request.isNavigationRequest() &&
              (await request.headerValue('sec-purpose'))?.trim().toLowerCase() === 'prefetch') return;
          assert.equal(response.status(), 200, 'Public reader asset not available');
          const actual = await response.body();
          assert.ok(actual.length < MAX_BYTES, 'Public asset exceeds verification bound');
          const filename = path.resolve(artifactDirectory, '.' + url.pathname);
          assert.ok(filename.startsWith(artifactDirectory + path.sep), 'Public asset path escapes candidate artifact');
          const expected = await readFile(filename);
          assert.equal(sha256(actual), sha256(expected), `Public reader asset differs from candidate: ${url.pathname}`);
          assets.set(url.pathname, sha256(actual));
        })().catch(error => assetErrors.push(error)));
      });
      const statsResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/stats.json');
      // The response may reject when stale HTML has no loader. Consume the
      // rejection without hiding it on the valid-HTML path below.
      statsResponse.catch(() => {});
      const response = await page.goto(origin + '/stats', {waitUntil: 'domcontentloaded', timeout: 20_000});
      assert.equal(response?.status(), 200, 'Public stats reader is unavailable');
      assert.equal(sha256(await response.body()), sha256(expectedHtml), 'Public HTML differs from the candidate reader artifact; stage it and wait for cache propagation before proceeding');
      const dataResponse = await statsResponse;
      assert.equal(dataResponse.status(), 200, 'Existing public payload must remain available during reader verification');
      const dataBytes = await dataResponse.body();
      assert.ok(dataBytes.length < MAX_BYTES, 'Public payload exceeds verification bound');
      const payload = JSON.parse(dataBytes.toString());
      assert.ok(payload.schemaVersion === undefined || payload.schemaVersion === 2, 'Unsupported live payload version');
      await expect(page.getByTestId('daily-unique-visits')).toContainText('Daily unique visits (sum)');
      await expect(page.getByText('Requests by country', {exact: true})).toBeVisible();
      await expect(page.locator('#methodology')).toContainText('does not load a client-side tracking script');
      await expect(page.locator('#methodology')).toContainText('30 days after they become noncurrent');
      if (payload.schemaVersion === undefined) {
        await expect(page.getByText('Legacy source — freshness unavailable', {exact: true})).toHaveCount(2);
        await expect(page.getByText('Legacy data: zero daily values may mean missing data.', {exact: true})).toBeVisible();
      }
      if (contract === 'v2') {
        await expect(page.getByTestId('document-requests')).toContainText('Current');
        await expect(page.getByTestId('daily-unique-visits')).toContainText('Cloudflare coverage: September 2–7, 2026');
        await expect(page.getByText('September 7, 2026: 0 requests, provisional', {exact: true})).toBeVisible();
      }
      await page.getByText('Daily values and status', {exact: true}).click();
      const today = contract === 'live' ? new Date() : new Date('2026-09-08T12:00:00Z');
      const currentDay = today.toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'});
      await expect(page.getByRole('cell', {name: currentDay, exact: true})).toHaveCount(0);
      await page.waitForLoadState('networkidle');
      await Promise.all(pending);
      if (assetErrors.length) throw assetErrors[0];
      assert.ok(expectedScripts.every(src => assets.has(new URL(src, origin).pathname)), 'Candidate reader script was not loaded and verified');
      if (contract === 'live') {
        result.livePayloadVersion = payload.schemaVersion ?? 1;
        result.assets = [...assets].map(([url, digest]) => ({url, sha256: digest}));
        const headers = response.headers();
        result.cacheHeaders = Object.fromEntries(['cache-control', 'age', 'cf-cache-status', 'x-cache'].filter(key => headers[key]).map(key => [key, headers[key]]));
      }
      result.contracts.push(contract);
    } finally {
      await context.close();
    }
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const value = flag => args[args.indexOf(flag) + 1];
  try {
    if (args.includes('--plan')) {
      const plan = JSON.parse(await readFile(value('--plan'), 'utf8'));
      console.log(`requires_reader=${requiresReaderBeforeApply(plan)}`);
      console.log(`analytics_change=${analyticsPlanChange(plan)}`);
    } else {
      assert.ok(args.includes('--artifact-dir') && args.includes('--report'), 'Use --artifact-dir, --origin (repeatable), and --report');
      const origins = args.flatMap((argument, index) => argument === '--origin' ? [args[index + 1]] : []);
      assert.ok(origins.length > 0, 'At least one public origin is required');
      const browser = await chromium.launch();
      try {
        const results = [];
        for (const origin of origins) results.push(await verifyPublicReader({origin, browser, artifactDirectory: value('--artifact-dir')}));
        await writeFile(value('--report'), JSON.stringify({candidateCommit: process.env.GITHUB_SHA ?? null, results}, null, 2) + '\n');
        console.log('Verified candidate reader bytes and live/v1/v2 behavior at each requested public origin.');
      } finally {
        await browser.close();
      }
    }
  } catch (error) {
    console.error(`Analytics reader release blocked: ${error.message}`);
    process.exitCode = 1;
  }
}

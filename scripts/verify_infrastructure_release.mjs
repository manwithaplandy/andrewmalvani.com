/** Gate for push releases that apply Terraform outside the analytics boundary. Reads private plan JSON; never applies. */
import {createHash} from 'node:crypto';
import {readFileSync, statSync, writeFileSync, appendFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';

import {isAnalyticsBoundaryChange} from './verify_public_stats_reader.mjs';
import {OLD_ALARM, NEW_ALARM, REQUIRED} from './verify_website_contact_release.mjs';

class InfrastructureError extends Error {}
const requireSafe = (value, code) => { if (!value) throw new InfrastructureError(code); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const ACTIONS = [['create'], ['update'], ['delete'], ['delete', 'create'], ['create', 'delete']];
// Destroying or replacing these loses data, so a push release refuses it.
const STATEFUL_TYPES = new Set(['aws_s3_bucket', 'aws_s3_object', 'aws_s3_bucket_versioning', 'aws_dynamodb_table', 'aws_cloudwatch_log_group']);
const ADDRESS = /^[a-z0-9_]+\.[A-Za-z0-9_-]+(\[(\d+|"[A-Za-z0-9_.-]+")\])?$/;

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (object(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

function changedFields(change) {
  const before = object(change.before) ? change.before : {};
  const after = object(change.after) ? change.after : {};
  const unknown = object(change.after_unknown) ? change.after_unknown : {};
  return [...new Set([...Object.keys(before), ...Object.keys(after), ...Object.keys(unknown)])]
    .filter(key => !isDeepStrictEqual(before[key], after[key]) || (unknown[key] !== undefined && unknown[key] !== false))
    .sort();
}

// The two stats drifts the website/contact gate admits stay pending for the
// analytics release. Anything else in the analytics boundary stops here.
function deferredAnalyticsDrift(row) {
  const {change} = row;
  if (!isDeepStrictEqual(change.actions, ['update'])) return false;
  const fields = changedFields(change);
  if (row.address === 'aws_lambda_function.stats_aggregator') {
    return isDeepStrictEqual(fields, ['reserved_concurrent_executions']) &&
      change.before.reserved_concurrent_executions === -1 && change.after.reserved_concurrent_executions === 1;
  }
  if (row.address === 'aws_cloudwatch_metric_alarm.stats_aggregator_errors') {
    return isDeepStrictEqual(fields, ['alarm_description']) &&
      change.before.alarm_description === OLD_ALARM && change.after.alarm_description === NEW_ALARM;
  }
  return false;
}

function changedRows(plan) {
  requireSafe(object(plan) && /^1\.\d+$/.test(plan.format_version) && plan.complete === true && plan.errored === false, 'INVALID_COMPLETE_PLAN');
  requireSafe(plan.deferred_changes === undefined || (Array.isArray(plan.deferred_changes) && plan.deferred_changes.length === 0), 'DEFERRED_PLAN');
  requireSafe(Array.isArray(plan.resource_changes) && plan.resource_changes.length <= 10000, 'INVALID_RESOURCES');
  const seen = new Set();
  const rows = [];
  for (const row of plan.resource_changes) {
    requireSafe(object(row) && row.mode === 'managed' && typeof row.address === 'string' && ADDRESS.test(row.address) &&
      row.address === `${row.type}.${row.name}${row.index === undefined ? '' : `[${JSON.stringify(row.index)}]`}` &&
      !seen.has(row.address), 'INVALID_MANAGED_IDENTITY');
    seen.add(row.address);
    const {change} = row;
    requireSafe(object(change) && Array.isArray(change.actions), 'INVALID_PLAN_ACTION');
    if (isDeepStrictEqual(change.actions, ['no-op'])) continue;
    requireSafe(ACTIONS.some(actions => isDeepStrictEqual(actions, change.actions)), 'DISALLOWED_PLAN_ACTION');
    requireSafe(!row.deposed && !row.previous_address && !change.importing, 'IMPORT_OR_MOVE');
    rows.push(row);
  }
  return rows;
}

// allowDestroy is the manual override for an intentional destroy or
// replacement. It never opens the analytics boundary.
function admit(row, allowDestroy) {
  const {actions} = row.change;
  // Addresses and actions are not secret; name them so the log says what stopped.
  const detail = `${row.address} ${actions.join(' then ')}`;
  requireSafe(!isAnalyticsBoundaryChange(row, actions), `ANALYTICS_RELEASE_REQUIRED ${detail}`);
  if (!allowDestroy) {
    requireSafe(!(STATEFUL_TYPES.has(row.type) && actions.includes('delete')), `STATEFUL_RESOURCE_DESTROY ${detail}`);
    requireSafe(!(REQUIRED[row.address] && actions.includes('delete')), `PROTECTED_IDENTITY_REPLACEMENT ${detail}`);
  }
  return true;
}

/** Full plan in, addresses to target out. Deferred stats drifts are left for the analytics release. */
export function selectTargets(plan, {allowDestroy = false} = {}) {
  const targets = [];
  for (const row of changedRows(plan)) {
    if (deferredAnalyticsDrift(row)) continue;
    admit(row, allowDestroy);
    targets.push(row.address);
  }
  return targets.sort();
}

/** Targeted plan in: it must change exactly the selected addresses and nothing analytics-owned. */
export function checkTargetedPlan(plan, targets, {allowDestroy = false} = {}) {
  const rows = changedRows(plan);
  requireSafe(Array.isArray(targets) && targets.length > 0 && targets.every(target => ADDRESS.test(target)), 'INVALID_TARGETS');
  requireSafe(isDeepStrictEqual(rows.map(row => row.address).sort(), [...targets].sort()), 'TARGETED_PLAN_MISMATCH');
  for (const row of rows) {
    requireSafe(!deferredAnalyticsDrift(row), `ANALYTICS_RELEASE_REQUIRED ${row.address}`);
    admit(row, allowDestroy);
  }
  // The digest covers values and records exactly what was applied. Only the
  // digest, addresses and field names leave the private job.
  const material = rows.map(row => ({address: row.address, actions: row.change.actions, before: row.change.before ?? null,
    after: row.change.after ?? null, after_unknown: row.change.after_unknown ?? null, replace_paths: row.change.replace_paths ?? null}));
  const digest = createHash('sha256').update(JSON.stringify(canonical(material))).digest('hex');
  const summary = rows.map(row => ({address: row.address, actions: row.change.actions,
    fields: row.change.actions.includes('update') ? changedFields(row.change) : []}));
  return {digest, summary};
}

export function renderSummary({digest, summary}) {
  const lines = ['### Applied non-analytics infrastructure plan', '', '| Resource | Action | Changed fields |', '| --- | --- | --- |'];
  for (const row of summary) lines.push(`| \`${row.address}\` | ${row.actions.join(' then ')} | ${row.fields.join(', ') || '—'} |`);
  lines.push('', `Plan digest: \`${digest}\``);
  return lines.join('\n') + '\n';
}

function readJSON(file) {
  requireSafe(statSync(file).size <= 32 * 1024 * 1024, 'INPUT_BYTE_BOUND');
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function main(argv = process.argv.slice(2)) {
  try {
    const [command, ...args] = argv;
    const accepted = {select: ['plan', 'output', 'allow-destroy'], check: ['plan', 'targets', 'summary', 'allow-destroy']}[command];
    requireSafe(accepted && args.length === accepted.length * 2, 'INVALID_ARGUMENTS');
    const opts = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].slice(2);
      requireSafe(args[i].startsWith('--') && accepted.includes(key) && !Object.hasOwn(opts, key) && typeof args[i + 1] === 'string', 'INVALID_ARGUMENTS');
      opts[key] = args[i + 1];
    }
    requireSafe(['true', 'false'].includes(opts['allow-destroy']), 'INVALID_ARGUMENTS');
    const options = {allowDestroy: opts['allow-destroy'] === 'true'};
    if (command === 'select') {
      const targets = selectTargets(readJSON(opts.plan), options);
      writeFileSync(opts.output, targets.map(target => `${target}\n`).join(''), {mode: 0o600});
      console.log(`targets=${targets.length}`);
      return 0;
    }
    const targets = readFileSync(opts.targets, 'utf8').split('\n').filter(Boolean);
    const result = checkTargetedPlan(readJSON(opts.plan), targets, options);
    appendFileSync(opts.summary, renderSummary(result));
    console.log(`digest=${result.digest}`);
    return 0;
  } catch (error) {
    console.error(error instanceof InfrastructureError ? error.message : 'INFRASTRUCTURE_CHECK_FAILED');
    return 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main();

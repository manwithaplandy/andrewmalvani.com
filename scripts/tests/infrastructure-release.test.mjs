import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';
import {selectTargets, checkTargetedPlan, renderSummary, main} from '../verify_infrastructure_release.mjs';
import {OLD_ALARM, NEW_ALARM} from '../verify_website_contact_release.mjs';

const SENTINEL = 'PRIVATE_FIXTURE_SENTINEL';
function row(address, actions, before, after, extra = {}) {
  const [type, rest] = address.split('.');
  const name = rest.replace(/\[.*$/, '');
  const index = rest.includes('[') ? JSON.parse(rest.slice(rest.indexOf('[') + 1, -1)) : undefined;
  return {address, mode: 'managed', type, name, ...(index === undefined ? {} : {index}),
    change: {actions, before, after, after_unknown: {}, ...extra}};
}
const drifts = () => [
  row('aws_lambda_function.stats_aggregator', ['update'], {function_name: 'statsAggregator', environment: [{variables: {TOKEN: SENTINEL}}], reserved_concurrent_executions: -1},
    {function_name: 'statsAggregator', environment: [{variables: {TOKEN: SENTINEL}}], reserved_concurrent_executions: 1}),
  row('aws_cloudwatch_metric_alarm.stats_aggregator_errors', ['update'], {alarm_description: OLD_ALARM, threshold: 1}, {alarm_description: NEW_ALARM, threshold: 1}),
];
function plan(rows) {
  return {format_version: '1.2', complete: true, errored: false, resource_changes: [
    row('aws_s3_bucket.website', ['no-op'], {bucket: 'site'}, {bucket: 'site'}), ...rows]};
}
const pending = () => [
  row('aws_dynamodb_table.contact_daily_sends', ['create'], null, {name: 'website-contact-daily-sends'}),
  row('aws_lambda_function.form_submission', ['update'], {runtime: 'python3.9', environment: [{variables: {SNS_TOPIC_ARN: SENTINEL}}]},
    {runtime: 'python3.12', environment: [{variables: {SNS_TOPIC_ARN: SENTINEL}}]}),
  row('aws_cloudfront_cache_policy.site["stable"]', ['update'], {min_ttl: 0}, {min_ttl: 1}),
];

test('selects pending non-analytics changes and leaves the two deferred stats drifts', () => {
  assert.deepEqual(selectTargets(plan([...drifts(), ...pending()])), [
    'aws_cloudfront_cache_policy.site["stable"]', 'aws_dynamodb_table.contact_daily_sends', 'aws_lambda_function.form_submission']);
  assert.deepEqual(selectTargets(plan(drifts())), []);
  assert.deepEqual(selectTargets(plan([])), []);
});

test('any other analytics-boundary change stops the push release, even with the override', () => {
  const changed = drifts();
  changed[0].change.after.timeout = 30;
  const cases = [
    changed,
    [row('aws_s3_bucket_policy.allow_cloudfront_logs', ['update'], {policy: 'a'}, {policy: 'b'})],
    [row('aws_cloudfront_distribution.website_distribution', ['update'], {logging_config: [{bucket: 'a'}]}, {logging_config: []})],
    [row('aws_s3_bucket.website', ['delete', 'create'], {bucket: 'site'}, {bucket: 'site'})],
  ];
  for (const rows of cases) for (const allowDestroy of [false, true]) {
    const p = plan([]); p.resource_changes = rows;
    assert.throws(() => selectTargets(p, {allowDestroy}), /ANALYTICS_RELEASE_REQUIRED/);
  }
});

test('stateful destroys and protected replacements need the override, and the error names them', () => {
  for (const [address, actions, code] of [
    ['aws_dynamodb_table.contact_daily_sends', ['delete', 'create'], 'STATEFUL_RESOURCE_DESTROY'],
    ['aws_s3_bucket.other', ['delete'], 'STATEFUL_RESOURCE_DESTROY'],
    ['aws_cloudwatch_log_group.contact', ['create', 'delete'], 'STATEFUL_RESOURCE_DESTROY'],
    ['aws_lambda_function.form_submission', ['delete', 'create'], 'PROTECTED_IDENTITY_REPLACEMENT'],
    ['aws_api_gateway_rest_api.api', ['delete'], 'PROTECTED_IDENTITY_REPLACEMENT'],
  ]) {
    const p = plan([row(address, actions, {name: 'x'}, actions.includes('create') ? {name: 'x'} : null)]);
    assert.throws(() => selectTargets(p), error => error.message === `${code} ${address} ${actions.join(' then ')}`);
    assert.deepEqual(selectTargets(p, {allowDestroy: true}), [address]);
  }
  assert.deepEqual(selectTargets(plan([row('aws_iam_policy.old', ['delete'], {name: 'old'}, null)])), ['aws_iam_policy.old']);
});

test('malformed, moved or imported plans fail closed', () => {
  for (const mutate of [p => p.complete = false, p => p.errored = true, p => p.format_version = '2.0', p => p.deferred_changes = [{}],
    p => p.resource_changes[1].address = 'wrong', p => p.resource_changes[1].mode = 'data', p => p.resource_changes[1].change.actions = ['read'],
    p => p.resource_changes[1].previous_address = 'aws_dynamodb_table.old', p => p.resource_changes[1].change.importing = {id: 'x'},
    p => p.resource_changes[1].deposed = 'dead', p => p.resource_changes.push(structuredClone(p.resource_changes[1]))]) {
    const p = plan(pending()); mutate(p);
    assert.throws(() => selectTargets(p));
  }
});

test('targeted plan must match the selection exactly and its digest tracks values without exposing them', () => {
  const targets = selectTargets(plan([...drifts(), ...pending()]));
  const result = checkTargetedPlan(plan(pending()), targets);
  assert.match(result.digest, /^[0-9a-f]{64}$/);
  assert.equal(checkTargetedPlan(plan(pending()), targets).digest, result.digest);
  const changed = pending(); changed[1].change.after.runtime = 'python3.13';
  assert.notEqual(checkTargetedPlan(plan(changed), targets).digest, result.digest);
  assert.deepEqual(result.summary.map(entry => entry.fields), [[], ['runtime'], ['min_ttl']]);
  const rendered = renderSummary(result);
  assert.ok(!rendered.includes(SENTINEL) && !rendered.includes('python3') && rendered.includes(result.digest));

  assert.throws(() => checkTargetedPlan(plan([...pending(), drifts()[1]]), targets), /TARGETED_PLAN_MISMATCH/);
  assert.throws(() => checkTargetedPlan(plan(pending().slice(1)), targets), /TARGETED_PLAN_MISMATCH/);
  assert.throws(() => checkTargetedPlan(plan(drifts().slice(1)), ['aws_cloudwatch_metric_alarm.stats_aggregator_errors']), /ANALYTICS_RELEASE_REQUIRED/);
  assert.throws(() => checkTargetedPlan(plan(pending()), []), /INVALID_TARGETS/);
  const replaced = pending(); replaced[0].change.actions = ['delete', 'create'];
  assert.throws(() => checkTargetedPlan(plan(replaced), targets), /STATEFUL_RESOURCE_DESTROY/);
  assert.equal(checkTargetedPlan(plan(replaced), targets, {allowDestroy: true}).summary[0].actions.join(), 'delete,create');
});

test('CLI requires an explicit override value and reports only codes', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'infrastructure-cli-'));
  const quiet = console.log, loud = console.error, lines = [];
  console.log = console.error = line => lines.push(line);
  try {
    const file = name => path.join(directory, name);
    writeFileSync(file('plan.json'), JSON.stringify(plan([...drifts(), ...pending()])));
    writeFileSync(file('targeted.json'), JSON.stringify(plan(pending())));
    writeFileSync(file('summary.md'), '');
    assert.equal(main(['select', '--plan', file('plan.json'), '--output', file('targets.txt')]), 1);
    assert.equal(main(['select', '--plan', file('plan.json'), '--output', file('targets.txt'), '--allow-destroy', 'yes']), 1);
    assert.equal(main(['select', '--plan', file('plan.json'), '--output', file('targets.txt'), '--allow-destroy', 'false']), 0);
    assert.equal(readFileSync(file('targets.txt'), 'utf8').split('\n').filter(Boolean).length, 3);
    assert.equal(main(['check', '--plan', file('targeted.json'), '--targets', file('targets.txt'), '--summary', file('summary.md'), '--allow-destroy', 'false']), 0);
    assert.match(readFileSync(file('summary.md'), 'utf8'), /Applied non-analytics infrastructure plan/);
    assert.equal(main(['check', '--plan', file('plan.json'), '--targets', file('targets.txt'), '--summary', file('summary.md'), '--allow-destroy', 'false']), 1);
    assert.equal(main(['select', '--plan', file('missing.json'), '--output', file('targets.txt'), '--allow-destroy', 'false']), 1);
    assert.ok(!lines.join('\n').includes(SENTINEL));
    assert.ok(lines.includes('TARGETED_PLAN_MISMATCH') && lines.includes('INFRASTRUCTURE_CHECK_FAILED'));
  } finally {
    console.log = quiet; console.error = loud;
    rmSync(directory, {recursive: true, force: true});
  }
});

function runStep(workflow, name) {
  const start = workflow.indexOf(`      - name: ${name}\n`);
  assert.notEqual(start, -1, `Missing workflow step: ${name}`);
  const remainder = workflow.slice(start);
  const step = remainder.slice(0, remainder.indexOf('\n      - name:', 1));
  return step.match(/        run: \|\n((?:          .*\n?)+)/)[1].replace(/^ {10}/gm, '');
}

test('actual workflow step applies only a checked targeted plan, then re-plans for admission', () => {
  const workflow = readFileSync('.github/workflows/main.yml', 'utf8');
  assert.match(workflow, /allow_destroy:\n {8}description: [^\n]+\n {8}required: true\n {8}type: boolean\n {8}default: false/);
  assert.match(workflow, /ALLOW_DESTROY: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.allow_destroy == true \}\}/);
  const order = ['Create private state-backed plan', 'Apply non-analytics infrastructure changes', 'Admit website/contact plan and capture protected analytics'];
  assert.deepEqual([...order].sort((a, b) => workflow.indexOf(`- name: ${a}\n`) - workflow.indexOf(`- name: ${b}\n`)), order);

  const directory = mkdtempSync(path.join(os.tmpdir(), 'infrastructure-step-'));
  try {
    const bin = path.join(directory, 'bin'); mkdirSync(bin);
    const calls = path.join(directory, 'calls');
    // node stub: select writes TARGETS lines (or fails), check fails on CHECK_STATUS.
    writeFileSync(path.join(bin, 'node'), `#!${process.execPath}
const fs=require('node:fs');const args=process.argv.slice(2);
fs.appendFileSync(process.env.CALLS,JSON.stringify(['node',...args])+'\\n');
if(args[1]==='select'){if(process.env.SELECT_STATUS!=='0')process.exit(1);fs.writeFileSync(args[args.indexOf('--output')+1],process.env.TARGETS);}
if(args[1]==='check')process.exit(Number(process.env.CHECK_STATUS));
`, {mode: 0o755});
    writeFileSync(path.join(bin, 'terraform'), `#!${process.execPath}
require('node:fs').appendFileSync(process.env.CALLS,JSON.stringify(['terraform',...process.argv.slice(2)])+'\\n');
if(process.argv.includes('show'))console.log('{}');
process.exit(process.argv.includes('apply')?Number(process.env.APPLY_STATUS):0);
`, {mode: 0o755});
    const script = path.join(directory, 'run.sh');
    writeFileSync(script, runStep(workflow, 'Apply non-analytics infrastructure changes'));
    const run = env => {
      rmSync(calls, {force: true}); rmSync(path.join(directory, 'private-plan'), {recursive: true, force: true});
      mkdirSync(path.join(directory, 'private-plan'));
      const result = spawnSync('/bin/bash', ['-e', script], {cwd: directory, encoding: 'utf8', env: {PATH: `${bin}:/usr/bin:/bin`, CALLS: calls,
        RUNNER_TEMP: directory, GITHUB_STEP_SUMMARY: path.join(directory, 'summary.md'), RELEASE_MODE: 'website-contact', ALLOW_DESTROY: 'false',
        SELECT_STATUS: '0', CHECK_STATUS: '0', APPLY_STATUS: '0', TARGETS: '', ...env}});
      let executed = [];
      try { executed = readFileSync(calls, 'utf8').trim().split('\n').map(JSON.parse); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      return {result, executed, tools: executed.map(call => call[0] === 'node' ? call[2] : call.find(arg => ['plan', 'show', 'apply'].includes(arg)))};
    };

    assert.deepEqual(run({RELEASE_MODE: 'analytics'}).executed, []);
    assert.notEqual(run({RELEASE_MODE: 'invalid'}).result.status, 0);
    const none = run({});
    assert.equal(none.result.status, 0); assert.deepEqual(none.tools, ['select']);
    const refused = run({SELECT_STATUS: '1'});
    assert.notEqual(refused.result.status, 0); assert.deepEqual(refused.tools, ['select']);
    const mismatch = run({TARGETS: 'aws_dynamodb_table.contact_daily_sends\n', CHECK_STATUS: '1'});
    assert.notEqual(mismatch.result.status, 0); assert.ok(!mismatch.tools.includes('apply'));
    const failedApply = run({TARGETS: 'aws_dynamodb_table.contact_daily_sends\n', APPLY_STATUS: '1'});
    assert.notEqual(failedApply.result.status, 0); assert.equal(failedApply.tools.at(-1), 'apply');

    const ok = run({TARGETS: 'aws_dynamodb_table.contact_daily_sends\naws_cloudfront_cache_policy.site["stable"]\n', ALLOW_DESTROY: 'true'});
    assert.equal(ok.result.status, 0, ok.result.stdout + ok.result.stderr);
    assert.deepEqual(ok.tools, ['select', 'plan', 'show', 'check', 'apply', 'plan', 'show']);
    assert.deepEqual(ok.executed[0].slice(2, 4), ['select', '--allow-destroy']); assert.equal(ok.executed[0][4], 'true');
    assert.ok(ok.executed[1].includes('-target=aws_dynamodb_table.contact_daily_sends') && ok.executed[1].includes('-target=aws_cloudfront_cache_policy.site["stable"]'));
    assert.ok(ok.executed[4].at(-1).endsWith('targeted.tfplan'));
    assert.ok(!ok.executed[5].some(arg => arg.startsWith('-target')) && ok.executed[5].some(arg => arg.endsWith('release.tfplan')));
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
});

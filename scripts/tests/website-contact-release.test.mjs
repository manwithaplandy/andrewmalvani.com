import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {classifyPlan, resolveMode, protectState, compareProtected, verifyTargets, OLD_ALARM, NEW_ALARM} from '../verify_website_contact_release.mjs';

const arn = 'arn:aws:lambda:us-west-1:870140981796:function:statsAggregator';
const targets = {bucket: 'mostly-upward-lion-website-bucket', distribution: 'EDHU4C51HW4BG', contact: 'formSubmission'};
const legacy = 'e3f30b13d0335aa5d898d2c21f71ef9153d769f96e07510e9be137f2254eee51';
function planFixture() {
  const identities = {
    'aws_s3_bucket.website': {id: targets.bucket, bucket: targets.bucket},
    'aws_cloudfront_distribution.website_distribution': {id: targets.distribution},
    'aws_lambda_function.form_submission': {id: targets.contact, function_name: targets.contact},
    'aws_api_gateway_rest_api.api': {id: 'vs7dthj3vb'},
    'aws_api_gateway_stage.api': {id: 'stage-id', rest_api_id: 'vs7dthj3vb', stage_name: 'api'},
    'aws_cloudwatch_event_rule.stats_aggregator_daily': {id: 'stats-aggregator-daily', name: 'stats-aggregator-daily'},
    'aws_cloudwatch_event_target.stats_aggregator_daily': {id: 'target-id', rule: 'stats-aggregator-daily', arn},
    'aws_dynamodb_table.data_table': {id: 'mostly-upward-lion-data-table', name: 'mostly-upward-lion-data-table'},
    'aws_iam_role.stats_aggregator_exec': {id: 'stats_aggregator_exec', name: 'stats_aggregator_exec'},
    'aws_iam_policy.stats_aggregator_access': {id: 'arn:aws:iam::870140981796:policy/stats_aggregator_access', name: 'stats_aggregator_access'},
    'aws_iam_role_policy_attachment.stats_aggregator_access_attach': {id: 'attachment-a', role: 'stats_aggregator_exec'},
    'aws_iam_role_policy_attachment.stats_aggregator_basic_execution': {id: 'attachment-b', role: 'stats_aggregator_exec'},
    'aws_lambda_permission.stats_aggregator_events': {id: 'AllowExecutionFromEventBridge', function_name: 'statsAggregator'},
  };
  const resource_changes = Object.entries(identities).map(([address, values]) => ({address, mode: 'managed', type: address.split('.')[0], name: address.split('.')[1], change: {actions: ['no-op'], before: values, after: structuredClone(values), after_unknown: {}}}));
  for (const [address, before, field, value] of [
    ['aws_lambda_function.stats_aggregator', {id: 'statsAggregator', function_name: 'statsAggregator', filename: 'stats_aggregator.zip', environment: [{variables: {TOKEN: 'PRIVATE_FIXTURE_SENTINEL'}}], reserved_concurrent_executions: -1}, 'reserved_concurrent_executions', 1],
    ['aws_cloudwatch_metric_alarm.stats_aggregator_errors', {id: 'stats-aggregator-errors', alarm_name: 'stats-aggregator-errors', alarm_description: OLD_ALARM, threshold: 1}, 'alarm_description', NEW_ALARM],
  ]) resource_changes.push({address, mode: 'managed', type: address.split('.')[0], name: address.split('.')[1], change: {actions: ['update'], before, after: {...structuredClone(before), [field]: value}, after_unknown: {}}});
  return {format_version: '1.2', complete: true, errored: false, resource_changes};
}
function rawFixture() {
  return {account: {Account: '870140981796'}, function: {Configuration: {FunctionName: 'statsAggregator', FunctionArn: arn, CodeSha256: Buffer.from(legacy, 'hex').toString('base64'), Runtime: 'python3.12', Handler: 'lambda_function.lambda_handler', State: 'Active', LastUpdateStatus: 'Successful', Environment: {Variables: {TOKEN: 'PRIVATE_FIXTURE_SENTINEL'}}}},
    rule: {Name: 'stats-aggregator-daily', Arn: 'arn:aws:events:us-west-1:870140981796:rule/stats-aggregator-daily', State: 'ENABLED', ScheduleExpression: 'cron(0 0 * * ? *)'},
    targets: {Targets: [{Id: 'original', Arn: arn}]},
    permission: {Policy: JSON.stringify({Version: '2012-10-17', Statement: [{Sid: 'AllowExecutionFromEventBridge', Effect: 'Allow', Action: 'lambda:InvokeFunction', Principal: {Service: 'events.amazonaws.com'}, Resource: arn, Condition: {ArnLike: {'AWS:SourceArn': 'arn:aws:events:us-west-1:870140981796:rule/stats-aggregator-daily'}}}]})},
    alarms: {MetricAlarms: [{AlarmName: 'stats-aggregator-errors', AlarmDescription: OLD_ALARM, Namespace: 'AWS/Lambda', MetricName: 'Errors', Dimensions: [{Name: 'FunctionName', Value: 'statsAggregator'}], Threshold: 1, ComparisonOperator: 'GreaterThanOrEqualToThreshold', EvaluationPeriods: 1, Period: 300, Statistic: 'Sum', TreatMissingData: 'notBreaching', ActionsEnabled: true, AlarmActions: ['arn:aws:sns:us-west-1:870140981796:website-contact-us']}]},
    stats: {ETag: 'original', VersionId: 'original', LastModified: '2026-09-12T00:00:00Z', ContentLength: 123, ContentType: 'application/json', CacheControl: 'public,max-age=3600'}};
}

test('complete exact two-drift plan admits without Terraform or analytics release', () => {
  const result = classifyPlan(planFixture());
  assert.deepEqual(result.targets, targets);
  assert.equal(result.terraformApply, false); assert.equal(result.analyticsPending, true);
  assert.ok(!JSON.stringify(result).includes('PRIVATE_FIXTURE_SENTINEL'));
});
test('rejects malformed, incomplete, ambiguous and extra plan operations', () => {
  for (const mutate of [p => delete p.complete, p => p.complete = false, p => p.errored = true, p => p.format_version = '2.0', p => p.deferred_changes = [{}], p => p.resource_changes = [], p => p.resource_changes.pop(), p => p.resource_changes.shift(), p => p.resource_changes.push(structuredClone(p.resource_changes[0])),
    p => p.resource_changes[0].change.actions = ['create'], p => p.resource_changes[0].change.actions = ['delete','create'], p => p.resource_changes[0].change.importing = {id:'import'}, p => p.resource_changes[0].deposed = 'dead', p => p.resource_changes[0].change.replace_paths = [['bucket']], p => p.resource_changes[0].change.after_unknown = {bucket:true}, p => p.resource_changes[0].change.before = null,
    p => p.resource_changes[0].change.after.bucket = 'other', p => p.resource_changes[0].address = 'wrong', p => p.resource_changes[0].mode = 'data', p => p.resource_changes[0].change.actions = ['read'],
  ]) {const p = planFixture(); mutate(p); assert.throws(() => classifyPlan(p));}
  for (const p of [null, [], {}, {resource_changes:'bad'}]) assert.throws(() => classifyPlan(p));
});
test('every required managed baseline and every extra field is load-bearing', () => {
  const template = planFixture();
  for (let n=0;n<template.resource_changes.length;n++) {
    const p=planFixture();p.resource_changes.splice(n,1);assert.throws(()=>classifyPlan(p));
    const q=planFixture();q.resource_changes[n].change.after.extra='changed';assert.throws(()=>classifyPlan(q));
  }
  for (const [index, field, value] of [[-2,'filename','different.zip'],[-2,'environment',[]],[-2,'source_code_hash','new'],[-2,'reserved_concurrent_executions',0],[-1,'alarm_description','different'],[-1,'threshold',2]]) {
    const p=planFixture();p.resource_changes.at(index).change.after[field]=value;assert.throws(()=>classifyPlan(p));
  }
  for (const index of [-1,-2]) {const p=planFixture();p.resource_changes.at(index).change.before[index===-1?'alarm_description':'reserved_concurrent_executions']='wrong';assert.throws(()=>classifyPlan(p));}
});
test('release mode and deployment target resolution fail closed', () => {
  assert.equal(resolveMode('push',''), 'website-contact');
  assert.equal(resolveMode('workflow_dispatch','website-contact'),'website-contact');
  assert.equal(resolveMode('workflow_dispatch','analytics'),'analytics');
  for(const args of [['pull_request','website-contact'],['workflow_dispatch',''],['workflow_dispatch','other'],['push','analytics']]) assert.throws(()=>resolveMode(...args));
  verifyTargets(targets);
  for(const key of Object.keys(targets)) assert.throws(()=>verifyTargets({...targets,[key]:'statsAggregator'}));
});
test('protected snapshots allow daily data and alarm runtime changes, never configuration changes', () => {
  const before=protectState(rawFixture(),targets);
  assert.ok(!JSON.stringify(before).includes('PRIVATE_FIXTURE_SENTINEL'));
  const raw=rawFixture();raw.stats.ETag='daily-new';raw.stats.LastModified='2026-09-13T00:00:00Z';raw.alarms.MetricAlarms[0].StateValue='ALARM';raw.alarms.MetricAlarms[0].StateUpdatedTimestamp='now';
  const result=compareProtected(before,protectState(raw,targets));assert.equal(result.statsDataOwner,'existing-daily-producer');
  for(const mutate of [r=>r.function.Configuration.Environment.Variables.TOKEN='new',r=>r.function.Configuration.Runtime='changed',r=>r.function.Configuration.CodeSha256='wrong',r=>r.function.Concurrency={ReservedConcurrentExecutions:0},r=>r.rule.State='DISABLED',r=>r.rule.ScheduleExpression='changed',r=>r.targets.Targets[0].Id='changed',r=>r.targets.Targets.push(r.targets.Targets[0]),r=>r.targets.Targets[0].Arn+=':version',r=>r.permission.Policy='{}',r=>r.alarms.MetricAlarms[0].Threshold=2,r=>r.alarms.MetricAlarms[0].AlarmDescription='changed',r=>r.alarms.MetricAlarms[0].AlarmActions=['wrong'],r=>r.alarms.MetricAlarms=[]]) {
    const r=rawFixture();mutate(r);assert.throws(()=>compareProtected(before,protectState(r,targets)));
  }
});
test('actual strict CLI admits a private fixture and fails without exposing private fields', () => {
  const tmp=mkdtempSync(path.join(os.tmpdir(),'website-contact-'));
  const script=path.resolve('scripts/verify_website_contact_release.mjs');
  try {
    const file=path.join(tmp,'plan.json');writeFileSync(file,JSON.stringify(planFixture()));
    const run=args=>spawnSync(process.execPath,[script,...args],{encoding:'utf8',env:{PATH:'/usr/bin:/bin'}});
    const good=run(['admit','--plan',file]);assert.equal(good.status,0,good.stderr);assert.ok(!good.stdout.includes('PRIVATE_FIXTURE_SENTINEL'));
    for(const args of [['admit','--plan',file,'--unknown','x'],['admit','--plan',file,'--plan',file],['capture','--output',path.join(tmp,'state.json')],['mode','--event','pull_request','--mode','analytics']]) {const bad=run(args);assert.notEqual(bad.status,0);assert.ok(!bad.stdout.includes('PRIVATE_FIXTURE_SENTINEL'));assert.ok(!bad.stderr.includes('PRIVATE_FIXTURE_SENTINEL'));}
    const p=planFixture();p.resource_changes.at(-2).change.after.environment[0].variables.TOKEN='SECRET_ALTERATION';writeFileSync(file,JSON.stringify(p));const bad=run(['admit','--plan',file]);assert.notEqual(bad.status,0);assert.doesNotMatch(bad.stderr,/SECRET_ALTERATION|PRIVATE_FIXTURE_SENTINEL/);
  } finally {rmSync(tmp,{recursive:true,force:true});}
});

test('actual capture/compare CLI uses only bounded read calls and never emits private AWS responses', () => {
  const tmp=mkdtempSync(path.join(os.tmpdir(),'website-contact-aws-'));
  const script=path.resolve('scripts/verify_website_contact_release.mjs');
  try {
    const bin=path.join(tmp,'bin');mkdirSync(bin);
    const fixture=path.join(tmp,'raw.json'),calls=path.join(tmp,'calls');
    const plan=path.join(tmp,'plan.json'),before=path.join(tmp,'before.json'),after=path.join(tmp,'after.json');
    writeFileSync(plan,JSON.stringify(planFixture()));writeFileSync(fixture,JSON.stringify(rawFixture()));
    writeFileSync(path.join(bin,'aws'),`#!${process.execPath}\nconst fs=require('node:fs');const a=process.argv.slice(2);fs.appendFileSync(process.env.CALLS,JSON.stringify(a)+'\\n');if(process.env.FAIL_READ){console.error('PRIVATE_FIXTURE_SENTINEL');process.exit(23);}const map={'sts get-caller-identity':'account','lambda get-function':'function','lambda get-policy':'permission','events describe-rule':'rule','events list-targets-by-rule':'targets','cloudwatch describe-alarms':'alarms','s3api head-object':'stats'};const key=map[a.slice(0,2).join(' ')];if(!key)process.exit(24);console.log(JSON.stringify(JSON.parse(fs.readFileSync(process.env.RAW))[key]));\n`,{mode:0o755});
    const options=['--bucket',targets.bucket,'--distribution',targets.distribution,'--contact',targets.contact];
    const run=(args,extra={})=>spawnSync(process.execPath,[script,...args],{encoding:'utf8',env:{PATH:`${bin}:/usr/bin:/bin`,RAW:fixture,CALLS:calls,...extra}});
    const first=run(['capture','--plan',plan,...options,'--output',before]);assert.equal(first.status,0,first.stderr);
    assert.doesNotMatch(readFileSync(before,'utf8')+first.stdout+first.stderr,/PRIVATE_FIXTURE_SENTINEL|Policy|Environment/);
    const raw=rawFixture();raw.stats.ETag='daily';writeFileSync(fixture,JSON.stringify(raw));
    const next=run(['compare','--before',before,...options,'--output',after]);assert.equal(next.status,0,next.stderr);assert.equal(JSON.parse(readFileSync(after)).statsDataOwner,'existing-daily-producer');
    raw.function.Configuration.Environment.Variables.TOKEN='changed';writeFileSync(fixture,JSON.stringify(raw));
    assert.notEqual(run(['compare','--before',before,...options,'--output',after]).status,0);
    const failed=run(['capture','--plan',plan,...options,'--output',before],{FAIL_READ:'true'});assert.notEqual(failed.status,0);assert.match(failed.stderr,/AWS_READ_FAILED/);assert.doesNotMatch(failed.stdout+failed.stderr,/PRIVATE_FIXTURE_SENTINEL/);
    const invocations=readFileSync(calls,'utf8').trim().split('\n').map(JSON.parse);
    assert.ok(invocations.every(args=>args.includes('--region') && args[args.indexOf('--region')+1]==='us-west-1'));
    assert.ok(invocations.every(args=>!args.some(arg=>/get-account-settings|update|put-|invoke|delete/.test(arg))));
    const count=invocations.length;
    const badTarget=options.map(value=>value===targets.contact?'statsAggregator':value);
    assert.notEqual(run(['capture','--plan',plan,...badTarget,'--output',before]).status,0);
    assert.equal(readFileSync(calls,'utf8').trim().split('\n').length,count,'target mismatch must fail before AWS');
  } finally {rmSync(tmp,{recursive:true,force:true});}
});

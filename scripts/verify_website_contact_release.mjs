export const OLD_ALARM = "The stats aggregator Lambda's Cloudflare analytics fetch failed. stats.json still publishes on schedule with CloudFront-derived stats; only Cloudflare uniques/countries lag until a successful run. Usually transient - if the alarm self-cleared, Lambda's async auto-retry already recovered.";
export const NEW_ALARM = 'The stats aggregator invocation failed or a source refresh was incomplete. Recoverable source failures publish independently available data before raising; storage or publication failures can prevent an update. Check per-source freshness in stats.json and the invocation logs. A cleared alarm alone does not prove every source recovered.';

import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const ACCOUNT='870140981796', REGION='us-west-1';
const STATS='statsAggregator', RULE='stats-aggregator-daily';
const ARN=`arn:aws:lambda:${REGION}:${ACCOUNT}:function:${STATS}`;
const RULE_ARN=`arn:aws:events:${REGION}:${ACCOUNT}:rule/${RULE}`;
const LEGACY='e3f30b13d0335aa5d898d2c21f71ef9153d769f96e07510e9be137f2254eee51';
const TARGETS={bucket:'mostly-upward-lion-website-bucket',distribution:'EDHU4C51HW4BG',contact:'formSubmission'};
const REQUIRED={
  'aws_s3_bucket.website':{id:TARGETS.bucket,bucket:TARGETS.bucket},
  'aws_cloudfront_distribution.website_distribution':{id:TARGETS.distribution},
  'aws_lambda_function.form_submission':{id:TARGETS.contact,function_name:TARGETS.contact},
  'aws_api_gateway_rest_api.api':{id:'vs7dthj3vb'},
  'aws_api_gateway_stage.api':{rest_api_id:'vs7dthj3vb',stage_name:'api'},
  'aws_cloudwatch_event_rule.stats_aggregator_daily':{name:RULE},
  'aws_cloudwatch_event_target.stats_aggregator_daily':{rule:RULE,arn:ARN},
  'aws_dynamodb_table.data_table':{name:'mostly-upward-lion-data-table'},
  'aws_iam_role.stats_aggregator_exec':{name:'stats_aggregator_exec'},
  'aws_iam_policy.stats_aggregator_access':{name:'stats_aggregator_access'},
  'aws_iam_role_policy_attachment.stats_aggregator_access_attach':{role:'stats_aggregator_exec'},
  'aws_iam_role_policy_attachment.stats_aggregator_basic_execution':{role:'stats_aggregator_exec'},
  'aws_lambda_permission.stats_aggregator_events':{function_name:STATS},
};
class ReleaseError extends Error {}
const requireSafe=(value,code)=>{if(!value)throw new ReleaseError(code);};
const object=value=>value!==null && typeof value==='object' && !Array.isArray(value);
function canonical(value) {
  if(Array.isArray(value))return value.map(canonical);
  if(object(value))return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
// Empty schema containers and false leaves are not unknown values.
function unknown(value) {
  if(value===false || value===undefined)return false;
  if(Array.isArray(value))return value.some(unknown);
  if(object(value))return Object.values(value).some(unknown);
  return true;
}
export function resolveMode(event,mode) {
  if(event==='push' && (mode==='' || mode===undefined))return 'website-contact';
  requireSafe(event==='workflow_dispatch' && ['website-contact','analytics'].includes(mode),'INVALID_RELEASE_MODE');
  return mode;
}
export function verifyTargets(values) {
  requireSafe(equal(values,TARGETS),'RELEASE_TARGET_MISMATCH');
  return {...TARGETS};
}
export function classifyPlan(plan) {
  requireSafe(object(plan) && /^1\.\d+$/.test(plan.format_version) && plan.complete===true && plan.errored===false,'INVALID_COMPLETE_PLAN');
  requireSafe(plan.deferred_changes===undefined || (Array.isArray(plan.deferred_changes) && plan.deferred_changes.length===0),'DEFERRED_PLAN');
  requireSafe(Array.isArray(plan.resource_changes) && plan.resource_changes.length>0 && plan.resource_changes.length<=10000,'INVALID_RESOURCES');
  const seen=new Set(), changed=new Set();
  for(const row of plan.resource_changes) {
    requireSafe(object(row) && typeof row.address==='string' && !seen.has(row.address),'INVALID_RESOURCE_ADDRESS');
    seen.add(row.address);
    requireSafe(row.mode==='managed' && row.address===`${row.type}.${row.name}${row.index===undefined?'':`[${JSON.stringify(row.index)}]`}`,'INVALID_MANAGED_IDENTITY');
    const change=row.change;
    requireSafe(object(change) && object(change.before) && object(change.after) && typeof change.before.id==='string' && change.before.id.length>0,'MISSING_EXISTING_RESOURCE');
    requireSafe(!row.deposed && !row.previous_address && !change.importing && (!change.replace_paths || (Array.isArray(change.replace_paths) && change.replace_paths.length===0)),'IMPORT_OR_REPLACEMENT');
    requireSafe(!unknown(change.after_unknown),'UNKNOWN_PLAN_VALUES');
    requireSafe(equal(change.actions,['no-op']) || equal(change.actions,['update']),'DISALLOWED_PLAN_ACTION');
    const keys=[...new Set([...Object.keys(change.before),...Object.keys(change.after)])].filter(key=>!equal(change.before[key],change.after[key]));
    if(equal(change.actions,['no-op']))requireSafe(keys.length===0,'INCONSISTENT_NOOP');
    else {
      const stats=row.address==='aws_lambda_function.stats_aggregator';
      const alarm=row.address==='aws_cloudwatch_metric_alarm.stats_aggregator_errors';
      requireSafe(stats || alarm,'UNAPPROVED_RESOURCE_CHANGE');
      const field=stats?'reserved_concurrent_executions':'alarm_description';
      requireSafe(equal(keys,[field]),'UNAPPROVED_CHANGED_FIELD');
      requireSafe(stats ? change.before.id===STATS && change.before.function_name===STATS && change.before[field]===-1 && change.after[field]===1 : change.before.id==='stats-aggregator-errors' && change.before.alarm_name==='stats-aggregator-errors' && change.before[field]===OLD_ALARM && change.after[field]===NEW_ALARM,'DRIFT_SIGNATURE_MISMATCH');
      changed.add(row.address);
    }
    if(REQUIRED[row.address]) {
      requireSafe(equal(change.actions,['no-op']) && Object.entries(REQUIRED[row.address]).every(([key,value])=>equal(change.before[key],value)),'BASELINE_IDENTITY_MISMATCH');
    }
  }
  requireSafe(Object.keys(REQUIRED).every(address=>seen.has(address)) && changed.size===2,'MISSING_REQUIRED_BASELINE_OR_DRIFT');
  return {mode:'website-contact',terraformApply:false,analyticsPending:true,targets:{...TARGETS}};
}
function omit(row,predicate) {return Object.fromEntries(Object.entries(row).filter(([key])=>!predicate(key)));}
export function protectState(raw,targets) {
  verifyTargets(targets);
  requireSafe(object(raw) && raw.account?.Account===ACCOUNT,'ACCOUNT_MISMATCH');
  const config=raw.function?.Configuration;
  requireSafe(object(config) && config.FunctionName===STATS && config.FunctionArn===ARN && config.State==='Active' && config.LastUpdateStatus==='Successful','INVALID_STATS_FUNCTION');
  requireSafe(config.CodeSha256===Buffer.from(LEGACY,'hex').toString('base64'),'STATS_NOT_LEGACY_CODE');
  requireSafe(raw.function.Concurrency===undefined || (object(raw.function.Concurrency) && Object.keys(raw.function.Concurrency).length===0),'STATS_NOT_UNRESERVED');
  const rule=raw.rule;
  requireSafe(object(rule) && rule.Name===RULE && rule.Arn===RULE_ARN && rule.State==='ENABLED' && rule.ScheduleExpression==='cron(0 0 * * ? *)','INVALID_DAILY_RULE');
  const list=raw.targets;
  requireSafe(object(list) && !list.NextToken && Array.isArray(list.Targets) && list.Targets.length===1 && typeof list.Targets[0].Id==='string' && list.Targets[0].Id.length>0 && list.Targets[0].Arn===ARN,'INVALID_DAILY_TARGET');
  let permission;
  try {permission=JSON.parse(raw.permission.Policy);} catch {throw new ReleaseError('INVALID_PERMISSION');}
  const statements=permission?.Statement;
  requireSafe(Array.isArray(statements) && statements.length===1,'INVALID_PERMISSION');
  const entry=statements[0], source=(entry.Condition?.ArnLike || entry.Condition?.ArnEquals)?.['AWS:SourceArn'];
  requireSafe(entry.Sid==='AllowExecutionFromEventBridge' && entry.Effect==='Allow' && entry.Action==='lambda:InvokeFunction' && equal(entry.Principal,{Service:'events.amazonaws.com'}) && entry.Resource===ARN && source===RULE_ARN,'INVALID_PERMISSION');
  const alarms=raw.alarms?.MetricAlarms;
  requireSafe(Array.isArray(alarms) && alarms.length===1,'INVALID_ALARM');
  const alarm=alarms[0];
  requireSafe(alarm.AlarmName==='stats-aggregator-errors' && alarm.AlarmDescription===OLD_ALARM && alarm.Namespace==='AWS/Lambda' && alarm.MetricName==='Errors' && equal(alarm.Dimensions,[{Name:'FunctionName',Value:STATS}]) && alarm.Threshold===1 && alarm.ComparisonOperator==='GreaterThanOrEqualToThreshold' && alarm.EvaluationPeriods===1 && alarm.Period===300 && alarm.Statistic==='Sum' && alarm.TreatMissingData==='notBreaching' && alarm.ActionsEnabled===true && equal(alarm.AlarmActions,[`arn:aws:sns:${REGION}:${ACCOUNT}:website-contact-us`]),'INVALID_ALARM_CONFIG');
  requireSafe(object(raw.stats) && typeof raw.stats.ETag==='string' && Number.isSafeInteger(raw.stats.ContentLength) && raw.stats.ContentLength>=0,'INVALID_STATS_METADATA');
  const publicStats=Object.fromEntries(['ETag','VersionId','LastModified','ContentLength','ContentType','CacheControl'].filter(key=>raw.stats[key]!==undefined).map(key=>[key,raw.stats[key]]));
  const state={function:digest(omit(config,key=>['State','StateReason','StateReasonCode','LastUpdateStatus','LastUpdateStatusReason','LastUpdateStatusReasonCode'].includes(key))),rule:digest(rule),targets:digest(list.Targets),permission:digest(permission),alarm:digest(omit(alarm,key=>key.startsWith('State') || ['AlarmConfigurationUpdatedTimestamp','ActionsSuppressedBy','ActionsSuppressedReason'].includes(key)))};
  return {version:1,mode:'website-contact',targets:{...TARGETS},legacyCodeSha256:LEGACY,unreserved:true,protected:state,publicStats,statsDataOwner:'existing-daily-producer'};
}
function validSnapshot(value) {
  requireSafe(object(value) && value.version===1 && value.mode==='website-contact' && value.legacyCodeSha256===LEGACY && value.unreserved===true && value.statsDataOwner==='existing-daily-producer','INVALID_PROTECTED_SNAPSHOT');
  verifyTargets(value.targets);
  requireSafe(object(value.protected) && equal(Object.keys(value.protected).sort(),['alarm','function','permission','rule','targets']) && Object.values(value.protected).every(v=>typeof v==='string' && /^[a-f0-9]{64}$/.test(v)),'INVALID_PROTECTED_DIGESTS');
}
export function compareProtected(before,after) {
  validSnapshot(before);validSnapshot(after);
  requireSafe(equal(before.protected,after.protected),'ANALYTICS_CONFIGURATION_CHANGED');
  return {status:'PASS',terraformApply:false,analyticsPending:true,protectedConfigurationUnchanged:true,statsDataOwner:'existing-daily-producer',publicStatsBefore:before.publicStats,publicStatsAfter:after.publicStats};
}
function aws(args) {
  const result=spawnSync('aws',[...args,'--region',REGION,'--output','json','--no-cli-pager'],{encoding:'utf8',maxBuffer:8*1024*1024,timeout:30000});
  requireSafe(!result.error && result.status===0,'AWS_READ_FAILED');
  try {return JSON.parse(result.stdout);} catch {throw new ReleaseError('AWS_RESPONSE_INVALID');}
}
function capture(targets) {
  return protectState({account:aws(['sts','get-caller-identity']),function:aws(['lambda','get-function','--function-name',STATS]),rule:aws(['events','describe-rule','--name',RULE]),targets:aws(['events','list-targets-by-rule','--rule',RULE]),permission:aws(['lambda','get-policy','--function-name',STATS]),alarms:aws(['cloudwatch','describe-alarms','--alarm-names','stats-aggregator-errors']),stats:aws(['s3api','head-object','--bucket',TARGETS.bucket,'--key','stats.json'])},targets);
}
function readJSON(file) {
  requireSafe(statSync(file).size<=32*1024*1024,'INPUT_BYTE_BOUND');
  return JSON.parse(readFileSync(file,'utf8'));
}
export function main(argv=process.argv.slice(2)) {
  try {
    const [command,...args]=argv;
    const accepted={mode:['event','mode'],admit:['plan'],targets:['bucket','distribution','contact'],capture:['plan','bucket','distribution','contact','output'],compare:['before','bucket','distribution','contact','output']}[command];
    requireSafe(accepted && args.length===accepted.length*2,'INVALID_ARGUMENTS');
    const opts={};
    for(let i=0;i<args.length;i+=2) {
      requireSafe(args[i].startsWith('--') && accepted.includes(args[i].slice(2)) && !Object.hasOwn(opts,args[i].slice(2)) && typeof args[i+1]==='string','INVALID_ARGUMENTS');
      opts[args[i].slice(2)]=args[i+1];
    }
    if(command==='mode') {console.log(`mode=${resolveMode(opts.event,opts.mode)}`);return 0;}
    if(command==='admit') {console.log(JSON.stringify(classifyPlan(readJSON(opts.plan))));return 0;}
    const targets=verifyTargets({bucket:opts.bucket,distribution:opts.distribution,contact:opts.contact});
    if(command==='targets') {console.log('TARGETS_VERIFIED');return 0;}
    let result;
    if(command==='capture') {
      const admitted=classifyPlan(readJSON(opts.plan));requireSafe(equal(targets,admitted.targets),'PLAN_TARGET_MISMATCH');
      result=capture(targets);
    } else {
      const before=readJSON(opts.before);validSnapshot(before);result=compareProtected(before,capture(targets));
    }
    writeFileSync(opts.output,JSON.stringify(result,null,2)+'\n',{mode:0o600});
    console.log(command==='capture'?'PROTECTED_CONFIGURATION_CAPTURED':'PROTECTED_CONFIGURATION_UNCHANGED');
    return 0;
  } catch(error) {
    console.error(error instanceof ReleaseError?error.message:'RELEASE_CHECK_FAILED');return 1;
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=main();

import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';

function runStep(workflow, name) {
  const marker = `      - name: ${name}\n`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `Missing workflow step: ${name}`);
  const remainder = workflow.slice(start + marker.length);
  const end = remainder.indexOf('\n      - name:');
  const step = end === -1 ? remainder : remainder.slice(0, end);
  const multiline = step.match(/        run: \|\n((?:          .*\n?)+)/);
  if (multiline) return multiline[1].replace(/^ {10}/gm, '');
  const single = step.match(/^        run: (.+)$/m);
  assert.ok(single, `Expected a run command for: ${name}`);
  return single[1] + '\n';
}

function githubRunShell(workflow, script) {
  const explicit = workflow.match(/^defaults:\n  run:\n(?:    #.*\n)*    shell: ([^\n]+)$/m)?.[1];
  // GitHub documents pipefail only for the explicit bash shell. Reproduce
  // the two documented templates rather than assuming the host default.
  return explicit === 'bash'
    ? ['/bin/bash', ['--noprofile', '--norc', '-eo', 'pipefail', script]]
    : ['/bin/bash', ['-e', script]];
}

function executeReaderStep(mode, verifierStatus = 0, bootstrap = false) {
  const workflow = readFileSync('.github/workflows/main.yml', 'utf8');
  const readerJob = workflow.slice(workflow.indexOf('  verify-analytics-reader:'), workflow.indexOf('  update-contact-code:'));
  const stepName = bootstrap ? 'Verify public reader before producer bootstrap' : readerJob.match(/      - name: (Verify [^\n]+)\n/)[1];
  const directory = mkdtempSync(path.join(os.tmpdir(), 'reader-origin-'));
  try {
    const bin = path.join(directory, 'bin');
    mkdirSync(bin);
    const calls = path.join(directory, 'calls');
    writeFileSync(path.join(bin, 'node'), `#!${process.execPath}
require('node:fs').appendFileSync(process.env.CALLS, JSON.stringify(process.argv.slice(2)) + '\\n');
process.exit(Number(process.env.VERIFIER_STATUS));
`, {mode: 0o755});
    const script = path.join(directory, 'run.sh');
    writeFileSync(script, runStep(workflow, stepName));
    const [shell, args] = githubRunShell(workflow, script);
    const result = spawnSync(shell, args, {
      cwd: directory,
      env: {PATH: `${bin}:/usr/bin:/bin`, CALLS: calls, VERIFIER_STATUS: String(verifierStatus), ...(mode === undefined ? {} : {RELEASE_MODE: mode})},
      encoding: 'utf8',
    });
    let executed = [];
    try { executed = readFileSync(calls, 'utf8').trim().split('\n').map(JSON.parse); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    return {result, executed, readerJob};
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
}

test('website/contact executes the unchanged reader verifier against only the existing production CDN', () => {
  const {result, executed, readerJob} = executeReaderStep('website-contact');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(executed, [[
    'scripts/verify_public_stats_reader.mjs', '--artifact-dir', 'out',
    '--origin', 'https://d2v6o77xftr5if.cloudfront.net', '--report', 'public-reader-verification.json',
  ]]);
  assert.match(readerJob, /needs: \[deploy-infrastructure, invalidate-cloudfront\]/);
  assert.match(readerJob, /RELEASE_MODE: \$\{\{ needs\.deploy-infrastructure\.outputs\.release_mode \}\}/);
  assert.match(readerJob, /uses: actions\/download-artifact@v8\n        with:\n          name: checked-web\n          path: out/);
});

test('analytics reader verification requires both public domains before bootstrap and after publication', () => {
  for (const bootstrap of [false, true]) {
    const {result, executed} = executeReaderStep('analytics', 0, bootstrap);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(executed, [[
      'scripts/verify_public_stats_reader.mjs', '--artifact-dir', 'out',
      '--origin', 'https://andrewmalvani.com', '--origin', 'https://www.andrewmalvani.com',
      '--report', bootstrap ? 'bootstrap-reader-verification.json' : 'public-reader-verification.json',
    ]]);
  }
});

test('missing or unknown release modes stop before executing the reader verifier', () => {
  for (const mode of [undefined, '', 'invalid']) {
    const {result, executed} = executeReaderStep(mode);
    assert.notEqual(result.status, 0, `Reader verification accepted mode ${JSON.stringify(mode)}`);
    assert.deepEqual(executed, [], 'Invalid release mode must not launch browser verification');
  }
});

test('reader verifier failures propagate in both release modes without endpoint fallback', () => {
  for (const mode of ['website-contact', 'analytics']) {
    const {result, executed} = executeReaderStep(mode, 23);
    assert.equal(result.status, 23, result.stdout + result.stderr);
    assert.equal(executed.length, 1, 'A failed verification must not retry against another endpoint');
  }
});

test('a failed command piped to tee fails the actual archive-build workflow step', () => {
  const workflow = readFileSync('.github/workflows/checks.yml', 'utf8');
  const directory = mkdtempSync(path.join(os.tmpdir(), 'e5-workflow-pipeline-'));
  try {
    const bin = path.join(directory, 'bin');
    mkdirSync(bin);
    mkdirSync(path.join(directory, 'check-logs'));
    writeFileSync(path.join(bin, 'python'), '#!/bin/bash\necho synthetic archive failure\nexit 23\n', {mode: 0o755});
    const script = path.join(directory, 'run.sh');
    writeFileSync(script, runStep(workflow, 'Build deterministic Lambda archives'));
    const [shell, args] = githubRunShell(workflow, script);
    const result = spawnSync(shell, args, {
      cwd: directory,
      env: {PATH: `${bin}:/usr/bin:/bin`},
      encoding: 'utf8',
    });
    assert.equal(result.status, 23, `The failing producer was hidden by tee:\n${result.stdout}${result.stderr}`);
    assert.match(readFileSync(path.join(directory, 'check-logs/release-packaging.log'), 'utf8'), /synthetic archive failure/);
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
});

test('a failed producer in the actual deployment digest pipeline stops the step', () => {
  const workflow = readFileSync('.github/workflows/main.yml', 'utf8');
  const directory = mkdtempSync(path.join(os.tmpdir(), 'e5-deploy-pipeline-'));
  try {
    const bin = path.join(directory, 'bin');
    mkdirSync(bin);
    writeFileSync(path.join(bin, 'aws'), '#!/bin/bash\necho deployed-digest\n', {mode: 0o755});
    writeFileSync(path.join(bin, 'openssl'), '#!/bin/bash\nif [ "$1" = dgst ]; then echo synthetic digest failure >&2; exit 23; fi\ncat\n', {mode: 0o755});
    mkdirSync(path.join(directory, 'release-artifacts'));
    writeFileSync(path.join(directory, 'release-artifacts/stats-aggregator.zip'), 'synthetic');
    const output = path.join(directory, 'github-output');
    const script = path.join(directory, 'run.sh');
    writeFileSync(script, runStep(workflow, 'Compare checked analytics package with deployed code'));
    const [shell, args] = githubRunShell(workflow, script);
    const result = spawnSync(shell, args, {
      cwd: directory,
      env: {
        PATH: `${bin}:/usr/bin:/bin`,
        FUNCTION_NAME: 'synthetic',
        REQUIRES_READER: 'false',
        GITHUB_OUTPUT: output,
      },
      encoding: 'utf8',
    });
    assert.equal(result.status, 23, `The failing digest producer was hidden by its pipeline:\n${result.stdout}${result.stderr}`);
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
});

test('a schedule-only plan with unchanged code rejects push and requires manual attestation', () => {
  const workflow = readFileSync('.github/workflows/main.yml', 'utf8');
  const directory = mkdtempSync(path.join(os.tmpdir(), 'e5-analytics-gate-'));
  try {
    const plan = path.join(directory, 'plan.json');
    writeFileSync(plan, JSON.stringify({format_version: '1.2', resource_changes: [
      {type: 'aws_lambda_function', name: 'stats_aggregator', change: {actions: ['no-op']}},
      {type: 'aws_cloudwatch_event_rule', name: 'stats_aggregator_daily', change: {
        actions: ['update'], before: {state: 'DISABLED'}, after: {state: 'ENABLED'},
      }},
    ]}));
    const classified = spawnSync(process.execPath, [path.resolve('scripts/verify_public_stats_reader.mjs'), '--plan', plan], {
      cwd: directory,
      encoding: 'utf8',
    });
    assert.equal(classified.status, 0, classified.stderr);
    const outputs = Object.fromEntries(classified.stdout.trim().split('\n').map(line => line.split('=')));
    assert.equal(outputs.requires_reader, 'false');

    const script = path.join(directory, 'gate.sh');
    writeFileSync(script, runStep(workflow, 'Require approved analytics migration boundary'));
    const [shell, args] = githubRunShell(workflow, script);
    const runGate = env => spawnSync(shell, args, {
      cwd: directory,
      env: {
        PATH: '/usr/bin:/bin',
        ANALYTICS_PLAN_CHANGE: outputs.analytics_change,
        ANALYTICS_CODE_CHANGE: 'false',
        ...env,
      },
      encoding: 'utf8',
    });
    const push = runGate({EVENT_NAME: 'push', ANALYTICS_RELEASE_APPROVED: '', ANALYTICS_RELEASE_RECORD: ''});
    assert.notEqual(push.status, 0, 'Schedule admission reopened on push without attestation');
    assert.match(push.stdout, /no-writer window and durable quiesced backup/);
    const manual = runGate({EVENT_NAME: 'workflow_dispatch', ANALYTICS_RELEASE_APPROVED: 'true', ANALYTICS_RELEASE_RECORD: 'release-2026-09-08'});
    assert.equal(manual.status, 0, manual.stdout + manual.stderr);
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
});

test('actual release mode step and mutation commands enforce the website/contact boundary', () => {
  const workflow=readFileSync('.github/workflows/main.yml','utf8');
  const directory=mkdtempSync(path.join(os.tmpdir(),'website-mode-'));
  try {
    const bin=path.join(directory,'bin');mkdirSync(bin);mkdirSync(path.join(directory,'private-plan'));
    const calls=path.join(directory,'calls');
    for(const name of ['aws','terraform'])writeFileSync(path.join(bin,name),'#!/bin/bash\necho "$*" >> "$CALLS"\n',{mode:0o755});
    const run=(name,env={})=>{
      const file=path.join(directory,'run.sh');writeFileSync(file,runStep(workflow,name));
      const [shell,args]=githubRunShell(workflow,file);
      return spawnSync(shell,args,{cwd:process.cwd(),encoding:'utf8',env:{PATH:`${bin}:${path.dirname(process.execPath)}:/usr/bin:/bin`,CALLS:calls,RUNNER_TEMP:directory,GITHUB_OUTPUT:path.join(directory,'output'),...env}});
    };
    assert.equal(run('Resolve explicit release mode',{EVENT_NAME:'push',REQUESTED_MODE:''}).status,0);
    assert.match(readFileSync(path.join(directory,'output'),'utf8'),/mode=website-contact/);
    assert.notEqual(run('Resolve explicit release mode',{EVENT_NAME:'workflow_dispatch',REQUESTED_MODE:'invalid'}).status,0);
    for(const name of ['Apply the private checked plan','Update analytics Lambda with exact checked archive']) {
      assert.equal(run(name,{RELEASE_MODE:'website-contact'}).status,0);
      assert.notEqual(run(name,{RELEASE_MODE:'invalid'}).status,0);
    }
    assert.throws(()=>readFileSync(calls));
    assert.equal(run('Apply the private checked plan',{RELEASE_MODE:'analytics'}).status,0);
    assert.match(readFileSync(calls,'utf8'),/apply/);
    const analyticsJob=workflow.slice(workflow.indexOf('  update-analytics-code:'));
    assert.match(analyticsJob,/if: needs\.deploy-infrastructure\.outputs\.release_mode == 'analytics' && needs\.deploy-infrastructure\.outputs\.stats_code_change == 'true'/);
    assert.match(workflow,/name: Discard private plans[\s\S]*?if: always\(\)/);
    assert.match(workflow,/verify-protected-analytics:[\s\S]*?needs: \[deploy-infrastructure, update-contact-code, verify-analytics-reader\]/);
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('actual publication/invalidation steps reject target drift before any mutation', () => {
  const workflow=readFileSync('.github/workflows/main.yml','utf8');
  const tmp=mkdtempSync(path.join(os.tmpdir(),'website-target-'));
  try {
    const bin=path.join(tmp,'bin');mkdirSync(bin);
    const calls=path.join(tmp,'calls');
    for(const tool of ['aws','node'])writeFileSync(path.join(bin,tool),'#!/bin/bash\necho "$*" >> "$CALLS"\n',{mode:0o755});
    for(const [name,key,good] of [['Publish verified candidate and cache metadata','S3_BUCKET_NAME','mostly-upward-lion-website-bucket'],['Invalidate CloudFront cache','CF_DISTRIBUTION_ID','EDHU4C51HW4BG']]) {
      const file=path.join(tmp,'step.sh');writeFileSync(file,runStep(workflow,name));const [shell,args]=githubRunShell(workflow,file);
      const run=value=>spawnSync(shell,args,{cwd:tmp,encoding:'utf8',env:{PATH:`${bin}:/usr/bin:/bin`,CALLS:calls,[key]:value}});
      assert.notEqual(run('statsAggregator').status,0);
      assert.throws(()=>readFileSync(calls));
      assert.equal(run(good).status,0);
      assert.ok(readFileSync(calls,'utf8').length>0);rmSync(calls);
    }
  } finally {rmSync(tmp,{recursive:true,force:true});}
});


test('contact install finishes only after the waiter and exact active checked-code readback', () => {
  const workflow=readFileSync('.github/workflows/main.yml','utf8');
  const tmp=mkdtempSync(path.join(os.tmpdir(),'contact-completion-'));
  try {
    const bin=path.join(tmp,'bin');mkdirSync(bin);mkdirSync(path.join(tmp,'release-artifacts'));
    const archive=Buffer.from('checked contact archive fixture');
    writeFileSync(path.join(tmp,'release-artifacts/contact-lambda.zip'),archive);
    const digest=createHash('sha256').update(archive).digest('base64');
    const calls=path.join(tmp,'calls'), script=path.join(tmp,'run.sh');
    writeFileSync(script,runStep(workflow,'Update contact Lambda with exact checked archive'));
    writeFileSync(path.join(bin,'aws'),`#!${process.execPath}
const fs=require('node:fs');
const args=process.argv.slice(2),mode=process.env.CASE;
fs.appendFileSync(process.env.CALLS,JSON.stringify(args)+'\\n');
if(args[0]!=='lambda' || args[args.indexOf('--function-name')+1]!=='formSubmission')process.exit(90);
if(args[1]==='update-function-code'){if(mode==='update-failure')process.exit(21);console.log('{}');}
else if(args[1]==='wait'){if(args[2]!=='function-updated-v2')process.exit(91);if(mode==='waiter-failure')process.exit(22);}
else if(args[1]==='get-function'){
 if(mode==='read-failure')process.exit(23);
 const query=args[args.indexOf('--query')+1];
 if(query!=='[Configuration.FunctionName,Configuration.State,Configuration.LastUpdateStatus,Configuration.CodeSha256]' || args[args.indexOf('--output')+1]!=='text'){console.log('PRIVATE_ENVIRONMENT_SENTINEL');process.exit(92);}
 console.log([mode==='wrong-name'?'statsAggregator':'formSubmission',mode==='not-active'?'Pending':'Active',mode==='failed-update'?'Failed':'Successful',mode==='wrong-digest'?'wrong':process.env.CHECKED_DIGEST].join('\\t'));
}else process.exit(93);
`,{mode:0o755});
    const [shell,args]=githubRunShell(workflow,script);
    const run=(mode, functionName='formSubmission')=>{
      rmSync(calls,{force:true});
      const result=spawnSync(shell,args,{cwd:tmp,encoding:'utf8',env:{PATH:`${bin}:/usr/bin:/bin`,CALLS:calls,CASE:mode,CHECKED_DIGEST:digest,FUNCTION_NAME:functionName}});
      assert.doesNotMatch(result.stdout+result.stderr,/PRIVATE_ENVIRONMENT_SENTINEL/);
      return result;
    };
    const good=run('success');assert.equal(good.status,0,good.stdout+good.stderr);
    const executed=readFileSync(calls,'utf8').trim().split('\n').map(JSON.parse);
    assert.deepEqual(executed.map(a=>a[1]),['update-function-code','wait','get-function']);
    for(const mode of ['update-failure','waiter-failure','read-failure','not-active','failed-update','wrong-name','wrong-digest']) {
      const bad=run(mode);assert.notEqual(bad.status,0,mode+' must block release');
      const methods=readFileSync(calls,'utf8').trim().split('\n').map(line=>JSON.parse(line)[1]);
      if(mode==='update-failure')assert.deepEqual(methods,['update-function-code']);
      if(mode==='waiter-failure')assert.deepEqual(methods,['update-function-code','wait']);
    }
    assert.notEqual(run('success','statsAggregator').status,0);assert.throws(()=>readFileSync(calls));
    rmSync(path.join(tmp,'release-artifacts/contact-lambda.zip'));
    assert.notEqual(run('success').status,0);assert.throws(()=>readFileSync(calls));
  } finally {rmSync(tmp,{recursive:true,force:true});}
});

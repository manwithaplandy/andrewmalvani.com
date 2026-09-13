import assert from 'node:assert/strict';
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

test('actual publication/contact/invalidation steps reject target drift before any mutation', () => {
  const workflow=readFileSync('.github/workflows/main.yml','utf8');
  const tmp=mkdtempSync(path.join(os.tmpdir(),'website-target-'));
  try {
    const bin=path.join(tmp,'bin');mkdirSync(bin);
    const calls=path.join(tmp,'calls');
    for(const tool of ['aws','node'])writeFileSync(path.join(bin,tool),'#!/bin/bash\necho "$*" >> "$CALLS"\n',{mode:0o755});
    for(const [name,key,good] of [['Publish verified candidate and cache metadata','S3_BUCKET_NAME','mostly-upward-lion-website-bucket'],['Update contact Lambda with exact checked archive','FUNCTION_NAME','formSubmission'],['Invalidate CloudFront cache','CF_DISTRIBUTION_ID','EDHU4C51HW4BG']]) {
      const file=path.join(tmp,'step.sh');writeFileSync(file,runStep(workflow,name));const [shell,args]=githubRunShell(workflow,file);
      const run=value=>spawnSync(shell,args,{cwd:tmp,encoding:'utf8',env:{PATH:`${bin}:/usr/bin:/bin`,CALLS:calls,[key]:value}});
      assert.notEqual(run('statsAggregator').status,0);
      assert.throws(()=>readFileSync(calls));
      assert.equal(run(good).status,0);
      assert.ok(readFileSync(calls,'utf8').length>0);rmSync(calls);
    }
  } finally {rmSync(tmp,{recursive:true,force:true});}
});

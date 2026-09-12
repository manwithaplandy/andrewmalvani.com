import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {afterEach, test} from 'node:test';

import {createManifest, publishManifest} from '../publish_static_site.mjs';

const temporary = [];
afterEach(() => temporary.splice(0).forEach(directory => rmSync(directory, {recursive: true, force: true})));
function fixture() {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'e4-publication-'));
  temporary.push(directory);
  const artifact = path.join(directory, 'out');
  mkdirSync(path.join(artifact, '_next/static/chunks'), {recursive: true});
  mkdirSync(path.join(artifact, '_next/static/css'), {recursive: true});
  mkdirSync(path.join(artifact, '_next/static/media'), {recursive: true});
  mkdirSync(path.join(artifact, 'assets'));
  const html = '<link href="/_next/static/css/style-a123.css" rel="stylesheet"><script src="/_next/static/chunks/app-a123.js"></script>';
  for (const name of ['index', 'stats', 'graph', '404']) writeFileSync(path.join(artifact, name + '.html'), html);
  writeFileSync(path.join(artifact, '_next/static/chunks/app-a123.js'), 'window.example = true;');
  writeFileSync(path.join(artifact, '_next/static/css/style-a123.css'), '@font-face{src:url(../media/font-a123.woff2)}');
  writeFileSync(path.join(artifact, '_next/static/media/font-a123.woff2'), 'dummy-font');
  writeFileSync(path.join(artifact, 'assets/resume.pdf'), 'dummy-pdf');
  writeFileSync(path.join(artifact, 'assets/avatar.png'), 'dummy-stable-image');
  writeFileSync(path.join(artifact, '_next/static/media/portrait-b234.webp'), 'dummy-hashed-image');
  writeFileSync(path.join(artifact, 'stats.json'), 'must never publish this frontend copy');
  return {directory, artifact};
}

test('manifest classifies candidate bytes, includes HTML/CSS dependencies and excludes stats ownership', () => {
  const {artifact} = fixture();
  const manifest = createManifest(artifact);
  assert.equal(manifest.version, 1);
  assert.equal(manifest.files.length, 10);
  assert.ok(!manifest.files.some(file => file.key === 'stats.json'));
  const byKey = Object.fromEntries(manifest.files.map(file => [file.key, file]));
  for (const key of ['index.html', 'graph.html', 'stats.html', '404.html']) {
    assert.equal(byKey[key].cacheControl, 'public, max-age=60, s-maxage=300, no-transform');
  }
  for (const key of ['assets/resume.pdf', 'assets/avatar.png']) {
    assert.equal(byKey[key].cacheControl, 'public, max-age=60, s-maxage=300');
  }
  for (const key of ['_next/static/chunks/app-a123.js', '_next/static/css/style-a123.css', '_next/static/media/portrait-b234.webp']) {
    assert.equal(byKey[key].cacheControl, 'public, max-age=31536000, s-maxage=31536000, immutable');
  }
  assert.equal(byKey['_next/static/media/font-a123.woff2'].contentType, 'font/woff2');
  assert.match(byKey['404.html'].sha256, /^[a-f0-9]{64}$/);
});

test('missing direct or CSS dependency rejects before publication', () => {
  for (const key of ['_next/static/chunks/app-a123.js', '_next/static/media/font-a123.woff2']) {
    const {artifact} = fixture();
    rmSync(path.join(artifact, key));
    assert.throws(() => createManifest(artifact), /Missing candidate reference/);
  }
});

test('empty recovery HTML cannot replace the checked recovery document', () => {
  const {artifact} = fixture();
  writeFileSync(path.join(artifact, '404.html'), '');
  assert.throws(() => createManifest(artifact), /Empty candidate page/);
});

test('symlink and mutated or forged manifest reject before the first AWS operation', () => {
  const {artifact} = fixture();
  const manifest = createManifest(artifact);
  const calls = [];
  const run = (...args) => calls.push(args);
  assert.throws(() => publishManifest({...manifest, files: [...manifest.files, {key: '../escape'}]}, artifact, 'test-site', 'all', run), /manifest/);
  writeFileSync(path.join(artifact, 'index.html'), readFileSync(path.join(artifact, 'index.html'), 'utf8') + '<!-- changed since check -->');
  assert.throws(() => publishManifest(manifest, artifact, 'test-site', 'all', run), /manifest/);
  symlinkSync(path.join(artifact, 'index.html'), path.join(artifact, 'alias.html'));
  assert.throws(() => createManifest(artifact), /regular file|symlink/);
  assert.equal(calls.length, 0);
});

test('actual CLI refreshes unchanged metadata, preserves old hashes/stats/unrelated keys and stages assets before 404', () => {
  const {directory, artifact} = fixture();
  const manifestPath = path.join(directory, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(createManifest(artifact)));
  const remote = path.join(directory, 'remote.json');
  const existing = {
    'stats.json': {body: 'live stats', cache: 'producer-owned'},
    '_next/static/chunks/old-hash.js': {body: 'old open tab'},
    'unrelated.txt': {body: 'outside candidate'},
    'index.html': {body: readFileSync(path.join(artifact, 'index.html'), 'utf8'), cache: 'max-age=3600'},
  };
  writeFileSync(remote, JSON.stringify({objects: existing, calls: []}));
  // A real subprocess receives the CLI argument vector; no AWS SDK, login or network.
  const bin = path.join(directory, 'bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin, 'aws'), `#!${process.execPath}\nconst fs=require('node:fs');const a=process.argv.slice(2);if(a[0]!=='s3'||a[1]!=='cp'||a.includes('--recursive')||a.includes('--delete'))process.exit(2);const r=JSON.parse(fs.readFileSync(process.env.AWS_FAKE_STORE));const key=a[3].replace('s3://test-site/','');r.objects[key]={body:fs.readFileSync(a[2],'utf8'),cache:a[a.indexOf('--cache-control')+1],type:a[a.indexOf('--content-type')+1]};r.calls.push(key);fs.writeFileSync(process.env.AWS_FAKE_STORE,JSON.stringify(r));`, {mode: 0o755});
  const run = phase => {
    const result = spawnSync(process.execPath, ['scripts/publish_static_site.mjs', 'upload', '--artifact-dir', artifact, '--manifest', manifestPath, '--bucket', 'test-site', '--phase', phase], {
      env: {PATH: bin, AWS_FAKE_STORE: remote, AWS_EC2_METADATA_DISABLED: 'true', AWS_CONFIG_FILE: '/dev/null', AWS_SHARED_CREDENTIALS_FILE: '/dev/null'}, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(readFileSync(remote));
  };
  let result = run('recovery');
  assert.equal(result.calls.at(-1), '404.html');
  assert.ok(result.calls.slice(0, -1).every(key => key.startsWith('_next/static/')));
  assert.equal(result.objects['index.html'].cache, 'max-age=3600');
  assert.equal(result.objects['404.html'].cache, 'public, max-age=60, s-maxage=300, no-transform');
  const priorCalls = result.calls.length;
  result = run('all');
  const fullCalls = result.calls.slice(priorCalls);
  assert.ok(fullCalls.slice(0, 4).every(key => key.startsWith('_next/static/')));
  assert.ok(fullCalls.slice(4).every(key => !key.startsWith('_next/static/')));
  for (const key of ['index.html', 'graph.html', 'stats.html', '404.html']) {
    assert.equal(result.objects[key].cache, 'public, max-age=60, s-maxage=300, no-transform');
  }
  for (const key of ['assets/resume.pdf', 'assets/avatar.png']) {
    assert.equal(result.objects[key].cache, 'public, max-age=60, s-maxage=300');
  }
  for (const key of ['_next/static/css/style-a123.css', '_next/static/media/portrait-b234.webp']) {
    assert.equal(result.objects[key].cache, 'public, max-age=31536000, s-maxage=31536000, immutable');
  }
  assert.equal(result.objects['assets/resume.pdf'].type, 'application/pdf');
  assert.equal(result.objects['_next/static/chunks/app-a123.js'].cache, 'public, max-age=31536000, s-maxage=31536000, immutable');
  for (const key of ['stats.json', '_next/static/chunks/old-hash.js', 'unrelated.txt']) assert.deepEqual(result.objects[key], existing[key]);
});

test('failed asset upload stops before publishing recovery HTML', () => {
  const {artifact} = fixture();
  const calls = [];
  assert.throws(() => publishManifest(createManifest(artifact), artifact, 'test-site', 'recovery', (_command, args) => {
    calls.push(args);
    throw new Error('synthetic upload failure');
  }), /synthetic upload failure/);
  assert.equal(calls.length, 1);
  assert.ok(calls[0][3].includes('/_next/static/'));
});

test('missing or invalid bucket blocks the CLI before any AWS subprocess', () => {
  const {directory, artifact} = fixture();
  const manifestPath = path.join(directory, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(createManifest(artifact)));
  const marker = path.join(directory, 'aws-invoked');
  const bin = path.join(directory, 'bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin, 'aws'), `#!${process.execPath}\nrequire('node:fs').writeFileSync(process.env.AWS_MARKER,'invoked');`, {mode: 0o755});

  for (const bucketArgs of [[], ['--bucket', 'Invalid_Bucket']]) {
    const result = spawnSync(process.execPath, ['scripts/publish_static_site.mjs', 'upload', '--artifact-dir', artifact,
      '--manifest', manifestPath, ...bucketArgs, '--phase', 'all'], {
      env: {PATH: bin, AWS_MARKER: marker, AWS_EC2_METADATA_DISABLED: 'true', AWS_CONFIG_FILE: '/dev/null', AWS_SHARED_CREDENTIALS_FILE: '/dev/null'},
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /S3 bucket name/);
    assert.equal(existsSync(marker), false);
  }
});

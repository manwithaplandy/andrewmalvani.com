/** Publish only verified candidate keys. No remote inventory or deletion. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const STABLE_CACHE = 'public, max-age=60, s-maxage=300';
const HASHED_CACHE = 'public, max-age=31536000, s-maxage=31536000, immutable';
const MAX_FILES = 10_000, MAX_FILE_BYTES = 64 * 1024 * 1024, MAX_TOTAL_BYTES = 256 * 1024 * 1024;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript', '.json': 'application/json', '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.pdf': 'application/pdf',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
};
const hashed = key => key.startsWith('_next/static/');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function createManifest(artifactDirectory) {
  const root = path.resolve(artifactDirectory), files = [], references = [];
  let totalBytes = 0, visited = 0;
  assert.ok(lstatSync(root).isDirectory() && !lstatSync(root).isSymbolicLink(), 'Artifact must be a regular directory');
  function visit(relative = '') {
    for (const name of readdirSync(path.join(root, relative)).sort()) {
      const key = relative ? relative + '/' + name : name;
      assert.ok(++visited <= MAX_FILES, 'Candidate exceeds entry bound');
      assert.ok(key.length <= 1024 && /^[A-Za-z0-9_][A-Za-z0-9_./-]*$/.test(key) && !key.split('/').some(part => part === '.' || part === '..'), `Unsafe candidate key: ${key}`);
      const filename = path.join(root, key), stat = lstatSync(filename);
      assert.ok(!stat.isSymbolicLink(), `Candidate symlink is forbidden: ${key}`);
      if (stat.isDirectory()) { visit(key); continue; }
      assert.ok(stat.isFile(), `Candidate must be a regular file: ${key}`);
      // This key always belongs to the independent producer, even if a build accidentally contains it.
      if (key === 'stats.json') continue;
      totalBytes += stat.size;
      assert.ok(stat.size <= MAX_FILE_BYTES && totalBytes <= MAX_TOTAL_BYTES, 'Candidate exceeds byte bound');
      const bytes = readFileSync(filename), extension = path.extname(key);
      files.push({key, bytes: bytes.length, sha256: sha256(bytes),
        // Prevent intermediary script injection into checked HTML.
        cacheControl: (hashed(key) ? HASHED_CACHE : STABLE_CACHE) + (extension === '.html' ? ', no-transform' : ''),
        contentType: TYPES[extension] ?? 'application/octet-stream'});
      const text = ['.html', '.css'].includes(extension) ? bytes.toString('utf8') : '';
      const urls = extension === '.html'
        ? [...text.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match => match[1])
            .concat([...text.matchAll(/srcset=["']([^"']+)["']/g)].flatMap(match => match[1].split(',').map(value => value.trim().split(/\s+/)[0])))
        : [...text.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)/g)].map(match => match[1] ?? match[2] ?? match[3]);
      for (const reference of urls) {
        const url = new URL(reference, 'https://candidate.invalid/' + key);
        if (url.origin !== 'https://candidate.invalid') continue;
        const target = decodeURIComponent(url.pathname.slice(1));
        if (hashed(target)) {
          assert.ok(references.length < 50_000, 'Candidate exceeds static reference bound');
          references.push({from: key, key: target});
        }
      }
    }
  }
  visit();
  const keys = new Set(files.map(file => file.key));
  for (const required of ['index.html', 'graph.html', 'stats.html', '404.html']) {
    assert.ok(keys.has(required), `Missing candidate page: ${required}`);
    assert.ok(files.find(file => file.key === required).bytes > 0, `Empty candidate page: ${required}`);
    assert.ok(references.some(reference => reference.from === required), `Candidate page has no static references: ${required}`);
  }
  assert.ok(references.length > 0, 'Candidate pages have no static references');
  for (const reference of references) assert.ok(keys.has(reference.key), `Missing candidate reference: ${reference.from} -> ${reference.key}`);
  files.sort((a, b) => a.key.localeCompare(b.key, 'en'));
  references.sort((a, b) => (a.from + '\n' + a.key).localeCompare(b.from + '\n' + b.key, 'en'));
  const manifest = {version: 1, totalBytes, files, references};
  assert.ok(Buffer.byteLength(JSON.stringify(manifest, null, 2)) < 8 * 1024 * 1024, 'Candidate manifest exceeds byte bound');
  return manifest;
}

function runAws(command, args) {
  const result = spawnSync(command, args, {stdio: 'inherit'});
  if (result.error) throw result.error;
  assert.equal(result.status, 0, 'Candidate upload failed; remaining files were not published');
}

export function publishManifest(manifest, artifactDirectory, bucket, phase, run = runAws) {
  assert.ok(typeof bucket === 'string' && /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket), 'Expected an S3 bucket name');
  assert.ok(['recovery', 'all'].includes(phase), 'Expected recovery or all publication phase');
  // Recheck bytes, ownership, metadata and references before the first write.
  assert.deepEqual(manifest, createManifest(artifactDirectory), 'Candidate manifest no longer matches checked files');
  const files = manifest.files.filter(file => phase === 'all' || hashed(file.key) || file.key === '404.html');
  files.sort((a, b) => Number(hashed(b.key)) - Number(hashed(a.key)) || a.key.localeCompare(b.key, 'en'));
  for (const file of files) {
    // cp always refreshes metadata, including when the bytes did not change.
    // Argument arrays avoid shell interpolation; no sync/delete/remote listing.
    run('aws', ['s3', 'cp', path.resolve(artifactDirectory, file.key), `s3://${bucket}/${file.key}`,
      '--cache-control', file.cacheControl, '--content-type', file.contentType, '--only-show-errors', '--no-progress']);
  }
  return files.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, ...args] = process.argv.slice(2);
    assert.ok(['manifest', 'upload'].includes(command), 'Use manifest or upload');
    const options = {};
    for (let index = 0; index < args.length; index += 2) {
      assert.ok(['--artifact-dir', '--manifest', '--bucket', '--phase'].includes(args[index]) && args[index + 1] && !options[args[index]], 'Invalid or duplicate option');
      options[args[index]] = args[index + 1];
    }
    const root = options['--artifact-dir'], filename = options['--manifest'];
    assert.ok(root && filename, 'Use --artifact-dir and --manifest');
    if (command === 'manifest') {
      const manifest = createManifest(root);
      writeFileSync(filename, JSON.stringify(manifest, null, 2) + '\n');
      console.log(`Verified ${manifest.files.length} candidate files and ${manifest.references.length} static references; stats.json excluded.`);
    } else {
      const stat = lstatSync(filename);
      assert.ok(stat.isFile() && stat.size <= 8 * 1024 * 1024, 'Manifest exceeds file bound');
      const count = publishManifest(JSON.parse(readFileSync(filename, 'utf8')), root, options['--bucket'], options['--phase']);
      console.log(`Published ${count} verified candidate files (${options['--phase']}); refreshed metadata and retained other keys.`);
    }
  } catch (error) {
    console.error(`Static publication blocked: ${error.message}`);
    process.exitCode = 1;
  }
}

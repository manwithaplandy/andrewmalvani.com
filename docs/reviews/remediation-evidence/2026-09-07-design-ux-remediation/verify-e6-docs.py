import gzip, hashlib, json, re, subprocess
from pathlib import Path
from urllib.parse import unquote
root = Path.cwd()
ws = root / '.superpowers/sdd/2026-09-07-design-ux-remediation'
archive = root / 'docs/reviews/remediation-evidence/2026-09-07-design-ux-remediation'
current = [root / p for p in ['README.md', 'docs/content/pdf-maintenance.md', 'docs/reviews/design-ux-remediation-status.md', 'docs/operations/analytics.md', 'docs/operations/delivery.md']]
current += [archive / 'README.md', ws / 'task-E6-report.md', ws / 'e6-final-ui-acceptance.md']
missing = []; checked = 0
for path in current:
    for match in re.finditer(r'\[[^\]]*\]\(([^)]+)\)', path.read_text()):
        target = match.group(1).split('#', 1)[0]
        if not target or '://' in target or target.startswith('mailto:'):
            continue
        target = unquote(target.strip('<>'))
        resolved = path.parent / target
        checked += 1
        if not resolved.exists(): missing.append([str(path.relative_to(root)), target])
assert not missing, missing
historical = subprocess.check_output(['git', 'show', '7eb35b4:DESIGN_REVIEW.md'])
assert (root / 'DESIGN_REVIEW.md').read_bytes().split(b'\n\n', 1)[1] == historical
assert subprocess.check_output(['git', 'show', '7eb35b4:LICENSE']) == (root / 'LICENSE').read_bytes()
old_source = subprocess.check_output(['git', 'show', '7eb35b4:docs/content/resume-source.md']).split(b'-->', 1)[1]
assert (root / 'docs/content/resume-source.md').read_bytes().split(b'-->', 1)[1] == old_source
original = dict(re.findall(r'^\| (F\d{2}) \| (High|Medium|Low) \|', (root / 'reports/design-ux-review-2026-09-07.md').read_text(), re.M))
ledger = (root / 'docs/reviews/design-ux-remediation-status.md').read_text()
rows = re.findall(r'^\| \*\*(F\d{2}) (High|Medium|Low)\*\*.*?\| \*\*(open|implemented|verified|blocked)\*\*', ledger, re.M)
assert len(rows) == 30 and {r[0]: r[1] for r in rows} == original
manifest = json.loads((archive / 'archive-manifest.json').read_text())
assert {e['original'] for e in manifest['files']} == {str(p.relative_to(ws)) for p in ws.rglob('*') if p.is_file()}, 'Incomplete WS archive inventory'
sha = lambda data: hashlib.sha256(data).hexdigest()
for entry in manifest['files']:
    source = (ws / entry['original']).read_bytes()
    stored = (archive / entry['stored']).read_bytes()
    assert len(source) == entry['originalBytes'] and sha(source) == entry['originalSha256'], entry['original']
    assert len(stored) == entry['storedBytes'] and sha(stored) == entry['storedSha256'], entry['stored']
    assert (gzip.decompress(stored) if entry['stored'].endswith('.gz') else stored) == source
six = ['task-A2-report.md', 'task-C1-report.md', 'evidence/c1-browser-evidence.txt', 'evidence/c1-contact-summary-320.png', 'evidence/c1-counter-near-limit.png', 'evidence/c1-counter-ordinary.png']
for name in six: assert (ws / name).read_bytes() == (archive / name).read_bytes()
subprocess.run(['git', 'diff', '--check'], check=True)
print(json.dumps({'currentDocumentLinksChecked': checked, 'missingLinks': missing, 'originalFindingIdsAndSeverities': len(rows), 'statusCounts': {s: sum(r[2] == s for r in rows) for s in ('verified', 'implemented', 'blocked', 'open')}, 'historicalReviewBodyUnchanged': True, 'licenseUnchanged': True, 'visiblePdfSourceUnchanged': True, 'archiveEntriesVerified': len(manifest['files']), 'gzipRoundTrips': sum(e['stored'].endswith('.gz') for e in manifest['files']), 'sixTrackedScratchCopiesIdentical': True, 'gitDiffCheck': 'pass'}, indent=2))

"""Controller-only local preservation audit; no network or deletion."""
from datetime import datetime, timezone
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

root = Path.cwd()
ws = root / '.superpowers/sdd/2026-09-07-design-ux-remediation'
archive = root / 'docs/reviews/remediation-evidence/2026-09-07-design-ux-remediation'
report_path = root / 'docs/reviews/design-ux-remediation-closure-verification.json'
manifest = json.loads((archive / 'archive-manifest.json').read_text())
failures = []
secret_candidates = []
raw_candidates = []
sha = lambda data: hashlib.sha256(data).hexdigest()
signatures = {
    'aws_key': rb'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b',
    'github_token': rb'\b(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{50,}\b',
    'private_key': rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----',
    'signed_aws_url': rb'X-Amz-(?:Signature|Security-Token)=[A-Za-z0-9%+/]{16,}',
}
for entry in manifest['files']:
    rel = Path(entry['original'])
    stored_rel = Path(entry['stored'])
    if rel.is_absolute() or '..' in rel.parts or stored_rel.is_absolute() or '..' in stored_rel.parts:
        failures.append('unsafe path:' + str(rel))
        continue
    source = ws / rel
    stored_path = archive / stored_rel
    if source.is_symlink() or stored_path.is_symlink():
        failures.append('symlink:' + str(rel))
        continue
    original = source.read_bytes()
    stored = stored_path.read_bytes()
    restored = gzip.decompress(stored) if str(stored_rel).endswith('.diff.gz') else stored
    if (original != restored or len(original) != entry['originalBytes'] or len(stored) != entry['storedBytes']
            or sha(original) != entry['originalSha256'] or sha(stored) != entry['storedSha256']):
        failures.append('identity:' + str(rel))
    for name, expression in signatures.items():
        if re.search(expression, restored):
            secret_candidates.append({'path': str(rel), 'signature': name})
    if rel.suffix == '.json':
        try:
            data = json.loads(restored)
            if isinstance(data, dict) and (('lineage' in data and 'serial' in data and 'resources' in data)
                or ('format_version' in data and 'terraform_version' in data and ('planned_values' in data or 'prior_state' in data))):
                raw_candidates.append(str(rel))
        except (ValueError, UnicodeError):
            pass
actual_sources = {str(p.relative_to(ws)) for p in ws.rglob('*') if p.is_file()}
expected_sources = {e['original'] for e in manifest['files']}
if actual_sources != expected_sources:
    failures.append('workspace inventory mismatch')
actual_stored = {str(p.relative_to(archive)) for p in archive.rglob('*') if p.is_file()}
expected_stored = {e['stored'] for e in manifest['files']} | set(manifest['excludedFromSelfHash'])
if actual_stored != expected_stored:
    failures.append('archive inventory mismatch')
tracked = subprocess.run(['git', 'ls-files', '-z', str(ws.relative_to(root))], check=True, capture_output=True).stdout.decode().strip('\0').split('\0')
preserved_tracked = []
for name in tracked:
    rel = str((root / name).relative_to(ws))
    entry = next(e for e in manifest['files'] if e['original'] == rel)
    data = (root / name).read_bytes()
    committed = subprocess.run(['git', 'show', 'HEAD:' + name], check=True, capture_output=True).stdout
    equal = data == committed and sha(data) == entry['originalSha256']
    preserved_tracked.append({'original': name, 'archived': str((archive / entry['stored']).relative_to(root)), 'sha256': sha(data), 'matchesCommittedAndArchived': equal})
    if not equal:
        failures.append('tracked preservation:' + name)
if len(preserved_tracked) != 6:
    failures.append('unexpected tracked scratch count')
rulings = re.findall(r'^([0-9]+)\. ', (archive / 'rulings.md').read_text(), re.M)
if rulings != [str(i) for i in range(1, 29)]:
    failures.append('rulings inventory')
ledger = (root / 'docs/reviews/design-ux-remediation-status.md').read_text()
rows = re.findall(r'^\| \*\*(F[0-9]{2}) (High|Medium|Low)\*\*.*?\| \*\*(verified|implemented|blocked|open)\*\*', ledger, re.M)
if [r[0] for r in rows] != [f'F{i:02}' for i in range(1, 31)]:
    failures.append('finding inventory')
counts = {state: sum(row[2] == state for row in rows) for state in ['verified', 'implemented', 'blocked', 'open']}
if counts != {'verified': 11, 'implemented': 14, 'blocked': 5, 'open': 0}:
    failures.append('finding status totals')
current_docs = [root / 'README.md', root / 'DESIGN_REVIEW.md', root / 'docs/reviews/design-ux-remediation-status.md', root / 'docs/reviews/design-ux-remediation-completion.md', archive / 'README.md']
current_docs += sorted((root / 'docs/content').glob('*.md')) + sorted((root / 'docs/operations').glob('*.md'))
links = 0
for doc in current_docs:
    for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)', doc.read_text()):
        target = target.strip('<>')
        if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', target) or target.startswith('#'):
            continue
        target = re.sub(r':\d+$', '', target.split('#')[0])
        if not target:
            continue
        candidate = (doc.parent / target).resolve()
        links += 1
        if not candidate.exists() and candidate != report_path:
            failures.append('missing current link:' + str(doc.relative_to(root)) + ' -> ' + target)
head = subprocess.run(['git', 'rev-parse', 'HEAD'], check=True, capture_output=True, text=True).stdout.strip()
report = {
    'checkedAt': datetime.now(timezone.utc).isoformat(),
    'implementationHead': head,
    'filesVerified': len(manifest['files']),
    'gzipDiffsVerified': sum(e['stored'].endswith('.diff.gz') for e in manifest['files']),
    'originalBytesVerified': sum(e['originalBytes'] for e in manifest['files']),
    'storedBytesVerified': sum(e['storedBytes'] for e in manifest['files']),
    'archiveManifestSha256': sha((archive / 'archive-manifest.json').read_bytes()),
    'allSourceFilesInventoried': actual_sources == expected_sources,
    'allStoredFilesInventoried': actual_stored == expected_stored,
    'integrityFailures': failures,
    'secretSignatureCandidates': secret_candidates,
    'rawStateOrPlanStructureCandidates': raw_candidates,
    'trackedScratchCopies': preserved_tracked,
    'rulingsVerified': len(rulings),
    'findingStatuses': counts,
    'maintainedDocumentsChecked': len(current_docs),
    'localLinksChecked': links,
    'finalInputEvidence': 'remediation-evidence/2026-09-07-design-ux-remediation/evidence/controller-final-inputs.json',
    'scratchCleanup': 'Pending this audit; delete only the exact plan workspace after zero failures and controlled provenance review.',
    'limits': 'Exact byte/length/hash and gzip round-trip audit, local links and inventories only. Signature/structure heuristics do not prove secret absence; sanitized provenance/private-file exclusion remains required. Metadata README and manifest are excluded from self-hash. Historical report paths and whitespace remain exact. No application test, cloud query or release performed.'
}
report_path.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: report[k] for k in ['filesVerified', 'gzipDiffsVerified', 'rulingsVerified', 'findingStatuses', 'localLinksChecked', 'integrityFailures', 'secretSignatureCandidates', 'rawStateOrPlanStructureCandidates']}))
assert not failures and not secret_candidates and not raw_candidates, 'Inspect recorded audit findings before any cleanup.'

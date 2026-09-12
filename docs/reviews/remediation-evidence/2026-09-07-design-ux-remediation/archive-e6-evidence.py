"""Preserve the approved nonsecret SDD record; never follow links outside WS."""
import gzip
import hashlib
import io
import json
from pathlib import Path

ws = Path('.superpowers/sdd/2026-09-07-design-ux-remediation')
target = Path('docs/reviews/remediation-evidence/2026-09-07-design-ux-remediation')
target.mkdir(parents=True, exist_ok=True)
allowed = {'.md', '.diff', '.png', '.json', '.headers', '.txt', '.mjs', '.py', '.conf', '.log', '.pdf', '.js'}
entries = []
for source in sorted(ws.rglob('*')):
    if source.is_symlink():
        raise ValueError(f'Unexpected symlink: {source}')
    if not source.is_file():
        continue
    if source.suffix not in allowed:
        raise ValueError(f'Unreviewed file type: {source}')
    relative = source.relative_to(ws)
    data = source.read_bytes()
    stored = data
    output_name = relative
    if source.name.startswith('review-') and source.suffix == '.diff':
        stream = io.BytesIO()
        with gzip.GzipFile(filename='', mode='wb', fileobj=stream, mtime=0) as handle:
            handle.write(data)
        stored = stream.getvalue()
        assert gzip.decompress(stored) == data
        output_name = Path(str(relative) + '.gz')
    output = target / output_name
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(stored)
    assert output.read_bytes() == stored
    entries.append({'original': str(relative), 'stored': str(output_name), 'originalBytes': len(data),
                    'storedBytes': len(stored), 'originalSha256': hashlib.sha256(data).hexdigest(),
                    'storedSha256': hashlib.sha256(stored).hexdigest()})
manifest = {'sourceWorkspace': str(ws), 'scope': 'Nonsecret reports, briefs, contexts, rulings, review packages and evidence; no private external paths followed.',
            'gzip': 'Review diffs only; empty filename, mtime=0; exact decompression verified.',
            'excludedFromSelfHash': ['README.md', 'archive-manifest.json'], 'files': entries}
(target / 'archive-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'files': len(entries), 'originalBytes': sum(e['originalBytes'] for e in entries),
                  'storedBytes': sum(e['storedBytes'] for e in entries), 'compressedDiffs': sum(e['stored'].endswith('.diff.gz') for e in entries)}))

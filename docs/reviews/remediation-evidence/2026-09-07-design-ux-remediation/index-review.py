"""Index an already-generated review package without changing its contents."""
import hashlib
import json
from pathlib import Path
import re
import sys

source = Path(sys.argv[1])
output = Path(sys.argv[2])
raw = source.read_bytes()
lines = raw.decode("utf-8", errors="replace").split("\n")
if lines and not lines[-1]:
    lines.pop()
sections = []
for number, line in enumerate(lines, 1):
    match = re.match(r"diff --git a/(.+) b/(.+)$", line)
    if not match:
        continue
    if sections:
        sections[-1]["end_line"] = number - 1
    path = match.group(2)
    category = "runtime-and-configuration"
    if path.startswith(("tests/", "scripts/tests/")):
        category = "tests"
    elif path.startswith(("docs/reviews/remediation-evidence/", ".superpowers/")):
        category = "historical-evidence"
    elif path.startswith(("docs/", "reports/")) or path in ("README.md", "DESIGN_REVIEW.md"):
        category = "documentation"
    sections.append({"path": path, "category": category, "start_line": number})
if sections:
    sections[-1]["end_line"] = len(lines)
output.write_text(json.dumps({"source": str(source), "sha256": hashlib.sha256(raw).hexdigest(), "line_count": len(lines), "sections": sections}, indent=2) + "\n")
print(f"Indexed {len(sections)} file sections / {len(lines)} lines; package unchanged")

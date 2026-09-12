# Résumé PDF maintenance

The editable source is [resume-source.md](resume-source.md); the published artifact is [public/assets/resume.pdf](../../public/assets/resume.pdf). Keep unresolved owner facts in [professional-facts.md](professional-facts.md). The generator is a local maintenance tool, not part of the website build or an authorization to reconcile uncertain claims.

Use Python 3.12 in a disposable environment, from the repository root:

```sh
python3.12 -m venv /tmp/react-resume-pdf-venv
. /tmp/react-resume-pdf-venv/bin/activate
python -m pip install -r scripts/requirements-pdf.txt
python -m pip check
python scripts/generate_resume_pdf.py
```

The direct generator dependencies are pinned to the verified versions, ReportLab 4.4.9 and pypdf 6.10.0. The generator uses ReportLab’s standard Helvetica fonts; no workstation-specific font path is required. Use `--output /tmp/resume-candidate.pdf` to review a candidate before replacing the source artifact. Generation may update PDF metadata; do not claim byte reproducibility from the direct dependency pins alone.

After any change:

1. Confirm all role/date/metric/education/credential wording against the approved source record. Retain distinct contexts while owner questions remain unanswered.
2. Render the PDF with a viewer or Poppler (`pdftoppm -scale-to 1600 -png -singlefile public/assets/resume.pdf /tmp/resume-page`) and inspect the full page for clipped text, missing bullets, overlaps and unwanted pages. Browser zoom or extracted text alone does not prove visual fit.
3. Verify **one page** and both exact annotation targets: `mailto:andrewrmalvani@gmail.com` and `https://www.linkedin.com/in/andrewmalvani`.
4. Build the site, activate its named PDF download and verify the exported bytes match the reviewed artifact.

The generator currently guards page count and the number of URI annotations; it does **not** enforce the two URI identities. The explicit identity check above remains required. Optional future guard hardening is separate work. The E6 acceptance record preserved the current one-page rendering, full text, exact targets and source/export SHA256; it did not invent missing facts or change generator behavior.

For a portable annotation check after generation:

```sh
python - <<'PY'
from pypdf import PdfReader
reader = PdfReader('public/assets/resume.pdf')
assert len(reader.pages) == 1
uris = []
for annotation in reader.pages[0].get('/Annots', []):
    action = annotation.get_object().get('/A', {})
    if action.get('/S') == '/URI':
        uris.append(str(action['/URI']))
assert sorted(uris) == sorted([
    'mailto:andrewrmalvani@gmail.com',
    'https://www.linkedin.com/in/andrewmalvani',
])
print('One page; both exact URI targets verified.')
PY
```

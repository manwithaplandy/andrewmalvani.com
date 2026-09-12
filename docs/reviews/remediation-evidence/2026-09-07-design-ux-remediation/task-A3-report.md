# Task A3 implementation report

## Status

DONE_WITH_CONCERNS. All work independent of owner input is complete. F05, F20, and F24 remain open only for the factual decisions listed below; no open row is represented as resolved.

Scoped commit: `249c4fc content: reconcile professional facts across resume views`.

## What I implemented

- Added `docs/content/professional-facts.md` as the cross-format fact record. It separates role dates, employer tenure, career start, education status, metric scopes, credential evidence, and skill-tier dependencies. Every unresolved row says what evidence is missing and which existing context remains published.
- Added `docs/content/resume-source.md` as the complete editable text used to generate the PDF.
- Added the approved narrow `scripts/generate_resume_pdf.py` generator. It parses the Markdown source rather than duplicating résumé prose, builds a one-page US Letter PDF, creates email/LinkedIn annotations, and refuses output that is not one page or lacks both links.
- Regenerated `public/assets/resume.pdf` from the editable source. It uses 10pt accomplishment text and 9pt dates, preserves all prior PDF accomplishments, separates General Atomics roles at June 2024, keeps both the $15M chatbot spend-avoidance claim and the distinct $50M self-service-agent ROI claim, retains the PDF's 90% deployment metric, and labels Georgia Tech as in progress with expected completion in 2028.
- Preserved source-specific unresolved facts: website residence remains Arizona while PDF residence remains San Diego, CA 92131; the website retains "Azure AI Engineer" while the PDF retains its original "Azure AI Engineer Associate" title.
- Corrected the graph introduction from an implied current-role start in 2018 to `since June 2024`.
- Reworked About copy around the psychology-to-engineering path and current focus while leaving quantified outcomes in the work timeline.
- Changed machine-readable education metadata so UCSB is alumni history and Georgia Tech is represented as current study with expected completion in 2028.
- Extended `Certification` with optional `verificationUrl` and `status`, and added conditional card rendering. Neither field is populated without evidence. Existing years are shown neutrally as `Year listed`.
- Removed current-certification wording from graph skill descriptions and made graph credential nodes state that URL, date meaning, and current status evidence have not been supplied. Graph structure and navigation are unchanged.
- Kept skill tiers and numeric ratings unchanged. The source comment records that the thresholds preserve the existing presentation and do not establish the pending skill-level meanings.

## Unresolved facts and finding status

1. **Residence / F05:** The website says Arizona; the PDF says San Diego, CA 92131. No owner-approved residence wording has been supplied. Both remain only in their pre-existing contexts.
2. **Deployment metric / F05:** The website says days-to-minutes; the PDF says 90%. They remain separate pending confirmation that their scope and measurement are the same.
3. **$50M ROI scope / F05:** The pre-A3 PDF ties this to labor-efficiency gains from self-service agents. Its organizational scope and measurement basis remain unconfirmed; it was not added to the website or combined with the chatbot's $15M annual spend avoidance.
4. **Skill tiers / F20:** Proposed Familiar/Proficient/Expert definitions and all current ratings still require owner approval. No new interpretation was published.
5. **Credentials / F24:** Verification URLs, current/historical status, year meanings, and the exact Azure credential title remain unconfirmed. The website and PDF preserve their distinct prior titles. No verification URL or status is populated.

## Verification

Application checks used Node 22 with the known-clean `PREFIX=/private/tmp/react-resume-prefix`, `YARN_CACHE_FOLDER=/private/tmp/react-resume-yarn-cache`, and `env -u NO_COLOR` environment.

- `yarn typecheck`: passed; TypeScript completed with exit 0.
- `yarn typecheck:tests`: passed; test TypeScript completed with exit 0.
- `yarn lint`: passed with zero warnings.
- `yarn build`: passed; Next.js compiled successfully, generated all five static pages, and next-sitemap completed.
- `python3 -m py_compile scripts/generate_resume_pdf.py`: passed.
- Source-to-PDF content check: passed; 19/19 Markdown list items were found in coordinate-aware PDF extraction, with explicit assertions for both General Atomics date ranges, both dollar metrics, 90% deployment improvement, expected-2028 education, and both PDF credential titles.
- PDF structure: one US Letter page, 2,902 selectable extracted characters, and working `mailto:` and LinkedIn URI annotations. Candidate and promoted output share SHA-256 `246239dc0c28c26121734ad9780ecb1caad83e1f6564c549b51b89db4a024fa5`.
- PDF visual inspection: final 150-DPI rendering has no clipping, overlap, broken glyphs, or unreadable columns. The controller also inspected and accepted the final 10pt candidate.
- 320px browser check: homepage and graph both report `scrollWidth === clientWidth === 320`. The longest skill label wraps within a 246px-wide box; the longest credential title wraps within a 174px-wide box. Focused images were captured only after the relevant cards' computed opacity reached 1.
- Metadata check in the built page: `alumniOf` contains UCSB only; Georgia Tech appears under current membership/study with `M.S. Computer Science student, expected 2028`.
- Graph check in the built page: introduction renders `Lead AI/ML Engineer, General Atomics · since June 2024`.
- `git diff --check -- . ':(exclude)public/assets/resume.pdf'`: passed. The binary PDF is excluded because ReportLab's valid PDF syntax contains bytes that Git reports as trailing whitespace.

## PDF toolchain

- Verified Python: `/Users/andrew/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3` (Python 3.12.14).
- Verified libraries: ReportLab 4.4.9, pdfplumber 0.11.9, pypdf 6.10.0.
- Verified Poppler: `/Users/andrew/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/pdftoppm` and `pdfinfo`.
- Regeneration command from the repository root: `/Users/andrew/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/generate_resume_pdf.py`.

## Evidence

- Final candidate PDF: `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/a3-resume-candidate.pdf`
- Final candidate render: `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/a3-resume-candidate.png`
- Promoted PDF render: `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/a3-resume-final.png`
- PDF content and link results: `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/a3-pdf-content-check.txt`
- Full 320px homepage: `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/a3-homepage-320.png`
- Settled Coding Languages card: `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/a3-skills-320.png`
- Settled AWS credential card: `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/a3-credentials-320.png`
- 320px graph introduction: `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/a3-graph-320.png`
- Browser measurements and metadata: `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/a3-browser-evidence.txt`

## Files changed

- `docs/content/professional-facts.md`
- `docs/content/resume-source.md`
- `scripts/generate_resume_pdf.py`
- `public/assets/resume.pdf`
- `src/components/Layout/Page.tsx`
- `src/components/Sections/Resume/CertificationItem.tsx`
- `src/components/Sections/Resume/Skills.tsx`
- `src/data/data.tsx`
- `src/data/dataDef.ts`
- `src/data/graphData.ts`
- `src/data/siteConfig.ts`
- `src/pages/graph.tsx`

## Self-review

- Re-read the task brief, constraints, full diff, editable source, fact record, extracted PDF text, and final render.
- Replaced scratch-workspace evidence references in durable docs with `public/assets/resume.pdf` at pre-A3 commit `e68ab16`.
- Restored the prior PDF's exact "Azure AI Engineer Associate" title after finding that the website uses a shorter title.
- Increased PDF body text from the first draft's 7-8pt range to 10pt and re-rendered before promoting the inspected candidate.
- Confirmed temporary `tmp/` and Python bytecode artifacts are excluded from the commit.

## Concerns

The implementation is complete within supplied evidence, but F05, F20, and F24 cannot close until the owner resolves the five rows above. The new credential interface is intentionally dormant until trustworthy URLs/status values are supplied.

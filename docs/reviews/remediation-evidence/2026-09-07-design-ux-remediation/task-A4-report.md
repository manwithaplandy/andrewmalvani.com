# Task A4 implementation report

## Status

DONE_WITH_CONCERNS. The independent code, image-presentation, evidence-record and verification work is complete. F21 is addressed locally. F16 and the planned evidence-first reordering remain open because no owner-approved Rolefit, Polyscannr or substitute project narratives were supplied.

Scoped commit: `4cb3ee0 content: surface project ownership and engineering decisions`.

## What I implemented

- Extended `PortfolioItem` with optional `caseStudy`, containing the required `problem`, `contribution`, `decision` and `outcome` strings. Added `imageAlt` and optional `imageFit` so image presentation is explicit in project data.
- Extracted `PortfolioCard` into `src/components/Sections/PortfolioCard.tsx` under the controller-approved narrow file-map ruling. `Portfolio.tsx` remains responsible for section/list composition; the card owns its link, image framing and optional evidence disclosure.
- Rendered approved case studies through native `details`/`summary` markup named `Project details`, with a labeled definition list. The project link and disclosure are siblings. Both retain visible keyboard focus; link-only image and icon hover effects use a named link group.
- Changed the generic `GitHub` title to `Source for this site` and changed `Personalized AI-driven job board` to `Rolefit`, with purpose-oriented supporting copy. Changed the architecture title to `Site architecture` and described it as a diagram rather than claiming every depicted service is currently enabled.
- Added specific image alternatives for all five cards. Product screenshots and the source image use centered cover framing. The architecture diagram uses contained framing with padding and a dark backing, preserving the full 1324 x 922 diagram without bitmap changes.
- Preserved the existing order because the brief makes Rolefit/Polyscannr-first ordering contingent on approved narratives.
- Added `docs/content/project-evidence.md`. It records what each screenshot/public check supports, what remains unsubstantiated, the publication decision for each project, the architecture/WAF caveat and the exact F16 gate.
- Extended `tests/e2e/navigation.spec.ts` only for portfolio navigation/disclosure behavior. Permanent coverage verifies the precise Source and Rolefit links and confirms the final page publishes zero unapproved disclosures.

## Factual acceptance items still blocked

Two complete narratives are still unavailable. For both Rolefit and Polyscannr, supplied evidence does not establish Andrew's actual responsibility, one consequential decision or constraint, or an observable result. The Rolefit public-page preflight supports only visible interface behavior. The Polyscannr public destination was not inspected because the web preflight returned a tool-level safety refusal, which is not evidence the site is unavailable.

Consequently:

- No production `caseStudy` value is populated.
- Rolefit and Polyscannr are not moved to the lead positions.
- A reviewer still cannot explain Andrew's contribution to two leading projects from the page without inventing facts.
- F16 remains open. Closing it requires two owner-approved/source-backed four-part narratives, followed by adding those values, applying the contingent order and rerunning the same keyboard/link reading journey.

## TDD evidence

### RED

A temporary synthetic `caseStudy` was attached to the real Rolefit item in the isolated local test build. The focused test exercised the extracted production `PortfolioCard` through the generated site:

`yarn playwright test tests/e2e/navigation.spec.ts --grep "approved project evidence"`

Expected failure before disclosure implementation:

`Locator: #portfolio a[href="https://jobs.andrewmalvani.com"] ... getByRole('group')`

`Error: element(s) not found`

The test reached the ordinary project link and failed because the production card did not render a native disclosure.

### GREEN

After adding the optional interface and native disclosure rendering, the same production-card test passed:

`1 passed (2.2s)`

The positive path was then tightened with a temporary synthetic case study on the Site architecture card so its separate local-image link could be followed without external network access. The browser opened `Project details` with Enter, showed all four labels, verified `details` was not inside the anchor, focused the link, opened it with Enter in a popup, closed the popup and returned to the still-open disclosure:

`1 passed (2.3s)`

Both synthetic fixtures and their positive fixture-dependent test were removed before the clean final build. They were never committed, pushed or deployed. Permanent coverage guards the actual approved state: ordinary destination links remain usable and no disclosure is published without approved data.

## Final verification

All application commands used Node 22 with `env -u NO_COLOR`, `PREFIX=/private/tmp/react-resume-prefix` and `YARN_CACHE_FOLDER=/private/tmp/react-resume-yarn-cache`.

- `yarn build`: passed after fixture removal; application compile succeeded, five static pages generated and next-sitemap completed.
- `yarn typecheck`: passed with exit 0.
- `yarn typecheck:tests`: passed with exit 0.
- `yarn lint`: passed with zero warnings.
- `yarn playwright test tests/e2e/navigation.spec.ts`: 8/8 passed on the final export, including the architecture image content-type/popup path and the new ordinary-link/no-unapproved-disclosure check.
- `git diff --check`: passed before the report was written.

## Browser and visual evidence

The optional `agent-browser` executable was unavailable (`command not found`), so I used the repository's established Playwright capture pattern in `evidence/capture-a4.mjs`.

- Desktop 1440 x 1000: five cards rendered, no horizontal overflow, all reveal ancestor chains at opacity 1, zero disclosures and zero console/page errors.
- Phone 320 x 844: five cards rendered, document client/scroll widths both 320, all reveal ancestor chains at opacity 1, zero disclosures and zero console/page errors.
- Computed framing: architecture image `object-fit: contain`; four other images `object-fit: cover`.
- Visual inspection of both captures found no clipped text, distorted images, overlapping card content or hidden cards. The architecture diagram is complete at card size; the product screenshots retain their central interface regions.

Evidence files:

- `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/a4-browser-evidence.txt`
- `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/a4-portfolio-desktop.png`
- `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/a4-portfolio-320.png`
- `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/capture-a4.mjs`

## Files changed

- `docs/content/project-evidence.md`
- `src/components/Sections/Portfolio.tsx`
- `src/components/Sections/PortfolioCard.tsx`
- `src/data/data.tsx`
- `src/data/dataDef.ts`
- `tests/e2e/navigation.spec.ts`

Task-local report and visual evidence live under `.superpowers/sdd/2026-09-07-design-ux-remediation/` and are ignored execution artifacts.

## Self-review

- Re-read the A4 brief, context, global constraints, implementer prompt and complete scoped diff.
- Confirmed no `caseStudy` population or synthetic narrative remains in `src`, tests or the permanent evidence record.
- Confirmed the five existing destination URLs and their order remain unchanged.
- Confirmed the project link does not wrap `details`; focus styles exist independently on the anchor and summary.
- Confirmed link-specific hover selectors no longer respond to disclosure hover, while the containing SpotlightCard remains consistent across its interactive card area.
- Confirmed no bitmap source was altered.
- Corrected the architecture description and evidence note so the image does not imply the depicted WAF is currently enabled.
- Inspected both final screenshots at their rendered sizes after every Reveal ancestor reached opacity 1.

## Concerns

Positive disclosure behavior is verified locally against the real production card with isolated synthetic data, but it cannot remain exercised on the final public page until approved narrative data exists. The permanent test intentionally checks the current evidence gate instead. F16 and evidence-first ordering remain blocked on owner/source facts; no implementation shortcut can truthfully close them.

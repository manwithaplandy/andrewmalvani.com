# E6 bounded browser and PDF acceptance preparation

Recorded 2026-09-08, ending approximately 14:13 UTC. Read-only QA by the existing review_b3 worker, not E6 implementation or an independent whole-branch review. Only ignored workspace scripts, captures and this report were written. No source edits, commit, rebuild, cloud query, public request, contact send or full-suite repetition occurred. This report deliberately does not assign final F01–F30 statuses.

## Artifact and verification boundary

The existing `out/` exactly matches the E5 checked-site manifest: 54 candidate files; manifest SHA256 `573adcb914353bd5def8961b255297d65d8658f29362f373195518832d704526`. The tested export source is **3408657**. Subsequent **c9a2a6f** changes workflow/tests only. See [export verification](evidence/e6-export-verification.json) and [E5 manifest](evidence/e5-checked-site-manifest.json). The E5 full backend/browser/Node/build/types/lint/Terraform pass is prior evidence, not rerun by this worker and not evidence for any later UI fix. Root's later state-backed plan is also separate evidence.

Used an existing local server, Node 22.16.0, Playwright Chromium, and browser reduced-motion emulation. Every browser context blocked non-local requests. Contact OPTIONS/POST were intercepted before external-origin blocking; the POST used a held fake route and then a network abort. Stats used the existing current-v2 fixture with browser time fixed to September 8 where noted in the script. These are synthetic consumer checks, not live analytics freshness or contact delivery verification.

Main local commands, executed from the worktree:

```sh
PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH node node_modules/serve/build/main.js out --listen tcp://127.0.0.1:3104
PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH node .superpowers/sdd/2026-09-07-design-ux-remediation/e6-browser-audit.mjs
PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH node .superpowers/sdd/2026-09-07-design-ux-remediation/e6-graph-render.mjs
PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH node .superpowers/sdd/2026-09-07-design-ux-remediation/e6-graph-instrumented.mjs
PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH node .superpowers/sdd/2026-09-07-design-ux-remediation/e6-supplement.mjs
PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH node .superpowers/sdd/2026-09-07-design-ux-remediation/e6-supplement-remaining.mjs
PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH node .superpowers/sdd/2026-09-07-design-ux-remediation/e6-final-navigation.mjs
```

The ignored scripts contain exact assertions, interception, measurement and capture operations. Stdout/error files are [main audit](evidence/e6-browser-audit.log), [graph settling](evidence/e6-graph-render.log), [instrumented graph](evidence/e6-graph-instrumented.log), [supplement](evidence/e6-supplement.log), [remaining supplement](evidence/e6-supplement-remaining.log), and [settled navigation](evidence/e6-final-navigation.log). The main audit completed with **55 capture records, 53 contrast states and no page errors**. Additional checks were scoped to uncovered rendering, composition and navigation risks, not another full suite.

## Concrete remaining acceptance issue

**Important — combined phone width and 200% root text size still overflows homepage content.** This is the same no-horizontal-panning/readable-content acceptance family as the original High F01. It was raised to the controller before any fix. The controller has assigned the correction to the upcoming E6 source work; it is not corrected in this export.

Reproduction: use the checked export at a 320, 390 or 430 CSS-pixel viewport; set `document.documentElement.style.fontSize = '200%'`; await `document.fonts.ready` and settling; inspect contact and the complete document's element bounds. The chosen text size must be preserved. At 390 and 430, only the email link exceeds viewport width. At 320, additional rows are hidden by the larger email contribution to overall scroll width.

| Surface / source | Observed geometry before horizontal scrolling | Cause supported by computed layout |
| --- | --- | --- |
| Contact email, `src/components/Sections/Contact/index.tsx:44–55` | All three widths yield document width **478px**. Link left16, width462.42, right478.42; email text28px, right462.42 | Flex anchor and span retain automatic minimum widths; normal word breaking cannot split the address |
| Contact GitHub, same source | At320, link right321.14 | Same flex/minimum-width boundary |
| About facts, `src/components/Sections/About.tsx:28–31` | At320, citizenship right348.89, interests363.84, employer351.13 | Nonwrapping flex row, automatic minimum widths, label/value competition |
| Timeline date, `src/components/Sections/Resume/TimelineItem.tsx:15–18` | At320, September2017 right332.83 | Location/bullet/date flex row has insufficient width at28px text |
| Skill tier/indicator group, `src/components/Sections/Resume/Skills.tsx:47–50` | At320, Proficient group right356.25; group width283.25 within a174px row content area | The outer skill row wraps, but its inner `shrink-0` tier-and-bars group does not; indicators escape the card/content boundary |

Evidence: [all-width offender inventory](evidence/e6-overflow-200-matrix.json), [font-settled source layout](evidence/e6-overflow-320-layout.json), [separate390 reproduction](evidence/e6-overflow-200.json), [supplement measurements](evidence/e6-supplement.json); exact [matrix log](evidence/e6-overflow-matrix.log), [detail log](evidence/e6-overflow-detail.log) and [initial reproduction log](evidence/e6-overflow-check.log). Scripts are `e6-overflow-check.mjs`, `e6-overflow-matrix.mjs`, and `e6-overflow-detail.mjs`. The 390 reproduction remains478 after font readiness plus3seconds, so this is not an initial-font or animation race. Rechecking1280 with the same text enlargement gives1280 scroll width.

Representative viewport captures: [320 contact](evidence/e6-text200-contact-320-viewport.png), [390 contact](evidence/e6-text200-contact-390-viewport.png), [430 contact](evidence/e6-text200-contact-430-viewport.png), [About](evidence/e6-text200-320-about.png), [timeline](evidence/e6-text200-320-timeline.png), [skills](evidence/e6-text200-320-skills.png). The detail script's `scrollIntoViewIfNeeded` can horizontally pan to the offending element; those latter screenshots illustrate that undesirable panning as well as overflow. Use the matrix's pre-pan coordinates for exact viewport comparisons. Computed ancestors report `overflow: visible`; the skills problem is escape from its intended card boundary, not a proven `overflow:hidden` clipping mechanism.

The original `tests/e2e/homepage.spec.ts:20–24` enlarged-text case tests **1280x900 only**. Its normal-size320/390/430 tests and desktop enlarged-text result remain truthful. A future fix should cover the combined phone/enlarged-text matrix and internal row/card boundaries, not merely the largest document-width offender. Systematic-debugging skill was used for reproduction, source/layout tracing and checking the earlier test matrix. No proposed CSS was injected as a product fix.

## Visual and journey evidence that holds for this export

- **High F01 normal-size conditions:** home/resume/portfolio/contact captures at1280x900,320x844,390x844,430x932 and844x390 show no horizontal document overflow. Hero actions remain contained; desktop identity/photo and mobile natural vertical flow remain intact. See [geometry/capture records](evidence/e6-browser-acceptance.json), and representative [desktop](evidence/e6-home-1280.png), [320](evidence/e6-home-320.png), [390 résumé](evidence/e6-resume-390.png), [430](evidence/e6-home-430.png), [landscape](evidence/e6-home-844.png). Enlarged graph text view fits390; homepage combined enlargement is the issue above.
- **High F02 visible keyboard focus:** direct text-list role button and Python search result show a clear orange2px focus ring. Enter selects the Python item and its actual details contain “Primary language”. [Direct list focus](evidence/e6-graph-list-direct-keyboard-focus.png), [320 Python](evidence/e6-graph-list-320.png), and `listKeyboardFocus` in the supplement record corroborate actual computed box-shadow. The supplement's guessed `graph-details-role:lead-ai-ml` count0 is not a failed product assertion; the valid Python contract is asserted by the main script.
- **Graph:** text/3D transitions, selected education details, explicit overview reset, empty-query item-count prompt, retained entered query, malformed/unknown/valid hash recovery, full list identity, legend/help and manual motion reduction remain usable. Canonical settled geometry and restrained labels were inspected at1280,320,390,430 and844landscape. [320 overview](evidence/e6-graph-settled-canvas-320.png), [390 overview](evidence/e6-graph-settled-canvas-390.png), [430 overview](evidence/e6-graph-settled-canvas-430.png), [landscape](evidence/e6-graph-settled-page-844.png), [selected education430](evidence/e6-graph-settled-selected-430.png), [legend](evidence/e6-graph-legend.png). Full camera cancellation/rapid reset behavior reuses the established E5/B3 tests, not a new independent stress run.
- **Phone navigation/contact:** menu opens and contact anchor lands with form readable; invalid submission focuses the first invalid field. Synthetic pending text precedes fields; fields become readonly; one immutable trimmed snapshot is submitted; a failed network confirmation retains the exact spaced draft and explains uncertainty above it. [Menu](evidence/e6-menu-320.png), [invalid](evidence/e6-contact-invalid-320.png), [pending](evidence/e6-contact-pending-320.png), [uncertainty](evidence/e6-contact-uncertain-320.png), [counter warning](evidence/e6-contact-counter-warning.png). No actual contact traffic escaped interception. Earlier synthetic502 correctly produced server-error copy; the uncertainty capture uses a network abort instead.
- **Arbitrary phone reading limitation:** the fixed48px menu at x264,y8 can briefly cover content passing through that corner: the June2024 date and portfolio heading were measured underneath it at specific arbitrary scroll positions. [Résumé example](evidence/e6-arbitrary-resume-320.png), [portfolio](evidence/e6-arbitrary-portfolio-320.png), [contact](evidence/e6-arbitrary-contact-320.png), and hit-test data in the supplement. This is a minor remaining transient text-obstruction observation at `src/components/Sections/Header.tsx:94`, not persistent loss of access: anchor destinations/first-invalid focus land clear and scrolling reveals the text. At200% the rem-sized control also enlarges. It is recorded for the controller, not silently treated as zero overlap.
- **Stats/404/recovery:** fixture-backed totals, independent source captions, missing/observed/provisional daily rows and disclosure remain readable. Actual320 table fits without horizontal panning: [table](evidence/e6-stats-table-actual320.png). [Stats320 full page](evidence/e6-stats-320.png) includes methodology/retention, privacy-aggregated Other buckets and recovery links. The local unknown route returns404, title `Page not found | Andrew Malvani`, robots `noindex, nofollow`, and both recovery links fit320. [404320](evidence/e6-404-320.png), [hover390](evidence/e6-404-hover.png). Return-to-résumé succeeds. Back-to-top reaches scrollY0 after settling; the initial immediate2598 sample was premature, not a broken target. Canonicals exclude query/hash on home and stats. CloudFront/public-host route behavior is outside this local check.
- **PDF and architecture navigation:** the actual download completes and its bytes match the inspected PDF hash. Anchor `download` is `Andrew-Malvani-Resume.pdf`; this local `serve` response yields suggested filename `resume.pdf`, so do not infer production Content-Disposition from it. The architecture card opens the candidate local1324x922 image in a new tab and the diagram is visible [capture](evidence/e6-architecture-open.png). Existing full navigation tests remain the broader behavior evidence.

## Contrast: computed colors and actual composition

[Summary](evidence/e6-contrast-summary.json) covers61 captured DOM states (including historical duplicate harness states), with zero below4.5 among visible, settled, enabled small-text samples. The collector composites text alpha over computed ancestor CSS backgrounds. Screen-reader-only labels, hidden content, disabled controls and unresolved group-opacity states are excluded; the early sr-only4.1754 samples are not visible text failures. Large heading gradients are not presented as small-text measurements.

This DOM pass alone cannot model sibling overlays or the hero photo, so those were measured separately:

| Surface | Foreground/background evidence | Conservative result |
| --- | --- | --- |
| Ordinary small neutral metadata | Computed `rgb(163,163,163)` on `rgb(23,23,23)` | **7.1072:1** |
| Contact uncertainty | Actual computed/composited feedback sample in `contact-uncertain-320` | **7.0504:1** minimum |
| Hovered credential issuer/year | Same neutral colors; measured sibling spotlight `rgba(251,146,60,.1)`, opacity1. Composite both foreground and background at brightest stop: fg171.8/161.3/152.7, bg45.8/35.3/26.7 | **6.0568:1** |
| Canonical graph information | Actual canvas paints `#d4d4d4` on opaque `#171717`; shader fog absent; vignette strongest measured stop `rgba(13,13,13,.25)` | Nominal **12.0949:1**; composited **7.2066:1** |
| Hero small text/actions | Original computed foreground plus real screenshot of unchanged photo/scrim/card with text temporarily transparent and color transitions settled; sample actual text ranges, not borders | **7.0631:1** minimum across1280/320 |

The graph instrument records15 sprite draws over3frames at each measured width1280/320, minimum projected sprite height18.199999px; with its15% top/bottom padding this represents14px text. No fog define was present. This is real draw/material evidence, not a geometry-in-frame assumption. `src/components/Graph/ResumeGraphCanvas.tsx:303–309` corroborates opaque label background, fog/tone-mapping disabled and depth-independent labels. The prior numeric error of using antialiased edge pixels as nominal glyph contrast is explicitly avoided here.

Hero evidence: [foreground/background measurements](evidence/e6-hero-background.json), [actual composition result](evidence/e6-hero-contrast.json), [textless320 backdrop](evidence/e6-hero-textless-background-320.png), script `e6-hero-background.mjs` plus `e6-hero-contrast.py`, and [output](evidence/e6-hero-contrast.log). The first backdrop probe captured button color transitions too early; it was corrected by waiting500ms and using DOM text-range rectangles. Those premature glyph/border samples are not accepted contrast results. The final foreground comes from computed CSS, the background from actual rendered layers with glyphs absent; no antialiased screenshot text pixels are used.

## PDF inspection and professional-fact boundary

Inspected `out/assets/resume.pdf`, byte-identical to `public/assets/resume.pdf`. SHA256 **246239dc0c28c26121734ad9780ecb1caad83e1f6564c549b51b89db4a024fa5**. pypdf reports **one612x792point page** and exactly these two URI annotations:

- `mailto:andrewrmalvani@gmail.com`
- `https://www.linkedin.com/in/andrewmalvani`

[PDF data/extracted text](evidence/e6-pdf-acceptance.json) and [1600px rendered page](evidence/e6-resume-page.png). The full page was visually inspected: no clipping, overlapping text, missing visible bullets or extra page; all sections fit with bottom margin. URI identities were checked, not only their count.

Used bundled Python pypdf for metadata/text/annotations and Poppler for visual rendering:

```sh
FONTCONFIG_FILE="$PWD/.superpowers/sdd/2026-09-07-design-ux-remediation/e6-fonts.conf" pdftoppm -scale-to 1600 -png -singlefile out/assets/resume.pdf .superpowers/sdd/2026-09-07-design-ux-remediation/evidence/e6-resume-page
```

The final render completed successfully; [render log](evidence/e6-pdf-render.log) is empty stdout/stderr. Initial default Fontconfig cache warnings were an environment problem, resolved with an ignored local font configuration/cache, not a PDF defect. No PDF generation or fact editing occurred.

Compared the PDF against `docs/content/professional-facts.md` and prior A3/C1 contexts. It retains the LeadAI/ML Engineer June2024–present and SystemsAdministrator February2023–June2024 roles; PDF SanDiego context; GeorgiaTech in-progress/expected2028; distinct $15M annual chatbot spend avoidance and $50M agent-platform ROI; PDF90% deployment improvement distinct from90% manual-processing reduction; and the recorded credential names without invented issue years or current verification claims.

Owner confirmation remains needed for the recorded residence discrepancy (website Arizona versus PDF SanDiego), website days-to-minutes versus PDF90% deployment wording, $50M scope, credential status/year/title consistency, subjective skill tiers and pending project narratives. Existing source-supported facts were checked for preservation, not independently certified as true.

## Evidence interpretation and remaining gates

The first main3D captures used750ms after canvas visibility and were blank/premature. Use **`e6-graph-settled-*`**, captured after the established10.5second engine settling and explicit overview, for visual acceptance. The initial instrumentation extraction did not invoke its IIFE, so `e6-graph-render.json` has empty draw arrays; its settled images remain valid visual captures. Use **`e6-graph-instrumented.json`** for actual draw/paint measurements. The corrected instrumentation rechecked only1280/320, not the full behavior suite.

Other QA corrections: canonical slash and lowercase menu-label expectations were adjusted to the actual required contract; native Legend is a summary, not a button; HTTP502 is server-error feedback, not uncertain network delivery; table filenames ending `expanded-320` in the first supplement actually have390px metadata, so the final **`e6-stats-table-actual320.png`** is the320 evidence. Native details were already open in some main captures, so clicking toggled them closed; full-page stats captures and the explicitly-open supplement show the table. Each correction is a harness/timing boundary, not an unreported product change.

OS screen-reader speech, native browser zoom, physical phone rotation, OS-level motion-preference changes, actual browser backgrounding, deployed public/cache behavior, real contact sending and live stats production were unavailable or outside authorization. Browser semantic assertions, viewport/root-font/media emulation and local fixtures cannot close those live/manual gates. The evidence preserves exact local limits. The controller must resolve the enlarged-text issue, decide whether the transient menu overlap needs further work, obtain remaining owner facts as appropriate, and complete later E6/final-review/release gates before assigning final finding statuses.

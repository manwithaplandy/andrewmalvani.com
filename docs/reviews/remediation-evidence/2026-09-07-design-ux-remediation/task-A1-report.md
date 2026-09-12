# Task A1 implementation report

## Status

DONE

## What I implemented

- Added pinned development-only browser dependencies: `@playwright/test@1.63.0` and `serve@14.2.6`, plus their Yarn Classic lockfile entries. The installed package engines are Node `>=20` and Node `>=14`, respectively, so both support Node 22.
- Split the existing mutating lint command into nonmutating `lint`, Prettier-writing `format`, and ESLint-writing `lint:fix` scripts. Added `typecheck`, `typecheck:tests`, `preview`, and `test:e2e`; changed `compile` to the required nonincremental no-emit TypeScript check and removed Yarn-Berry-only syntax.
- Added Playwright configuration for a single Chromium worker, `http://127.0.0.1:3100`, an existing-build-only `serve out` web server, and trace/screenshot retention only on failure.
- Added a separate test TypeScript config without expanding application TypeScript scope.
- Added a shared fixture that continues requests to the exact preview origin, aborts other HTTP(S) requests, and continues non-HTTP(S) resources.
- Added observable homepage regressions at 320, 390, and 430 CSS pixels and at 200% text size.
- Constrained the hero to available width, stacked actions below `sm`, reduced phone card/button padding, and added vertical room so natural hero growth keeps content clear of the down control. Desktop actions remain inline with their prior proportions.
- Left-aligned mobile timeline headings, metadata, copy, and bullets while preserving the existing role/date hierarchy.
- Raised certification date text from neutral-500 to neutral-400.
- Added minimal wrapping/min-width behavior to skill rows after the 200% text regression identified them as the remaining 3px overflow source. This file was an A1 scope addition approved by the controller because Step 9 requires no horizontal panning when enlarged and explicitly includes Skills; all labels and tiers are unchanged.

## Execution baseline

The worktree was clean before changes.

- `git status --short` -> no output
- `node --version` -> `v26.7.0`
- `yarn --version` -> `1.22.22`
- `yarn tsc --noEmit --incremental false` -> exit 0
- `yarn eslint './src/**/*.{js,jsx,ts,tsx}' --max-warnings=0` -> exit 0

Final build and verification used `/Users/andrew/.nvm/versions/node/v22.16.0/bin/node`, yielding `v22.16.0`, to match the requested runtime.

## TDD evidence

### RED: phone reflow

Command:

```text
yarn test:e2e tests/e2e/homepage.spec.ts --project=chromium
```

Relevant output before responsive production changes:

```text
Running 3 tests using 1 worker
homepage fits 320px: Expected <= 1, Received 72
homepage fits 390px: Expected <= 1, Received 37
homepage fits 430px: Expected <= 1, Received 17
3 failed
```

This was the expected failure: the static-export page rendered and the heading was visible, but `document.documentElement.scrollWidth - innerWidth` measured the existing horizontal overflow at every required phone width.

### RED: enlarged text

Command:

```text
PATH="/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH" yarn test:e2e tests/e2e/homepage.spec.ts --project=chromium --grep '200% text'
```

Relevant output before the Skills wrap fix:

```text
homepage fits with 200% text: Expected <= 1, Received 3
1 failed
```

Diagnostic instrumentation identified the overflowing rendered nodes as the skill tier/segment group, ending at x=1282.828 in a 1280 CSS-pixel viewport. The production change that makes this test fail is removing the skill row's wrap/min-width behavior.

### GREEN

Final full browser command under Node 22:

```text
env -u NO_COLOR PATH="/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH" yarn test:e2e
```

Output:

```text
Running 4 tests using 1 worker
homepage fits 320px ... passed
homepage fits 390px ... passed
homepage fits 430px ... passed
homepage fits with 200% text ... passed
4 passed (3.1s)
Done in 3.74s.
```

## Build and browser verification

- `PATH="/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH" yarn build` completed the Next.js static export and sitemap generation successfully with no build warning after the final production change.
- `GET /graph` and `GET /stats` through `serve out` both returned HTTP 200, confirming extensionless HTML routing before application checks.
- Live browser inspection covered 320x720, 390x844, 430x932, and 1280x900. All reported zero horizontal overflow. At 390 and 430 the card and down control did not overlap; at 320 the naturally taller 774px hero placed the card bottom at 694px and the down control at 712.84px, with the control available by vertical scroll.
- Every hero link stayed inside the viewport. At 320 the action boxes ran from x=41 to x=279; at 390 from x=41 to x=349; at 430 from x=41 to x=389.
- The desktop hero remained centered with the three actions inline, zero horizontal overflow, and no card/down-control overlap.
- The mobile current-role title and paragraph shared x=16, while bullets used the intentional list indent at x=36. The captured skills and certification views stayed within the 320px viewport, with no clipped labels or tier markers.
- A 200% root text-size browser check passed the permanent no-horizontal-panning regression after the approved skill-row fix. A separate 320-CSS-pixel effective zoom viewport also reported zero overflow.
- The live browser showed meaningful content, no framework error overlay, and no browser error/warning log entries.
- Rendered certification metadata computed to `rgb(163, 163, 163)` on `rgb(23, 23, 23)`: 7.11:1 contrast. Against the strongest 10% orange hover composite (`rgb(46, 35, 27)`), the ratio remains 6.07:1.

## Final verification

- `yarn typecheck` under Node 22 -> exit 0
- `yarn typecheck:tests` under Node 22 -> exit 0
- `yarn lint` under Node 22 -> exit 0, zero warnings/errors
- Scoped `yarn prettier --check ...` -> all matched files use Prettier style
- `git diff --check` -> exit 0
- `yarn test:e2e` under Node 22 -> 4/4 passing with clean test output

## Files changed

- `.gitignore`
- `package.json`
- `yarn.lock`
- `playwright.config.ts`
- `tsconfig.tests.json`
- `tests/e2e/fixtures.ts`
- `tests/e2e/homepage.spec.ts`
- `src/components/Sections/Hero.tsx`
- `src/components/Sections/Resume/TimelineItem.tsx`
- `src/components/Sections/Resume/CertificationItem.tsx`
- `src/components/Sections/Resume/Skills.tsx` (controller-approved acceptance-driven scope addition)

## Self-review

- Re-read the task brief and checked each of its ten steps against the final diff and evidence above.
- Confirmed no content facts, section IDs, contact behavior, graph access, framework major versions, or production dependencies changed.
- Confirmed the browser server only serves the prebuilt `out/` directory and does not hide missing builds behind an implicit build step.
- Confirmed fixture routing uses exact origin equality and leaves non-HTTP(S) URLs alone, preserving the page-level route override path required by future contact tests.
- Confirmed the responsive changes do not use overflow hiding and preserve the desktop layout.
- Reviewed all changed and newly added files; no unrelated changes remain.

## Issues or concerns

None. The only scope addition, `Skills.tsx`, was explicitly approved by the controller after the required enlarged-text check exposed its 3px overflow.

## Visual evidence inventory for E6

Saved temporary PNG artifacts verified present at report-update time:

- `/tmp/a1-text-200.png` — 1280x900 homepage hero with the root text size set to 200% after the enlarged-text reflow fix.
- `/tmp/a1-zoomed-320.png` — full-page homepage capture at a 320-CSS-pixel effective viewport.

These `/tmp` paths are temporary runtime artifacts and are not committed repository files.

The following live browser captures were emitted inline in the browser tool results only; the tool did not return filesystem paths, so no file path is claimed for them:

- 320x720 mobile hero, including all three stacked actions and the naturally extended hero.
- 390x844 mobile hero.
- 430x932 mobile hero.
- 1280x900 desktop hero with inline actions.
- 1280x900 current-role timeline view.
- 320x720 current-role timeline view showing the stable left edge for title, copy, and bullets.
- 320x720 education/skills boundary and Coding Languages skill-card views.
- 320x720 Cloud Services and Certifications view.
- 320x720 final Azure certification and Portfolio boundary view.

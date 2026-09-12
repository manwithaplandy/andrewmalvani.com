# B2 implementation report

Status: DONE

Worktree: `/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation`
Base: `3827362` (`fix: honor live reduced-motion preferences`)
Commit: `88293f2` — `fix: keep graph controls and details usable on small screens`

## Implemented

- Moved the graph introduction from a screen overlay into normal page flow and made the graph page/explorer a flexible, scrollable column. The exit and PDF links now reserve space above the experience instead of covering it.
- Added a named `Career graph controls` toolbar. `How to explore` and `Legend` are native `details`/`summary` disclosures whose open content participates in layout. The help disclosure retains a dedicated `Dismiss hint` control and denied-storage recovery.
- Reworked 3D layout inside the existing components: phones stack a minimum-320-pixel canvas and detail card; screens at `md` and wider place the live canvas and selected details in neighboring grid columns. The breadcrumb wraps in normal flow, including at 200% text.
- Changed `FocusPanel` from an absolute bottom sheet to the `Selected career item` region. Titles and actions wrap, expanded copy stays in flow, and the opaque information surface prevents graph objects from changing its text background.
- Consumed A5's `src/hooks/useReducedMotion.ts`; effective reduction remains the OS/browser preference OR the manual graph toggle. Reduced motion supplies no panel translation/transition classes while keeping the state change immediate.
- Preserved the existing reducer, graph data/facts, node IDs, hashes, text-view inline details, PDF/resume exits, dynamic canvas boundary, and `ResumeGraphCanvas` resize observer. No second details panel is rendered in text mode.
- Restricted slow-performance focus recovery to focus inside the disappearing 3D experience. An outside page control keeps focus; focus inside the canvas still recovers to `3D view` before fallback.
- Made touch swipes horizontal-dominant before scanning connections and enabled vertical pan on the detail surface, so an ordinary vertical scroll cannot change the highlighted connection.
- Raised GraphListFallback category/connection-kind text and FocusPanel wrapped-state text from neutral-500 to neutral-400. The graph introduction is also neutral-400 on an opaque neutral-900 surface.

## TDD evidence

All Yarn commands used Node 22 and the clean runner environment:

```sh
env -u NO_COLOR PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:/usr/bin:/bin:/usr/sbin:/sbin \
  PREFIX=/private/tmp/react-resume-prefix YARN_CACHE_FOLDER=/private/tmp/react-resume-yarn-cache ...
```

### RED

```sh
yarn build
yarn test:e2e tests/e2e/graph-layout.spec.ts --project=chromium
```

- Baseline build: exit 0, `Done in 9.16s`.
- New browser suite before production changes: **7 failed / 7**. All four required viewport cases initialized a real WebGL canvas, saved their before screenshots, then failed because the named toolbar/native disclosures did not exist. The canvas-resize and 200% cases failed on the same missing layout contract. The slow-FPS case independently failed because the unconditional fallback moved focus off `Classic resume`.
- Before evidence: `evidence/b2-before-{320x720,390x844,844x390,1280x900}.png`. It shows the old overlapping hint/legend/card and truncated selected heading.
- First implementation run: **6 passed / 1 failed**. The 200% case found one concrete remaining overflow: the Georgia Tech breadcrumb button extended beyond 320 CSS pixels. A diagnostic enumerated that breadcrumb as the only overflowing element; allowing complete breadcrumb wrapping made the case pass.

### GREEN

```sh
yarn build
yarn test:e2e tests/e2e/graph-access.spec.ts tests/e2e/graph-layout.spec.ts --project=chromium
yarn test:e2e tests/e2e/graph-layout.spec.ts --project=chromium
```

- Final production/static export build after the last production change: exit 0, `Done in 12.37s`.
- Relevant combined suite: **33 passed (53.7s)**. This includes all 22 B1 graph accessibility/history/storage/WebGL checks and the then-current 11 B2 cases.
- Final expanded B2 suite: **12 passed (33.8s)**, adding the complete long responsibility/achievement heading and durable phone-canvas/contrast evidence. A later screenshot-only 320 run also passed (1/1); no application source changed after the combined/final suite.
- After a formatting-only FocusPanel diff cleanup, the rebuilt final source passed the system/manual motion and vertical-scroll smoke cases: **3 passed (6.5s)**.
- Real WebGL was mandatory in the viewport, achievement, resizing, and focus-containment cases; no fallback-only result was counted as 3D evidence.

## Contrast evidence

`evidence/b2-rendered-contrast.json` records computed text colors against backgrounds composed from the actual rendered ancestor layers. Every small informational sample exceeded 4.5:1:

- Introduction: `rgb(163, 163, 163)` on `rgb(23, 23, 23)`, **7.11:1**.
- Help and legend: `rgb(212, 212, 212)` on `rgb(23, 23, 23)`, **12.09:1**.
- Text-view guidance, category headings, and connection-kind labels: `rgb(163, 163, 163)` on `rgb(10, 10, 10)`, **7.85:1**.
- Selected metadata and wrapped state: `rgb(163, 163, 163)` on `rgb(23, 23, 23)`, **7.11:1**.

The intro looked visually subdued in the screenshot but its measured ratio clears the required threshold, so no further brightening was added.

## Final checks

```sh
yarn lint
yarn typecheck
yarn typecheck:tests
yarn prettier --check src/pages/graph.tsx src/components/Graph/GraphExplorer.tsx \
  src/components/Graph/FocusPanel.tsx src/components/Graph/GraphListFallback.tsx \
  tests/e2e/graph-access.spec.ts tests/e2e/graph-layout.spec.ts
git diff --check
```

- ESLint: exit 0, no warnings/errors.
- Source and test TypeScript checks: exit 0.
- Prettier and whitespace checks: exit 0.
- Output was clean under the requested environment; no Yarn cache/global/color warning appeared.

## Browser and visual verification

- Automated each required `320×720`, `390×844`, `844×390`, and `1280×900` workflow through real 3D → disclosures → text selection → 3D → expanded details. Complete Georgia Tech and long responsibility headings fit without horizontal text overflow.
- Verified the real canvas exactly tracks its application container, shrinks when open disclosures consume desktop height, and remeasures after rotation to `844×390`; landscape remains at least 320 pixels tall and over 400 pixels wide.
- Verified page-wide horizontal containment with a 32-pixel root font at 320 CSS pixels (200% text equivalent), plus uncovered trial clicks for resume, PDF, and mode controls.
- Verified system-emulated and manual reduced motion both yield `transform: none` and `transition-duration: 0s` on the mounted selected region.
- Inspected settled full-page after images at all four viewports. `evidence/b2-after-320x720-canvas.png` and `b2-after-390x844-canvas.png` scroll the actual canvas into the live viewport and show rendered WebGL nodes; the capture waits through the camera/panel settling interval and disables CSS animations.
- Native hardware rotation, operating-system setting UI, and browser chrome zoom were unavailable. Playwright viewport resizing, live `prefers-reduced-motion` emulation, and 200% root-text enlargement cover their relevant browser contracts without claiming physical-device validation.

## Files changed

- `src/pages/graph.tsx`
- `src/components/Graph/GraphExplorer.tsx`
- `src/components/Graph/FocusPanel.tsx`
- `src/components/Graph/GraphListFallback.tsx`
- `tests/e2e/graph-access.spec.ts`
- `tests/e2e/graph-layout.spec.ts` (new)

## Self-review and concerns

Read the complete diff against `3827362` and rechecked every B2 interface. The canvas implementation itself is unchanged and still sizes from its observed container; page layout alone defines the available area. Text mode keeps one inline details source, the 3D region mounts only in 3D, and B1 history/fallback behavior remains covered by the passing combined suite.

The narrow canvas can still draw Three.js sprite labels across its visual edge. The separate DOM heading remains complete and readable, and the controller recorded sprite-label/camera treatment in B3's existing scope. No B2 correctness blocker remains.

No push, deploy, cloud/settings change, external message, or subagent was used.

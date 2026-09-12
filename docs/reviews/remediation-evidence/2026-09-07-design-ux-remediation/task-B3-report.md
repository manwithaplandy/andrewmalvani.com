# B3 implementation report

Worktree: `/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation`
Branch: `codex/design-ux-remediation`; base: `88293f2`.
Commit: `f2b2025` — `feat: add direct discovery and overview recovery to career graph`.
Status: DONE. Committed source worktree is clean; report/evidence follow the existing local SDD artifact convention.

## Implementation

- Added `GraphSearch({onSelect})` over the unchanged `resumeGraph.nodes`: named search landmark, labeled ordinary text input, NFKC/case/whitespace normalization over labels and descriptions, at most ten ordinary result buttons for nonempty queries, full match count and explicit no-results state. Empty/whitespace-only queries show the complete available-item count and a prompt, with no default result buttons. Query and surviving input/result focus remain stable across selection and mode changes. Existing selection status announces results.
- Added exact reducer `reset` → `initialGraphNavState(null)` and `Show overview`; every action increments the explicit canvas `overviewRequest`, including repeated requests while already deselected.
- Unified camera work into a cancellable effect: waits for layout and measured stage dimensions, includes node radii and restrained overview labels in aspect-aware bounds, restores a canonical front overview and uses zero transition duration for effective system/manual reduced motion. Clears pending layout timeout and cancels library camera tweens when dependencies change/unmount.
- Real camera tests exposed Trackball's retained roll and inertia. Overview now consumes inertia through a public controls update with temporary damping=1, restores damping and resets camera up before fitting. No private controls fields or production test hooks.
- Restrained overview labels to roles and skill groups; linked/dimmed nodes no longer compete with selected/highlighted/hovered identities. Full labels wrap into shorter sprite lines; destination framing accommodates the complete selected sprite on narrow stages. Nodes, edges, descriptions and IDs remain unchanged.
- Retained the dynamic canvas import, B1 mode/deep-link/focus behavior, B2 normal-flow layout and A5's effective motion hook.

## TDD and verification

All Yarn commands below used the exact clean prefix:

```sh
env -u NO_COLOR PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH PREFIX=/private/tmp/react-resume-prefix YARN_CACHE_FOLDER=/private/tmp/react-resume-yarn-cache
```

Playwright needed the established local-server/Chromium sandbox escalation (sandbox `listen` denied); no remote service or live message was used.

- RED before production implementation: `yarn build` passed (9.55s), then `yarn test:e2e tests/e2e/graph-discovery.spec.ts --project=chromium` failed **3/3**: both direct journeys timed out waiting for the missing named search input; overview journey timed out on missing `Show overview`. Logs: `/private/tmp/b3-red-build.log`, `/private/tmp/b3-red-tests.log`.
- First implementation build caught import-order lint errors; autofix resolved them. Initial GREEN iteration passed the text journey. Corrected a fixture expectation from 12 to the unchanged Python node's actual 11 connections.
- Camera instrumentation setup: the shaders optimize out `viewMatrix`. An unrestricted `modelViewMatrix` observes different objects and is also unsuitable. The final observer filters the stationary Points starfield shader (`gl_PointSize`), whose identity transform exposes the actual camera independently of graph layout. It uses a real WebGL2 context, not a mock or counter. These observer corrections are test setup, not product RED.
- Additional product RED with that corrected observer: canonical overview differed by **13.309** in its rendered matrix after orbit/zoom. Source investigation identified retained trackball roll/inertia. After the fix, system desktop and manual phone variants passed **2/2 (34.3s)**, requiring the maximum camera-matrix component difference below **0.05**. Each waits 10.5s for force layout to settle before comparison and verifies orbit/zoom changes the observed camera.
- Narrow lifecycle/phone checks: `yarn test:e2e tests/e2e/graph-discovery.spec.ts --project=chromium --grep 'animated|phone visitor'` passed **2/2 (25.8s)**. The animated case supersedes two live 700ms flights, recovers overview, and verifies it remains stable beyond obsolete animation durations. The phone journey finds Python, follows its self-service RAG achievement in text view, returns to 3D, selects complete Georgia Tech education and recovers overview.
- Final application build: `yarn build` passed (11.40s), including application typecheck, Next lint/build and static export (`/private/tmp/b3-final-build.log`). No later application changes.
- `yarn typecheck:tests` passed (1.11s); `yarn lint` passed (1.54s, zero warnings). `git diff --check` passed.
- Initial combined verification: `yarn test:e2e tests/e2e/graph-discovery.spec.ts tests/e2e/graph-access.spec.ts tests/e2e/graph-layout.spec.ts tests/e2e/motion.spec.ts --project=chromium` reported **42 passed / 3 failed (2.0m)**. All 12 B2 cases passed. Findings and controller-approved fixes:
  - Ten initial default search result buttons exceeded B1's 20-stop journey. Controller chose an empty-query count/prompt for initial readability/keyboard economy; result buttons require an entered query. B1 test remains unchanged.
  - Animated camera baseline sampled 350ms into a 700ms transition plus 150ms layout readiness delay. Observer now waits 1000ms before sampling, retaining the strict 0.05 threshold; observed pre-fix discrepancy was 0.058. This was test timing, not additional camera drift.
  - Existing A5 `motion.spec.ts:83` assumed URL arrival meant React had unmounted its old canvas. The immediate isConnected assertion observed true. Controller authorized replacing that immediate check with `await expect.poll(...).toBe(false)` before the unchanged no-more-draw assertions; no motion application source changed. An unchanged diagnostic rerun passed 2/2, demonstrating the race but not resolving it; the synchronization repair is retained.
- Focused repair checks: `yarn test:e2e tests/e2e/graph-access.spec.ts tests/e2e/graph-discovery.spec.ts tests/e2e/motion.spec.ts --project=chromium --grep '3D tab order|animated overview|particles clear'` passed **4/4 (27.5s)**, covering all three combined-run failures after their repairs (`/private/tmp/b3-repair-focused.log`).
- Final combined verification: `yarn test:e2e tests/e2e/graph-discovery.spec.ts tests/e2e/graph-access.spec.ts tests/e2e/graph-layout.spec.ts tests/e2e/motion.spec.ts --project=chromium` passed **45/45 (2.0m; Yarn total 123.44s)** with clean output: 22 access, 7 discovery, 12 layout, 4 motion. Log: `/private/tmp/b3-final-combined.log`. No source changes followed; no unchanged passed suite was rerun for freshness.

The final discovery suite also verifies normalized description-only search, exact full-graph count against visible entry inventory, all existing node hashes selecting their original entry/details, retained queries/focus, native input arrows, complete education title, no-results recovery, reset history/selection/expansion and both rendering modes.

## Evidence and self-review

- Inspected the settled 390px selected-education capture: the complete Georgia Tech sprite wraps into two readable lines within the canvas. The separate full selected title/details and all page controls retain their B2 layout.
- Inspected desktop overview: the complete geometry is framed with a restrained set of role/group labels. This is a whole-graph orientation view; identities remain directly discoverable via search and full detail via selection/text.
- Final saved evidence under `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/`: `b3-desktop-overview.png`, `b3-phone-overview.png`, `b3-phone-selected-education.png`. Saved from settled successful journeys; no extra screenshot cycles after visual acceptance.
- Self-review checked contract signatures, unchanged data/deep links, dynamic-import boundary, pending timer/tween cleanup, manual/system reduced motion and actual camera recovery. No unrelated application files or dependencies changed. Retained the original 300ms position-preserving highlighted-connection nudge within the shared camera effect.
- Existing canvas module remains large; changes stay within its existing visual/camera responsibilities. Full sprite labels can still move beyond a stage edge during arbitrary user orbit/zoom; this is not a promise that every sprite always fits. Full DOM detail remains available.
- No push, deployment, cloud configuration change, external message or subagent work occurred.

Changed application/test files: `GraphSearch.tsx`, `GraphExplorer.tsx`, `graphReducer.ts`, `ResumeGraphCanvas.tsx`, `tests/e2e/graph-discovery.spec.ts`, plus the controller-authorized one-line unmount synchronization in `tests/e2e/motion.spec.ts`.

## Fix round 1 — Canonical overview label readability

Base: `f2b2025`. The controller explicitly reassigned this existing worker from its completed read-only review to implementation after the original implementer and replacement worker hit the agent-thread limit. This is implementation/self-review evidence; a different worker supplies the independent re-review.

### Correction to the original review claim

The review's screenshot measurements of 2.99:1 desktop / 2.03:1 phone were brightest-pixel measurements of tiny antialiased glyphs, **not valid measurements of nominal text contrast**. I withdraw the numerical F17 failure claim based solely on those samples. The visible readability defect remained real. The fix evidence below instead observes actual sprite projection and shader fog state, captures Canvas2D foreground/background paint colors, and reads the computed DOM vignette before calculating nominal composited contrast.

### Implementation and rationale

- Retained the existing SpriteText labels; no labeling framework, graph data, nodes, edges, search/reset contract, or camera cancellation/inertia logic changed.
- Overview now labels the four skill groups and the most recent role (`initialFocusId`). This restrained subset provides group and career orientation while avoiding a tightly packed row of four role labels on the phone. Every other full identity remains available through hover, selection, search, and text view.
- Canonical framing first reserves screen margins for those labels while fitting all node geometry, then scales the label sprites at each node's actual camera depth to a **14px text em height**. With the opaque backing's padding the actual rendered sprite height is **18.2px**. Base sizes remain available for selected/highlighted full-label framing. Hovering an overview anchor preserves its overview size.
- Informational sprite materials are unlit, fog-exempt, non-tone-mapped, opacity 1 (unchanged SpriteMaterial default), and drawn above geometry. Each label has an opaque `#171717` backing. Atmospheric fog on graph geometry and the stars remain.
- The separate DOM vignette also composites over labels, so its maximum edge opacity changed from 0.55 to 0.25. For overview `#d4d4d4` text on `#171717`, nominal contrast is 12.0949:1 before the overlay. The worst overlay endpoint composites those to RGB(162.25,162.25,162.25) and RGB(20.5,20.5,20.5), giving **7.2066:1**. Selected orange `#fb923c` composites to RGB(191.5,112.75,48.25), giving **4.9107:1** against the same backing. Candidate/hover colors are lighter. These are nominal/composited color calculations, not assertions about every antialiased edge pixel.

### Focused failure and verification evidence

All Yarn commands used the clean prefix already documented above: `env -u NO_COLOR PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH PREFIX=/private/tmp/react-resume-prefix YARN_CACHE_FOLDER=/private/tmp/react-resume-yarn-cache`. Browser commands used the established localhost/Chromium sandbox escalation after the initial sandbox run received `listen EPERM`; no remote service or live message was used.

- Added focused browser cases to `graph-discovery.spec.ts`. The observer forwards every real WebGL call and uses actual sprite model/model-view/projection matrices; it does not mock the renderer. It also checks that the actual sprite shader does not enable fog. Separate Canvas2D paint interception and the computed DOM gradient provide composited contrast evidence.
- RED against base export: `yarn test:e2e tests/e2e/graph-discovery.spec.ts --project=chromium --grep 'informational labels'` failed **2/2**, showing minimum projected sprite heights **3.4773px desktop / 2.5893px phone**, below the 12px regression floor. Log: `/private/tmp/b3-fix1-red.log`.
- First corrected label rendering passed **2/2 (28.26s)** before the vignette correction; this isolated the size/fog correction. Log: `/private/tmp/b3-fix1-green-labels.log`.
- Compositor RED against that intermediate export with the old 55% vignette: the single desktop readability case failed with nominal composited gray contrast **3.30293:1**, below 4.5. Log: `/private/tmp/b3-fix1-red-compositor.log`. The initial paint observer required a setup correction because SpriteText passes fractional rectangle sizes while canvas dimensions truncate to integers; the corrected observer records full-coverage rectangles with `>=` dimensions. This instrumentation correction was not a product failure.
- Covering run after the size/fog/vignette correction: `yarn test:e2e tests/e2e/graph-discovery.spec.ts --project=chromium --grep 'overview clears|phone visitor|informational labels'` passed **6/6 (86.32s)**: system/manual/animated camera recovery, rapid animated selection/overview stability, phone cross-view evidence and full education selection, and desktop/phone readability. Log: `/private/tmp/b3-fix1-final-tests.log`.
- Self-check found that a hovered overview anchor reverted to its base world size. The focused desktop test against that export confirmed a real raycast via the hover preview, then failed with projected sprite height **4.4418px**. Log: `/private/tmp/b3-fix1-red-hover.log`. The first pointer probe targeted the moving label and did not obtain a sustained preview; targeting the node beneath its observed projected label produced the substantive failure. Preserving overview scale for hover fixes this transition without changing camera mathematics.
- Final application build after that hover correction: `yarn build` passed **14.09s**, including application typecheck, Next lint/build, and static export. Log: `/private/tmp/b3-fix1-final-build.log`.
- Final changed-behavior run: `yarn test:e2e tests/e2e/graph-discovery.spec.ts --project=chromium --grep 'phone visitor|informational labels'` passed **3/3 (35.45s)**, including sustained real anchor hover on both viewports and full phone education selection. Log: `/private/tmp/b3-fix1-final-hover-tests.log`. The unchanged camera mathematics/recovery cases were not repeated after the hover-only correction.
- `yarn typecheck:tests` passed **2.15s** (`/private/tmp/b3-fix1-types.log`); `yarn lint` passed **1.57s**, zero warnings (`/private/tmp/b3-fix1-lint.log`); `git diff --check` passed. All final verification output is clean. An early compile caught the new visual fields accidentally added to the CanvasNode interface instead of NodeVisual; they were moved to the proper visual interface before browser GREEN.

### Permanent evidence and self-check

Saved outside Playwright's auto-cleaned directory, under this workspace's `evidence/`:

- `b3-fix1-desktop-overview.png`
- `b3-fix1-phone-overview.png`
- `b3-fix1-phone-selected-education.png`
- `b3-fix1-desktop-label-rendering.json`
- `b3-fix1-phone-label-rendering.json`

I inspected all three final captures: five distinct readable overview anchors, full geometry framed on desktop and phone, retained dark/orange atmosphere, and the complete selected Georgia Tech sprite in two lines with normal page flow intact. Both JSON records show actual projected sprite heights approximately **18.2px**, fog disabled, and computed worst-endpoint overview contrast **7.20660226514781:1**. The JSON's paint count includes the graph's sprite texture paints; shader draws separately observe the visible labels.

Changed files: `src/components/Graph/ResumeGraphCanvas.tsx`, `tests/e2e/graph-discovery.spec.ts`. The existing large canvas module gains focused label/framing code within its existing responsibility. Self-check found and repaired the hover transition above. Full labels can still move outside the stage during arbitrary orbit/zoom, as previously documented; this fix's projected size/framing promise is for canonical overview. No unrelated 45-case suite, subagent, deployment, push, cloud change, or external message was performed.

Fix-round commit: `ca65c29` — `fix: keep career overview labels readable`. Source worktree is clean after commit. The report and permanent evidence remain in the established local SDD artifact convention.

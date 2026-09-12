# B1 implementation report

Status: DONE

Worktree: `/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation`
Base: `042bba1` (A1 complete and reviewed).
Commit: `3a9024e` — `fix: expose an accessible career graph text view`.

## Implemented

- Added persistent `Text view` / `3D view` buttons with `aria-pressed`. User choices update only the `view` query parameter and preserve selection hashes and unrelated query parameters.
- Kept one reducer alive across mutually exclusive renderers: the list is absent from the DOM in 3D; the canvas is unmounted in text mode.
- Distinguished chosen text mode, unsupported graphics, and the existing mobile performance fallback. An explicit 3D request never overrides an unsupported/performance fallback.
- Replaced incomplete tree roles with normal headings, lists, and buttons. Selected rows expose expanded/current states, with `aria-controls` linking to their mounted details. No dangling detail IDs are exposed on collapsed rows.
- Preserved node labels, full descriptions, stable connection order, and live announcements. Added the existing focus-card metadata and reused its `Skill` presentation in text details so employer/dates/issuer and skill-depth content remain accessible there too.
- Connection activation moves keyboard focus to the destination row after the source connection unmounts. View switching retains focus on its persistent mode control, including browser Back/Forward transitions and performance fallback.
- Guarded malformed hash decoding and every hint-storage access (getter, read, write, remove); denied storage retains the in-memory choice.
- Preserved valid encoded and unescaped hashes on mount without redundant history entries. Browser history drives both selection and mode without repushing a browser-owned URL. Unknown view parameters use the supported default.

Only changed production files:

- `src/components/Graph/GraphExplorer.tsx`
- `src/components/Graph/GraphListFallback.tsx`

New regression file: `tests/e2e/graph-access.spec.ts` (uses A1's intercepted-request fixture).

## TDD evidence

All Yarn commands used Node 22 via:

```sh
PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH
```

### Initial RED

Commands:

```sh
yarn build
yarn test:e2e tests/e2e/graph-access.spec.ts --project=chromium --timeout=10000
```

- Baseline build exited 0 (`Done in 9.26s`).
- Browser regression result: **13 failed** before implementation.
- Malformed `%` and truncated UTF-8 hashes removed the usable page through uncaught decoding errors.
- Unknown/non-node hashes and valid-link switching failed because `Text view` did not exist.
- Chosen text/3D keyboard regressions found the old clipped parallel list (`Expected: 0, Received: 1`).
- Storage read/getter denial crashed mounting; write/remove denial prevented recovery.
- Forced unsupported graphics lacked row `aria-expanded`; unknown-view case lacked the mode control.
- Real WebGL initialized in baseline Chromium (valid-link and keyboard cases reached application assertions); no 3D assertion was skipped.
- Log: `/tmp/b1-red-tests.log`.

Additional RED checks from self-review:

```sh
yarn test:e2e tests/e2e/graph-access.spec.ts --project=chromium --grep 'browser mode|slow graphics'
yarn test:e2e tests/e2e/graph-access.spec.ts --project=chromium --grep 'unescaped'
yarn test:e2e tests/e2e/graph-access.spec.ts --project=chromium --grep 'preserves selected detail'
```

- Browser mode navigation failed with `3D view` expected focused, received inactive. Added focus recovery before removing the current view.
- Unescaped valid deep-link Back failed: expected homepage, received `/graph?view=list#node=skill:python`. Avoided canonicalization pushes when the decoded URL already selects the current node.
- Two selected-detail tests failed because text mode omitted `Hands-on depth: Expert` and `Tillster, Inc. · October 2021 - February 2023`. Reused the existing skill display and exposed metadata.
- Logs: `/tmp/b1-additional-red.log`, `/tmp/b1-raw-hash-red.log`, `/tmp/b1-detail-red.log`.

### Runner/test diagnosis kept separate

- Initial sandboxed browser run failed to bind `127.0.0.1:3100` (`EPERM`). Ran local preview/Chromium with granted escalation; no dependency/tooling changes.
- Initial keyboard geometry assertions sampled during the site's existing smooth scroll. Added polling for visible focus geometry/ring; both keyboard checks then passed without changing the shared scrolling/motion behavior.
- The mobile FPS test initially used only a narrow viewport. Source inspection showed its existing probe keys off `(pointer: coarse)`; added Playwright touch emulation. Slow RAF callbacks now exercise the real probe and trigger fallback.
- One intermediate run overlapped the last static rebuild and missed a route's updated assets (17 passed / 1 missing-list failure). Waited for the completed export and reran against unchanged assets; final focused and complete suites both pass. No application workaround was added for this runner sequencing issue.

## Final GREEN

```sh
yarn build
yarn test:e2e tests/e2e/graph-access.spec.ts --project=chromium
yarn test:e2e --project=chromium
yarn lint
yarn typecheck
yarn typecheck:tests
yarn prettier --check src/components/Graph/GraphExplorer.tsx src/components/Graph/GraphListFallback.tsx tests/e2e/graph-access.spec.ts
git diff --check
```

Results:

- Final production/static export build: exit 0, `Done in 13.64s`.
- Focused graph suite: **18 passed (34.6s)**; `/tmp/b1-final-focused.log`.
- Complete Chromium suite: **22 passed (38.4s)**, including all four A1 homepage regressions; `/tmp/b1-full-suite.log`.
- Lint: exit 0, no ESLint warnings/errors.
- Source and test typechecks: both exit 0.
- Prettier: all three files use the expected style.
- Whitespace check: exit 0.
- Output contains existing environment warnings about Yarn's unwritable preferred cache/global directory and `NO_COLOR` versus `FORCE_COLOR`. These are runner warnings; application error arrays in malformed-link/storage cases are empty.

Coverage includes malformed/unknown/non-node hashes, encoded and unescaped valid deep links, both explicit views, ignored unknown view, selection and mode Back/Forward, no initial history duplication, visible keyboard entry/connection controls, native connection activation, focus recovery across unmounts, all storage denial modes, real unavailable WebGL, real slow mobile FPS fallback, and selected metadata/depth parity. Resume/PDF links remain visible in chosen, error-recovery, and fallback cases.

## Manual browser verification

Used the existing cached agent-browser CLI with isolated session `b1`, allowed domains restricted to `127.0.0.1`, against the local static preview. No dependencies were installed. Session closed after verification.

- Navigated to chosen text mode with the Python deep link; snapshot shows ordinary grouped headings and all entries, selected Python, and its eleven connection buttons.
- Focused Python and pressed Tab: visually inspected the orange ring around its first visible connection. Pressing Enter selected IT Strategic Analyst and focus moved to that destination entry.
- Switched to 3D: real canvas and IT Strategic Analyst focus card render; list navigation is absent; mode button persists.
- Reopened the final text build and visually inspected Python's complete description, reused Expert depth indicator, and orange focus ring around the first connection.
- `agent-browser errors` was empty. No framework error overlay was present. Classic resume/PDF controls remained present in snapshots.
- Screenshots: `b1-text-final.png` and `b1-3d.png` next to this report. The 3D screenshot captures a scrolled viewport; B2 owns overall graph framing and responsive layout.

## Self-review

Read the final diff and checked the exact B1 interface/behavior requirements. Resolved the additional Back/Forward focus loss, unescaped-hash mount history duplication, selected metadata/depth omissions, and dangling collapsed-row detail references before completion. Dynamic canvas loading, graph IDs/data/edges, reducer actions, and the existing reduced-motion behavior remain intact. No new storage dependency, custom tree keyboard system, graph library, search, or shared motion hook was introduced.

No unresolved B1 correctness concerns. Existing graph framing/small-screen layout and shared motion work remain assigned to later tasks; this task does not claim those findings closed. No push, deployment, external contact, or cloud-setting change occurred. Report and screenshots live in the existing ignored `.superpowers` execution-artifact directory; the scoped commit contains the two components and regression test.

## Fix round 1 — selection-only browser history focus

Fix commit: `d47026c` — `fix: recover graph focus during selection history navigation`.

Base: `3a9024e`. Review identified that the mode-change focus recovery did not cover a Back/Forward selection change while focus was inside connections that unmount. Source inspection confirmed the recovery condition only checked a requested-view change.

Implemented narrowly in `GraphExplorer.tsx`:

- Before applying a browser-owned selection, check whether focus is inside the outgoing selected text details and that the selected ID is changing (including clearing selection).
- Move only that disappearing focus to the persistent mode button. Entry buttons, mode buttons, and other controls that remain mounted retain focus.
- Browser history restores scroll after `popstate`. Reveal the recovered control on the next animation frame, with immediate scrolling, only if it still owns focus. This keeps the recovered control visible and does not redirect a subsequent user focus change.
- No change to graph data, reducer behavior, performance fallback, ordinary view switching, or shared motion settings.

Added four tests in `tests/e2e/graph-access.spec.ts`: connection-focus recovery for selection-only Back and Forward; recovery when history clears selection; preservation of focus on a mounted entry; preservation of focus on a mounted mode button. Recovery checks assert a real visible focus ring and viewport geometry, not only `document.activeElement`.

### RED

```sh
PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH yarn test:e2e tests/e2e/graph-access.spec.ts --project=chromium --grep 'selection-only history'
```

Against the existing B1 export: **2 failed, 2 passed (15.6s)**. Both recovery tests expected focused `Text view` but received inactive after the selected connections disappeared. The two preservation tests passed, establishing behavior the fix must keep. Log: `/tmp/b1-fix1-red.log`.

An intermediate fix recovered the active element but still failed the viewport/ring predicate because Back/Forward subsequently restored the previous scroll position. Inspected its failure screenshot: the viewport remained deep in the list while the focused mode control was above it. Added the guarded next-frame reveal; no test expectation was relaxed.

### GREEN and final verification

All commands used the same Node 22 PATH prefix shown above.

```sh
yarn build
yarn test:e2e tests/e2e/graph-access.spec.ts --project=chromium --grep 'selection-only history'
yarn test:e2e tests/e2e/graph-access.spec.ts --project=chromium
yarn lint
yarn typecheck:tests
yarn prettier --check src/components/Graph/GraphExplorer.tsx tests/e2e/graph-access.spec.ts
git diff --check
```

- Build (including source typecheck and static export): exit 0, `Done in 11.35s`; `/tmp/b1-fix1-build.log`.
- Covering tests: **4 passed (4.4s)**; `/tmp/b1-fix1-green.log`.
- Complete graph-access file: **22 passed (36.5s)**; `/tmp/b1-fix1-graph.log`.
- Lint and test typecheck: exit 0, no ESLint or TypeScript findings.
- Prettier and whitespace checks: pass.
- Existing Yarn/cache and color-environment warnings remain unchanged. No runner tooling changes were made.
- Per controller scope, did not rerun the unchanged homepage/full suite. Playwright managed and stopped its local preview server.

Self-review: read the two-file diff. Recovery is restricted to the outgoing selected details and requires a selection change; preserved controls are covered by passing Back/Forward tests. The delayed operation only reveals an already-focused control and checks focus ownership before acting. Deselection is covered using real UI navigation (3D deselect → text view → choose Python → Back); no synthetic history dispatch or graph mock was used. This resolves the confirmed review gap. Other review minors remain deferred as directed; no subagents, push, or deployment occurred.

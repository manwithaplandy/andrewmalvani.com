# A5 implementation report

Commit: `3827362` — `fix: honor live reduced-motion preferences`.

Status: DONE. Implementation and browser regression checks are complete. Actual OS-setting switching was unavailable (see limitations); no claim of that check is made.

Execution checkout: `/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation`, branch `codex/design-ux-remediation`, base `4cb3ee0`.

## Changes

- Added default-export `useReducedMotion(): boolean` at `src/hooks/useReducedMotion.ts`. Initial false is deterministic on the server and first client render; the effect immediately synchronizes the real media preference after mounting, subscribes once per hook mount to `change`, and removes that same listener on unmount. No browser API runs during server rendering.
- Header mobile overlay/panel transitions use the shared preference. Reduced mode removes transition classes and overrides duration/transform so an already-running slide stops too. Normal behavior returns when the preference returns; dialog/navigation controls remain operable.
- ParticleField restarts its effect on preference changes. Cleanup cancels its pending RAF, clears the full bitmap with an identity transform, disconnects IntersectionObserver, and removes visibility/resize/pointer listeners. Returning to normal motion resumes with a fresh field. `onScreen` now starts false so resuming offscreen waits for the real observer before scheduling a draw. Tab visibility remains an independent gate. Particle-count cap 90, width-based density, DPR cap 1.5, height-resize threshold, and pointer behavior are preserved.
- Reveal responds immediately to reduced mode by exposing content, removing movement/transition classes and transition delay, and cleaning pending observer/timer work. Normal-mode observer/safety-net behavior remains available when preference returns.
- Added `tests/e2e/motion.spec.ts` (4 browser regressions); preserved all existing tests unchanged.

## TDD evidence

All commands ran from the execution checkout. Yarn commands used the exact environment prefix:

```sh
env -u NO_COLOR PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH PREFIX=/private/tmp/react-resume-prefix YARN_CACHE_FOLDER=/private/tmp/react-resume-yarn-cache
```

### RED before production changes

`[environment prefix] yarn build > /private/tmp/react-resume-a5-evidence/red-build.log 2>&1`

Exit 0, `Done in 9.26s.` Includes TypeScript compile, Next static build, sitemap generation.

`[environment prefix] yarn test:e2e tests/e2e/motion.spec.ts --project=chromium > /private/tmp/react-resume-a5-evidence/red-motion.log 2>&1`

The first sandbox execution could not bind local preview port: `listen EPERM: operation not permitted 127.0.0.1:3100`. This environment failure was not counted as RED. The approved escalated rerun exercised the actual browser and returned exit 1:

```text
3 failed
  particles clear on live reduction and resume with one draw per frame
  an initially reduced visit keeps particles clear and menu usable without sliding
  live reduction immediately exposes pending reveals and disables menu movement
1 passed (12.0s)
```

Expected failure evidence: particle pixels remained non-clear after live reduction (`Expected true / Received false`); menu movement/duration samples failed the no-sliding assertion; pending reveal opacity remained 0 after switching to reduced motion (`Expected "1" / Received "0"`, 500ms timeout). Existing visibility-gate test passed. Thus failures were observed missing behavior rather than setup failures.

### GREEN after implementation

`[environment prefix] yarn build > /private/tmp/react-resume-a5-evidence/green-build.log 2>&1`

Exit 0, `Done in 12.29s.` This is the final production source and includes application TypeScript validation. No application source changed after this build.

`[environment prefix] yarn test:e2e tests/e2e/motion.spec.ts --project=chromium > /private/tmp/react-resume-a5-evidence/green-motion.log 2>&1`

Approved local browser execution, exit 0:

```text
4 passed (6.3s)
Done in 6.87s.
```

`[environment prefix] yarn lint`

Exit 0: `eslint './src/**/*.{js,jsx,ts,tsx}' --max-warnings=0`, `Done in 2.02s.` No warnings/errors.

The initial test typecheck identified readonly `document.hidden` deletion in the synthetic test helper, corrected using `Reflect.deleteProperty`; the added retained canvas handle also needed an explicit HTMLCanvasElement cast. These were test typings, not product failures. Final command:

`[environment prefix] yarn typecheck:tests > /private/tmp/react-resume-a5-evidence/typecheck-tests.log 2>&1`

Exit 0:

```text
$ tsc -p tsconfig.tests.json --noEmit --incremental false
Done in 1.10s.
```

After the test helper corrections and expanded assertions for interruption of an active menu transition and route-unmount canvas cleanup, ran the combined suite once on final source:

`[environment prefix] yarn test:e2e --project=chromium > /private/tmp/react-resume-a5-evidence/combined.log 2>&1`

Approved local browser execution, exit 0:

```text
Running 42 tests using 1 worker
[31–34: all four motion regressions passed]
42 passed (51.7s)
Done in 52.21s.
```

Combined suite includes contact validation, graph access, homepage responsive checks, motion, and navigation. No further unchanged full-suite repetitions were run. `git diff --check` returned exit 0 with no output.

## Browser assertions and evidence locations

- Visible hero canvas under no preference produces different real bitmap captures six RAFs apart.
- Three live reduce/restore cycles clear all pixel channels, produce unchanged captures while reduced, and restart visible animation after restoration. Instrumentation forwards native RAF and canvas clearRect calls and verifies maximum one field draw per animation-frame timestamp.
- After client navigation to `/stats`, the retained detached canvas remains unchanged after further preference changes and frames, checking animation cleanup across unmount.
- Initial reduced visit has a clear canvas, stationary menu at x=0 with 0s duration over successive frames, usable Experience/Close controls, and visible unanimated portfolio content; switching back starts particles.
- Live reduced mode exposes a pending offscreen reveal before its existing 1200ms safety timer could account for success, removes movement and delay, and disables mobile menu animation. Restoring normal mode restores 0.3s menu transition; reducing during that transition immediately returns to 0s and x=0, then close works.
- Real scrolling moves the canvas offscreen. Preference changes while offscreen do not restart changing bitmap captures. Scrolling back resumes movement.
- Synthetic Page Visibility `document.hidden`/`visibilitychange` checks cover stop, preference toggles while hidden, and resume after restoring the native property.

Evidence directory: `/private/tmp/react-resume-a5-evidence/`.

- `red-build.log`, `red-motion.log`, `green-build.log`, `green-motion.log`, `typecheck-tests.log`, `combined.log` contain complete captured command output.
- `red-test-results/` retains the failing screenshots, Playwright traces and error contexts before the green suite overwrote the normal ignored results directory.
- Passing bitmap/movement assertions are recorded by the committed test and passing runner output; no manual screenshot or OS recording is claimed.

## Self-review

Reviewed the final diff and the React hook/consumer lifecycle: listeners register only in mount effects, media changes clean the former animation effect before replacement, start guards prevent duplicate RAF loops, offscreen initialization cannot draw early, cleanup clears at identity scale, reduced Reveal classes cannot retain a delay, and menu inline overrides cancel active transition movement. Server rendering accesses no `window` through the hook; static export passed. No architecture/dependency/framework, graph consumer, facts/content, deployment or cloud settings were changed. No messages or contact submissions were sent externally. Controller owns independent review and B2 integration.

## Limitations and follow-up

- Actual macOS Reduce Motion switching was unavailable in the supplied environment: the controller's prior defaults read found no stored key, and no accessible native Settings surface was available. Browser `page.emulateMedia` is the verified preference-switch mechanism. Keep the OS-setting acceptance check explicitly pending for an environment where it can be observed.
- Background visibility was exercised through a synthetic Page Visibility event/property, because headless tabs do not reliably become OS-background tabs; this is handler/behavior evidence, not an actual foreground/background OS switch.
- B2 may now import the shared default hook from `src/hooks/useReducedMotion.ts`; A5 does not change graph behavior.

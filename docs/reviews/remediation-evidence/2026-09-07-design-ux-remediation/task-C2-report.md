# Task C2 implementation report

## Status

DONE_WITH_CONCERNS. Contact submission behavior is implemented and verified. The only remaining evidence limit is OS screen-reader speech, which is unavailable in this environment; browser semantics were verified independently.

Scoped commits:

- `680ec59 fix: make contact requests bounded and draft-safe`
- `326be38 fix: keep contact status available to assistive tech`

## Changes

- Added a synchronous request-ownership guard so repeated submit events cannot start a second in-flight request before React rerenders.
- Captured a new immutable request object with trimmed `name`, `email`, and `message` values after validation. Controlled fields retain the exact browser-visible draft while the request is pending or unsuccessful.
- Configured Axios with a 15,000 ms timeout and a per-attempt `AbortController` signal.
- Added mounted/current-attempt checks before every settled state update. Unmount cleanup aborts local work and invalidates the attempt so late completion is ignored.
- Made all fields `readOnly` during submission. They remain readable and focusable while the submit button is disabled.
- Added the required pending announcement: `Sending your message. Fields are temporarily read-only.`
- Kept clearing limited to confirmed 2xx responses. A non-2xx response, network failure, or timeout preserves the draft and restores editing without automatic retry.
- Added the required uncertainty message for network failure and timeout, with the existing email address as a direct link. The copy explicitly acknowledges that the message may have been sent.
- Raised placeholder text from neutral-500 to neutral-400 after measuring the rendered state. The resulting placeholder is 7.11:1 against its input background.
- Added `tests/e2e/contact-submission.spec.ts`. Every test uses the blocking fixture and intercepts both contact OPTIONS and POST requests; all payloads are synthetic.

## TDD evidence

### RED

1. Built the unmodified production source successfully with Node 22.
2. Ran:
   `yarn test:e2e tests/e2e/contact-submission.spec.ts --project=chromium`
3. The first sandboxed attempt could not bind `127.0.0.1:3100` (`listen EPERM`), so the same command was rerun with the established localhost escalation.
4. Result against base `ca65c29`: 5 failed. Failures showed the intended missing behavior:
   - POST payload retained surrounding whitespace instead of sending a trimmed snapshot.
   - Fields had no `readonly` attribute while the request was pending.
   - Network and timeout paths did not show the required uncertainty copy.
   - No bounded application timeout existed.
5. One unrelated URL assertion expected `/graph` without its intentional selected-node hash; that assertion was corrected before production code was changed.

### GREEN

- Focused C2 command:
  `yarn test:e2e tests/e2e/contact-submission.spec.ts --project=chromium`
- Result: 5/5 passed in 20.3 seconds. The timeout/retry test exercised the real 15-second application timeout and completed in 15.9 seconds.

### Combined regression run

- Command:
  `yarn test:e2e tests/e2e/contact-validation.spec.ts tests/e2e/contact-submission.spec.ts --project=chromium`
- Result: 9/9 passed in 23.5 seconds.
- C1 validation, focus, character-bound, and counter behavior remained green.
- C2 delayed success, synchronous double-submit ownership, exact-draft preservation, 502, network abort, timeout plus deliberate retry, and navigation cleanup all passed.

## Static verification

All commands used Node 22 with `PREFIX=/private/tmp/react-resume-prefix`, `YARN_CACHE_FOLDER=/private/tmp/react-resume-yarn-cache`, and `env -u NO_COLOR`.

- `yarn build`: passed on the final production source. Next.js compiled and generated all five static pages; next-sitemap completed.
- `yarn typecheck`: passed.
- `yarn typecheck:tests`: passed.
- `yarn lint`: passed with zero warnings.
- `git diff --check`: passed.

## Browser and visual evidence

- `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/c2-contact-pending-320.png`: settled 320 x 844 pending state with readable synthetic fields, disabled sending button, and pending status.
- `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/c2-contact-uncertainty-320.png`: settled 320 x 844 network-uncertainty state with the synthetic draft preserved, enabled retry, and direct-email link.
- `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/c2-browser-evidence.txt`: captured measurement and traffic policy.
- Placeholder foreground: `rgb(163, 163, 163)`; background: `rgb(23, 23, 23)`; opacity: `1`; calculated WCAG contrast: `7.11:1`.
- The capture browser blocked all non-local traffic. The contact endpoint intercepted OPTIONS and two synthetic POST attempts; no real message was sent.
- Manual image inspection found no horizontal clipping or overlap in either state.

## Self-review

- Re-read the C2 brief, context, constraints, final component, and complete new test file.
- Confirmed the public URL and request shape remain unchanged.
- Confirmed the ownership ref is assigned synchronously before Axios begins and released only by the matching attempt.
- Confirmed controlled state is never normalized on submit; only the outgoing snapshot is trimmed. HTML `type=email` normalizes surrounding whitespace before React receives it, which the test records explicitly; name and message prove exact raw-draft preservation.
- Confirmed no timer or automatic resubmission was introduced.
- Confirmed every new contact test handles CORS preflight and asserts POST as the only submission method.

## Review fix round 1

- Moved pending, success, and failure feedback before the fields. The required uncertainty statement now accurately points downward to the preserved text.
- Removed form-level `aria-busy`. WAI-ARIA 1.2 permits assistive technologies to ignore descendant changes while an ancestor is busy, so the short-lived pending status now has no busy ancestor that could defer it until after removal.
- Added runtime semantic evidence to the real delayed-submission test: the pending status must have no `[aria-busy="true"]` ancestor.
- Replaced the hard `page.goto('/graph')` cleanup check with the desktop header's real Next.js `Link`. A window marker proves that navigation keeps the same document.
- The navigation test wraps the native browser `AbortController` without changing `abort` or signal behavior, records the controller created specifically by the contact submit, and verifies that controller's real signal becomes aborted after the component unmounts.
- The delayed route is then released and allowed to settle before no-stale-feedback assertions on the graph and after a client-side return to the form.

### Review-fix TDD and verification

- Focused RED command: `yarn test:e2e tests/e2e/contact-submission.spec.ts --project=chromium --grep "pending submission|navigating away"`.
- RED result: 2 failed. The pending status resolved its busy ancestor to `FORM`. The initial hero action also proved to be a normal document navigation, so the test was corrected to use the header's actual Next.js `Link` before judging React cleanup.
- A paused Playwright route does not emit `requestfailed` when the page-side XHR is aborted. That tooling signal was replaced with observation of the real per-submit `AbortController` signal; no production cleanup change was made.
- Focused GREEN result: 2/2 passed in 3.8 seconds.
- Final combined contact run: 9/9 passed in 23.8 seconds, including the real 15-second timeout.
- Final `yarn build`: passed and generated all five static pages; `next-sitemap` completed.
- Final `yarn typecheck:tests` and `yarn lint`: passed. The build's compile step passed source typechecking.
- Updated 320 x 844 pending and uncertainty captures show feedback above the fields with no clipping or overlap.
- Runtime capture reports `pendingBusyAncestor: null` and `uncertaintyPrecedesFields: true`. Placeholder contrast remains 7.11:1.

## Concerns

- OS screen-reader speech could not be exercised. Browser-level accessibility semantics are covered: the fields expose `readonly`, remain focusable during pending tests, the button is disabled, the pending message has status semantics, and the live update has no busy ancestor.

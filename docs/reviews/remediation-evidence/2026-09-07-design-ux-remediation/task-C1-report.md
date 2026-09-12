# Task C1 implementation report

## Status

DONE

## What changed

- Added a persistent invalid-submission summary to `ContactForm` with an assertive alert, an explicit error count, and links that focus the associated field.
- Focus now moves to the first invalid field in name, email, message order only after a failed submission. Repeating the same invalid submission remounts the summary so the failure can be announced again.
- Kept inline errors and their existing IDs/associations. Editing a field now clears only that field's error after its value becomes valid; unrelated errors remain visible and listed.
- Added client `maxlength` bounds matching the Lambda: name 100, email 254, message 2000.
- Kept the visible message counter associated with the textarea, removed per-keystroke live announcements from it, and added a separate polite status whose text changes only when entering the near-limit state or reaching the cap.
- Raised ordinary counter text from `neutral-500` to `neutral-400` for small-text contrast.
- Added intercepted Playwright coverage for empty submission, whitespace-only name/message, invalid email, partial correction, repeated submission, summary-link focus, server-aligned bounds, near-limit/cap feedback, 320 px fit, and absence of contact API attempts during invalid cases.

No C2 request-lifecycle behavior was implemented. The Lambda was read only; no backend, cloud, or external contact action occurred.

## TDD evidence

### RED

Baseline build before production changes:

```text
env -u NO_COLOR PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:/usr/bin:/bin:/usr/sbin:/sbin yarn build
exit 0: Next production build and static export completed
```

The first sandboxed browser attempt could not bind localhost (`listen EPERM 127.0.0.1:3100`), so it was rerun with the authorized localhost/browser permission. This was an environment error and was not counted as RED.

Meaningful failing run against the unchanged form:

```text
env -u NO_COLOR PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:/usr/bin:/bin:/usr/sbin:/sbin yarn test:e2e tests/e2e/contact-validation.spec.ts --project=chromium
exit 1: 4 failed
```

Expected failures observed:

- empty and whitespace invalid submissions left the submit button active instead of focusing `#contact-name`;
- there was no contact error summary (Playwright saw only Next's empty route-announcer alert);
- partial correction had no summary/error-count behavior;
- `#contact-name` did not have `maxlength="100"`.

These failures directly demonstrated the missing focus, summary, and bounds behavior before production edits.

### GREEN

After implementation, the first focused run reached 2 passing tests and exposed a test-only locator conflict: Next static export supplies its own empty route-announcer with `role="alert"`, so an unqualified alert locator matched both alerts. The test was narrowed to the contact summary's accessible name; production semantics were unchanged.

Focused result:

```text
env -u NO_COLOR PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:/usr/bin:/bin:/usr/sbin:/sbin yarn test:e2e tests/e2e/contact-validation.spec.ts --project=chromium
exit 0: 4 passed (5.0s)
```

Final combined browser result after the last test assertion:

```text
env -u NO_COLOR PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:/usr/bin:/bin:/usr/sbin:/sbin YARN_CACHE_FOLDER=/private/tmp/c1-yarn-cache YARN_GLOBAL_FOLDER=/private/tmp/c1-yarn-global yarn test:e2e tests/e2e/contact-validation.spec.ts tests/e2e/homepage.spec.ts --project=chromium
exit 0: 8 passed (6.7s)
```

The four C1 cases and the existing 320/390/430 px plus 200% text homepage checks all passed. Every C1 case used A1's fixture, and each asserted that no contact API request was initiated.

## Other verification

Production build on the final application source:

```text
env -u NO_COLOR PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:/usr/bin:/bin:/usr/sbin:/sbin yarn build
exit 0: compile, Next build/static generation, and next-sitemap completed
```

Static checks:

```text
env -u NO_COLOR PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:/usr/bin:/bin:/usr/sbin:/sbin YARN_CACHE_FOLDER=/private/tmp/c1-yarn-cache YARN_GLOBAL_FOLDER=/private/tmp/c1-yarn-global yarn lint
exit 0

env -u NO_COLOR PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:/usr/bin:/bin:/usr/sbin:/sbin YARN_CACHE_FOLDER=/private/tmp/c1-yarn-cache YARN_GLOBAL_FOLDER=/private/tmp/c1-yarn-global yarn typecheck:tests
exit 0

git diff --check
exit 0
```

Yarn printed its existing sandbox-only global-folder warning during the static checks; ESLint and TypeScript themselves completed without findings.

## Browser and accessibility evidence

The `agent-browser` CLI was not installed in this checkout or on PATH. I used the project's installed Playwright Chromium directly against the built static preview, with all external HTTP(S) routes aborted.

- [320 px contact and summary screenshot](evidence/c1-contact-summary-320.png)
- [Browser and contrast measurements](evidence/c1-browser-evidence.txt)
- [Ordinary counter crop](evidence/c1-counter-ordinary.png)
- [Near-limit counter crop](evidence/c1-counter-near-limit.png)

At 320 px, the captured partially corrected form had a two-error summary and `#contact-name` focused after repeat submission. The counter fit within the viewport. Against its actual sampled rendered background `rgb(10, 10, 10)`, ordinary `rgb(163, 163, 163)` measured 7.85:1 and near-limit `rgb(253, 186, 116)` measured 11.74:1, both above 4.5:1.

Keyboard and DOM/accessibility semantics were verified: first-error focus, summary links, alert/status roles, accessible summary name, `aria-invalid`, existing field error associations, and the counter's `aria-describedby` relationship. No dedicated screen-reader application was available in this environment, so I did not listen to or claim actual spoken output.

## Files changed

- `src/components/Sections/Contact/ContactForm.tsx`
- `tests/e2e/contact-validation.spec.ts`
- `.superpowers/sdd/2026-09-07-design-ux-remediation/task-C1-report.md`
- Evidence under `.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/`

## Self-review

- Re-read the C1 brief and checked every required behavior against the final diff and browser evidence.
- Confirmed the submission summary is created only by an invalid submit; blur alone still produces only an inline error.
- Confirmed each edit recalculates only an already-reported field's error and does not clear unrelated errors.
- Confirmed the summary remount key changes only for failed submission attempts, while its list can shrink as fields are corrected.
- Confirmed the ordinary visible counter is no longer live and the separate live text remains stable across ordinary near-limit keystrokes, changing at the threshold and cap.
- Confirmed no request lifecycle, timeout, read-only sending state, retry wording, or other C2 behavior was added.
- No application logs, storage, or test artifacts contain submitted personal information; browser evidence uses only synthetic repeated characters.

## Concerns

- Actual screen-reader spoken output remains unverified because no dedicated screen-reader tool was available. The evidence covers Chromium keyboard behavior and accessibility semantics only.
- The 320 px screenshot includes the existing floating menu overlap noted by the controller; it is outside C1 and deferred to E6.

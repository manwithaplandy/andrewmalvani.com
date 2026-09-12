# Contact Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make form errors easy to correct and make every send attempt bounded, predictable and safe for the visitor’s draft.

**Architecture:** Keep the existing controlled React form and API Gateway/SNS endpoint. Improve validation focus, announce errors, capture one submitted snapshot, temporarily make fields read-only during sending, and provide an explicit uncertain-delivery state after a timeout. Do not add storage of contact drafts or automatic resubmission.

**Tech Stack:** Existing React/TypeScript, Axios, Tailwind, A1’s Playwright browser fixture.

**Spec:** [Quality report](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07.md), F06, F07 and contact portion of F17. [Master plan](/Users/andrew/Scripts/react-resume/docs/superpowers/plans/2026-09-07-design-ux-remediation.md).

## Global Constraints

- Preserve the visible direct-email alternative and existing server-side validation.
- Keep server limits: name 100 characters, email 254 characters, message 2000 characters. Do not silently raise only the client limit.
- Tests must intercept all contact traffic. No real message or notification is part of the test plan.
- Do not store draft personal information in localStorage, analytics, logs or test artifacts.
- Network uncertainty does not prove that a message failed to reach the recipient. No automatic retry.
- Fix implementations are intentionally omitted; the plan provides precise behavior and verification code.

---

## File map

- Modify [ContactForm](/Users/andrew/Scripts/react-resume/src/components/Sections/Contact/ContactForm.tsx:1): field validation, focus, state, request lifecycle and readable counter.
- Read [contact Lambda](/Users/andrew/Scripts/react-resume/sns_publish_lambda/lambda_function.py:1): authoritative bounds and response behavior; no backend changes are required by these findings.
- Create `/Users/andrew/Scripts/react-resume/tests/e2e/contact-validation.spec.ts`: invalid-submit behavior and input bounds.
- Create `/Users/andrew/Scripts/react-resume/tests/e2e/contact-submission.spec.ts`: isolated request/response behavior.

## Task C1: Announce invalid submission and focus the correction

**Findings:** F06, contact portion of F17. **Dependency:** A1.

**Files:** Modify ContactForm; create `tests/e2e/contact-validation.spec.ts` at the absolute location given in the file map. Read the existing contact Lambda to confirm limits.

**Interfaces:**

- Retain field names/IDs `name/contact-name`, `email/contact-email`, `message/contact-message` and existing associated field error IDs.
- Add a persistent submission error-summary container that announces invalid submission and names the error count. Its links focus the corresponding inputs. The first invalid field receives focus in name → email → message order after submission.
- Client limits match the existing backend bounds: 100, 254, 2000. The message counter remains associated with the field but does not announce every ordinary keystroke; announce near-limit state changes and the cap.

- [ ] **Step 1: Add the failing keyboard case.** Import from A1’s fixture so external traffic is blocked:

```ts
import {test, expect} from './fixtures';

test('invalid send explains errors and focuses the first field', async ({page}) => {
  await page.goto('/#contact');
  await page.getByRole('button', {name: 'Send Message', exact: true}).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#contact-name')).toBeFocused();
  await expect(page.getByRole('alert')).toContainText('3');
  await expect(page.locator('#contact-name-error')).toHaveText('Please enter your name.');
  await expect(page.locator('#contact-email')).toHaveAttribute('aria-invalid', 'true');
});
```

- [ ] **Step 2: Specify additional validation examples.** Add whitespace-only name/message, invalid email, correction of one field without deleting other errors, and repeat submission with two remaining errors. Verify a summary link focuses its field. At 100/254/2000 characters verify bounds and near-limit copy. Each case must assert that no contact request escaped interception.
- [ ] **Step 3: Run `yarn build` and `yarn test:e2e tests/e2e/contact-validation.spec.ts --project=chromium`.** Confirm focus/summary assertions fail in the current implementation before changing it.
- [ ] **Step 4: Implement the announced correction path.** Populate the summary on submit, preserve existing per-field associations, and move focus only after a failed submit—not on blur or every edit. Keep the summary persistent enough for repeated validation failures to be announced. Clear only corrected errors and stale submission messages; do not clear unrelated fields.
- [ ] **Step 5: Match bounds and readable feedback.** Add the name/email bounds already enforced by the backend, keep the 2000-character message cap, and show the counter in legible supporting text. Avoid one live announcement per keystroke; the ordinary count can remain descriptive text.
- [ ] **Step 6: Verify with keyboard and a screen reader.** Rebuild/rerun the tests. Manually submit empty and partially corrected forms, follow a summary link, and reach the Send button again. Confirm the reason for failure is understandable without navigating backward through every field. Inspect the counter at 320 pixels and measure its contrast.
- [ ] **Step 7: Run typechecks/lint and commit** as `fix: guide contact form users to validation errors`.

## Task C2: Bound requests and protect the submitted draft

**Findings:** F07. **Dependency:** C1.

**Files:** Modify ContactForm; create `tests/e2e/contact-submission.spec.ts` at the absolute location given in the file map. Preserve the C1 validation tests.

**Interfaces:**

- Keep the existing public API URL and request object `{name: string; email: string; message: string}`.
- A send attempt has a 15,000 ms timeout. Only one request can be in flight; fields become read-only, remain readable/focusable, and display `Sending your message. Fields are temporarily read-only.`
- Submission captures a trimmed snapshot after validation. A confirmed 2xx response clears that submitted snapshot and announces success. Network failure, timeout or non-2xx response preserves it and restores editing.
- Timeout/network copy: `Delivery could not be confirmed. Your message may have been sent. The text is preserved below; you can retry or email me directly.` Use the existing email address as the link. Do not imply that retry cannot produce a duplicate.
- Abort local work on unmount and ignore its late completion. Do not classify unmount cancellation as a user-visible send failure on another page.

- [ ] **Step 1: Add an intercepted delayed-success test.** This verification creates no external message:

```ts
import {test, expect} from './fixtures';

test('pending submission is read-only and sends one snapshot', async ({page}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let requests = 0;
  const cors = {
    'access-control-allow-origin': 'http://127.0.0.1:3100',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
  await page.route('**/api/contact', async route => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({status: 204, headers: cors});
      return;
    }
    expect(route.request().method()).toBe('POST');
    requests += 1;
    expect(route.request().postDataJSON().message).toBe('A synthetic test message.');
    await gate;
    await route.fulfill({status: 200, headers: cors, contentType: 'text/plain', body: 'accepted'});
  });
  await page.goto('/#contact');
  await page.locator('#contact-name').fill('Test Visitor');
  await page.locator('#contact-email').fill('visitor@example.test');
  await page.locator('#contact-message').fill('A synthetic test message.');
  await page.getByRole('button', {name: 'Send Message', exact: true}).click();
  try {
    await expect(page.locator('#contact-message')).toHaveAttribute('readonly', '');
    await expect(page.getByRole('button', {name: 'Sending…', exact: true})).toBeDisabled();
    await expect.poll(() => requests).toBe(1);
  } finally {
    release();
  }
  await expect(page.locator('#contact-message')).toHaveValue('');
  await expect(page.getByText(/Message sent — thank you/)).toBeVisible();
});
```

- [ ] **Step 2: Add failure and uncertainty cases.** Mock a 502, an aborted network request and a response delayed beyond 15 seconds. All preserve the exact draft and restore editing. During the delayed request, attempt keyboard insertion into each field and confirm its value remains unchanged. Verify timeout language expresses uncertainty, no second request starts automatically, a deliberate retry sends once, and navigating away while pending does not display stale feedback on the new page. Set this timeout test’s own limit above 20 seconds so it tests the application timeout. Preserve the mock's CORS/preflight handling in every response case; assert only POST requests as submissions.
- [ ] **Step 3: Run `yarn build` and `yarn test:e2e tests/e2e/contact-submission.spec.ts --project=chromium`.** Confirm the read-only and bounded-time assertions fail initially. The timeout mock must eventually be released/aborted in cleanup even after assertion failure.
- [ ] **Step 4: Implement one-request ownership.** Guard against repeated submit events before state rerenders; capture the validated snapshot, mark the attempt current, and make fields read-only. Configure Axios’s explicit timeout and an abort signal. On settle, update only the still-current mounted attempt and release its guard.
- [ ] **Step 5: Implement the outcome rules.** Clear only after a confirmed success. Preserve input and show the actionable failure/uncertainty message otherwise. Restore editability and Send availability after every settled non-success; never auto-resubmit. Keep successful response-time expectations from the existing form.
- [ ] **Step 6: Rebuild and verify the full form.** Run both contact suites, then test editing, validation, pending state and deliberate retry with the mocked endpoint in a browser. Confirm the form remains understandable on mobile and with a screen reader. No live send is needed.
- [ ] **Step 7: Run typechecks/lint and commit** as `fix: make contact requests bounded and draft-safe`.

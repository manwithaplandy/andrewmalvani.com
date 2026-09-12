## Task 10: C2 — Bound requests and protect the submitted draft

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



## Task 4: C1 — Announce invalid submission and focus the correction

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




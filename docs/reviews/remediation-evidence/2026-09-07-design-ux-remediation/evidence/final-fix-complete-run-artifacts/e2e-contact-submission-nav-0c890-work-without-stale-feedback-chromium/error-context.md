# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/contact-submission.spec.ts >> navigating away aborts pending local work without stale feedback
- Location: tests/e2e/contact-submission.spec.ts:191:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e5]:
    - link "Skip 3D graph — go to resume content" [ref=e6] [cursor=pointer]:
      - /url: /
    - generic [ref=e8]:
      - heading "Andrew Malvani" [level=1] [ref=e9]
      - paragraph [ref=e10]: Lead AI/ML Engineer, General Atomics · since June 2024
      - paragraph [ref=e11]: Each node is a role, skill, or certification — explore how they connect.
      - generic [ref=e12]:
        - link "Classic resume" [ref=e13] [cursor=pointer]:
          - /url: /
        - link "Download résumé PDF" [ref=e16] [cursor=pointer]:
          - /url: /assets/resume.pdf
    - generic [ref=e19]:
      - status [ref=e20]
      - search "Career search" [ref=e21]:
        - generic [ref=e22]: Find a role, skill, or achievement
        - textbox "Find a role, skill, or achievement" [ref=e23]
        - paragraph [ref=e24]: 53 career items. Enter a role, skill, or achievement to find a match.
        - list
      - toolbar "Career graph controls" [ref=e25]:
        - button "Text view" [ref=e26] [cursor=pointer]
        - button "3D view" [pressed] [ref=e27] [cursor=pointer]
        - button "Show overview" [ref=e28] [cursor=pointer]
        - group [ref=e29]:
          - generic "How to explore" [ref=e30] [cursor=pointer]
          - generic [ref=e31]:
            - paragraph [ref=e32]: Click or tap a node to select it. Drag the graph to orbit.
            - paragraph [ref=e33]: Use ←/→ to scan connections, ↑ to dive in, and ↓ to go back.
            - button "Dismiss hint" [ref=e34] [cursor=pointer]: Close help
        - group [ref=e35]:
          - generic "Legend" [ref=e36] [cursor=pointer]
        - button "Reduce motion" [ref=e37] [cursor=pointer]
      - generic [ref=e38]:
        - navigation "Focus history" [ref=e39]:
          - button "Lead AI/ML Engineer" [ref=e41] [cursor=pointer]
        - generic [ref=e42]:
          - application "Interactive 3D career graph. Use left and right arrows to scan connections, up arrow to dive in, down arrow to go back, Escape to deselect." [ref=e44]
          - region "Selected career item" [ref=e51]:
            - generic [ref=e52]:
              - generic [ref=e53]:
                - generic [ref=e54]:
                  - paragraph [ref=e55]: Role
                  - heading "Lead AI/ML Engineer" [level=2] [ref=e56]
                  - paragraph [ref=e57]: General Atomics · June 2024 - Present
                - button "Deselect node" [ref=e58] [cursor=pointer]
              - paragraph [ref=e61]: "Leads General Atomics' enterprise AI program as the organization's LLM SME: a DoD-compliant enterprise AI chatbot avoiding $15M/yr in spend, a self-service RAG platform delivering 4x efficiency for 10,000+ users, a self-service agent platform built on MCP, and AI dev assistants that raised developer productivity by 30%."
              - button "Show more" [ref=e62] [cursor=pointer]
              - generic [ref=e63]:
                - paragraph [ref=e64]: 29 connections — scan with ←/→ or Prev/Next
                - generic [ref=e65]:
                  - button "Previous connection" [ref=e66] [cursor=pointer]
                  - button "Next connection" [ref=e69] [cursor=pointer]
                  - button "Go to highlighted connection" [disabled] [ref=e72]: Dive in
                  - button "Back to previous node" [disabled] [ref=e75]: Back
  - alert [ref=e78]: Career Graph | Andrew Malvani
```

# Test source

```ts
  146 |   await expect(page.getByRole('button', {name: 'Send Message', exact: true})).toBeEnabled();
  147 |   expect(requests).toBe(1);
  148 | });
  149 | 
  150 | test('timeout preserves the draft and only a deliberate retry starts another request', async ({page}) => {
  151 |   test.setTimeout(30_000);
  152 |   let release!: () => void;
  153 |   const gate = new Promise<void>(resolve => {
  154 |     release = resolve;
  155 |   });
  156 |   let requests = 0;
  157 | 
  158 |   await page.route(CONTACT_ENDPOINT, async route => {
  159 |     if (await handlePreflight(route)) return;
  160 |     requests += 1;
  161 |     expectTrimmedPayload(route);
  162 |     if (requests === 1) {
  163 |       await gate;
  164 |       await route.abort('timedout').catch(() => undefined);
  165 |       return;
  166 |     }
  167 |     await route.fulfill({status: 200, headers: CORS_HEADERS, contentType: 'text/plain', body: 'accepted'});
  168 |   });
  169 | 
  170 |   await fillDraft(page);
  171 |   await page.getByRole('button', {name: 'Send Message', exact: true}).click();
  172 | 
  173 |   try {
  174 |     await expect(page.getByText(UNCERTAIN_DELIVERY, {exact: true})).toBeVisible({timeout: 18_000});
  175 |     await expectExactDraft(page);
  176 |     await expect(page.locator('#contact-message')).toBeEditable();
  177 |     await expect(page.getByRole('button', {name: 'Send Message', exact: true})).toBeEnabled();
  178 |     expect(requests).toBe(1);
  179 | 
  180 |     await page.waitForTimeout(250);
  181 |     expect(requests).toBe(1);
  182 |     await page.getByRole('button', {name: 'Send Message', exact: true}).click();
  183 |     await expect.poll(() => requests).toBe(2);
  184 |     await expect(page.getByText(/Message sent — thank you/)).toBeVisible();
  185 |     await expect(page.locator('#contact-message')).toHaveValue('');
  186 |   } finally {
  187 |     release();
  188 |   }
  189 | });
  190 | 
  191 | test('navigating away aborts pending local work without stale feedback', async ({page}) => {
  192 |   let release!: () => void;
  193 |   const gate = new Promise<void>(resolve => {
  194 |     release = resolve;
  195 |   });
  196 |   let requests = 0;
  197 |   let delayedRouteSettled = false;
  198 | 
  199 |   await page.addInitScript(() => {
  200 |     const observedWindow = window as ObservedWindow;
  201 |     const NativeAbortController = window.AbortController;
  202 |     observedWindow.c2Controllers = [];
  203 |     window.AbortController = class extends NativeAbortController {
  204 |       constructor() {
  205 |         super();
  206 |         observedWindow.c2Controllers?.push(this);
  207 |       }
  208 |     };
  209 |   });
  210 | 
  211 |   await page.route(CONTACT_ENDPOINT, async route => {
  212 |     if (await handlePreflight(route)) return;
  213 |     requests += 1;
  214 |     expectTrimmedPayload(route);
  215 |     await gate;
  216 |     try {
  217 |       await route.fulfill({status: 200, headers: CORS_HEADERS, contentType: 'text/plain', body: 'accepted'});
  218 |     } catch {
  219 |       // The client abort can make the intercepted route impossible to fulfill.
  220 |     } finally {
  221 |       delayedRouteSettled = true;
  222 |     }
  223 |   });
  224 | 
  225 |   await fillDraft(page);
  226 |   await page.evaluate(() => {
  227 |     (window as ObservedWindow).c2DocumentMarker = 'same-document-navigation';
  228 |   });
  229 |   const controllersBeforeSubmit = await page.evaluate(() => (window as ObservedWindow).c2Controllers?.length ?? 0);
  230 |   await page.getByRole('button', {name: 'Send Message', exact: true}).click();
  231 |   await expect.poll(() => requests).toBe(1);
  232 |   await expect.poll(() => page.evaluate(() => (window as ObservedWindow).c2Controllers?.length ?? 0)).toBe(
  233 |     controllersBeforeSubmit + 1,
  234 |   );
  235 |   const submittedController = controllersBeforeSubmit;
  236 | 
  237 |   try {
  238 |     await page.locator('#headerNav').getByRole('link', {name: 'career graph', exact: true}).click();
  239 |     await expect(page).toHaveURL(/\/graph(?:#|$)/);
  240 |     expect(await page.evaluate(() => (window as ObservedWindow).c2DocumentMarker)).toBe('same-document-navigation');
  241 |     expect(
  242 |       await page.evaluate(
  243 |         index => (window as ObservedWindow).c2Controllers?.[index]?.signal.aborted,
  244 |         submittedController,
  245 |       ),
> 246 |     ).toBe(true);
      |       ^ Error: expect(received).toBe(expected) // Object.is equality
  247 |     release();
  248 |     await expect.poll(() => delayedRouteSettled).toBe(true);
  249 |     await expect(page.getByText(/Message sent — thank you|Delivery could not be confirmed/)).toHaveCount(0);
  250 |     await page.getByRole('link', {name: 'Classic resume', exact: true}).click();
  251 |     await expect(page).toHaveURL(/\/$/);
  252 |     await expect(page.getByText(/Message sent — thank you|Delivery could not be confirmed/)).toHaveCount(0);
  253 |     await expect(page.locator('#contact-name')).toHaveValue('');
  254 |   } finally {
  255 |     release();
  256 |   }
  257 | });
  258 | 
```
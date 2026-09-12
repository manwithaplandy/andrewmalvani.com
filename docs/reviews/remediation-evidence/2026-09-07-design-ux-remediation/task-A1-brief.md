## Task 1: A1 — Repair mobile reflow and establish browser regression verification

**Findings:** F01, homepage portion of F17, reading alignment portion of F22, tooling portion of F29.

**Files:** Modify the verification and responsive-homepage files above. Create `/Users/andrew/Scripts/react-resume/tests/e2e/homepage.spec.ts`. Do not change content facts in this task.

**Interfaces:**

- Consumes: existing `#hero`, `#resume`, `#portfolio`, `#contact` section IDs and production export directory `out/`.
- Produces: `yarn typecheck`, `yarn typecheck:tests`, `yarn lint`, `yarn format`, `yarn lint:fix`, `yarn preview`, `yarn test:e2e` scripts. Browser fixture exports Playwright `test` and `expect`; all later browser tests import these from `tests/e2e/fixtures.ts`.
- Produces: a `chromium` Playwright project with base URL `http://127.0.0.1:3100`, a preview server serving `out/`, and traces/screenshots retained only on failure.

- [ ] **Step 1: Record the execution baseline.** Run `git status --short`, `node --version`, `yarn --version`, `yarn tsc --noEmit --incremental false`, and `yarn eslint './src/**/*.{js,jsx,ts,tsx}' --max-warnings=0`. Record unexpected pre-existing changes instead of overwriting them.
- [ ] **Step 2: Add the runner required by the regression.** Run `yarn add --dev --exact @playwright/test serve`, then `yarn playwright install chromium`. Verify the resolved versions support Node 22 and commit the resulting lockfile with this task. No production dependency is added.
- [ ] **Step 3: Define the scripts and runner.** `typecheck` and `compile` run `tsc --noEmit --incremental false`; remove the Yarn-Berry-only `run -T` syntax from this Yarn Classic project. `lint` runs ESLint without `--fix`; `format` owns Prettier writes and `lint:fix` owns ESLint writes. `typecheck:tests` runs `tsc -p tsconfig.tests.json --noEmit --incremental false`; that config extends the current config and includes the Playwright config and tests. `preview` runs `serve out --listen tcp://127.0.0.1:3100`; `test:e2e` runs `playwright test`. Configure `testDir: './tests'`, Chromium, one worker initially, and the preview command as Playwright’s web server. Build output must already exist. This is a static-export preview, not `next start`. The preview uses serve-handler's [extensionless HTML support](https://github.com/vercel/serve-handler#cleanurls-booleanarray); confirm `/graph` and `/stats` resolve before diagnosing application assertions. Keep application TypeScript scope unchanged; the separate test config covers newly added test files.
- [ ] **Step 4: Isolate browser requests.** In the shared fixture, install a context route before the page is used: continue only requests to the exact base origin, abort other HTTP(S) requests, and leave local data/blob resources alone. Contact tests override this with page-level mocked routes. Ignore `playwright-report/` and `test-results/` in Git. This prevents tests from sending real messages or depending on external products.
- [ ] **Step 5: Write the observable failing reflow test.** Use this verification case in the new test file; the fixture contract is defined above:

```ts
import {test, expect} from './fixtures';

for (const width of [320, 390, 430]) {
  test(`homepage fits ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 844});
    await page.goto('/');
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    await expect.poll(() => page.evaluate(() =>
      document.documentElement.scrollWidth - innerWidth,
    )).toBeLessThanOrEqual(1);
    for (const link of await page.locator('#hero a').all()) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    }
  });
}
```

- [ ] **Step 6: Confirm the test fails for the right reason.** Run `yarn build` and `yarn test:e2e tests/e2e/homepage.spec.ts --project=chromium`. Expect overflow failures near the report’s 320/390-pixel measurements, not missing-server or fixture errors.
- [ ] **Step 7: Make the hero fit available width.** Constrain the content wrapper to its parent; permit the three actions to wrap or stack before their minimum widths overflow. At 320 pixels use a full-width PDF action and a second row for graph/contact if they fit; otherwise stack all three. Keep natural hero height so expanded text never overlaps the down control. Do not hide overflow to mask clipped text. Preserve desktop proportions.
- [ ] **Step 8: Improve reading and informational contrast.** Give long timeline copy and bullets a stable left edge on phones; maintain role/date hierarchy and existing content. Raise small informational certification text to at least the neutral-400 tier on neutral-900. Do not indiscriminately brighten decorative borders or disabled controls.
- [ ] **Step 9: Verify normal and enlarged layouts.** Rebuild and rerun the focused tests. Visually inspect 320×720, 390×844, 430×932, and 1280×900, then 200% text enlargement and a 320-CSS-pixel zoomed viewport. Capture the hero, current role, skills and certifications. Confirm no hidden content, overlap, horizontal panning, or new desktop regression. Use the browser skills for the live inspection.
- [ ] **Step 10: Review and commit.** Run both typechecks and nonmutating lint, inspect `git diff --check` and the scoped diff, then commit as `fix: restore mobile resume reflow`. Stage only the files owned by A1.




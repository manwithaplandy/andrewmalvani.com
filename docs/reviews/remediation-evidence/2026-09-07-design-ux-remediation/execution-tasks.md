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



## Task 2: B1 — Expose text mode and recover from invalid browser state

**Findings:** F02, F09. **Dependency:** A1.

**Files:** GraphExplorer, GraphListFallback, and graph-access tests.

**Interfaces:**

- Consumes: `resumeGraph.nodeById`, existing `GraphNavState`/`GraphNavAction`, and current `focusNode` selection action.
- Changes `GraphListFallback` props to `{state: GraphNavState; dispatch: Dispatch<GraphNavAction>; reason: 'chosen' | 'unsupported' | 'performance'}`. This component is always visible when mounted; the obsolete `visible` prop is removed everywhere.
- Keeps `parseNodeHash(hash: string): string | null` private to GraphExplorer: malformed encoding, unknown IDs and non-node fragments return null.
- Produces visible buttons `Text view` and `3D view`, with `aria-pressed`. `?view=list` selects the text experience; `?view=3d` requests 3D but never overrides an unsupported-device fallback. Preserve `#node=` selection through switches. Record view choice in the query, not a new persistent storage dependency.

- [ ] **Step 1: Add deep-link and visible-alternative regressions.** This is the core invalid-link test; add a separate valid `skill:python` selection case and a `?view=list` case:

```ts
import {test, expect} from './fixtures';

for (const hash of ['#node=%', '#node=%E0%A4%A', '#node=unknown']) {
  test(`invalid graph link remains usable: ${hash}`, async ({page}) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/graph${hash}`);
    await expect(page.getByRole('link', {name: 'Classic resume'})).toBeVisible();
    await page.getByRole('button', {name: 'Text view', exact: true}).click();
    await expect(page.getByRole('navigation', {
      name: 'Career graph, list view',
    })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
```

- [ ] **Step 2: Add the keyboard regression.** In verified 3D mode require the text-view navigation to be absent from the DOM, not just visually hidden. Tab through the page from its entry controls and through the connection controls, inspecting visible focus at each stop. In text mode require entries to be visible and keyboard-operable. The test must report inability to initialize 3D as an environment problem, not silently skip that assertion.
- [ ] **Step 3: Run `yarn build` and `yarn test:e2e tests/e2e/graph-access.spec.ts --project=chromium`.** Expect missing mode buttons, the current clipped list, and malformed-link errors before implementation. Resolve runner failures separately from application failures.
- [ ] **Step 4: Implement the mutually exclusive views.** Unmount the text list while 3D is active; unmount/pause the canvas while the chosen or fallback text view is active. Retain the reducer state across switching. Keep focus on a persistent mode button when switching so it is never stranded in an unmounted node. Explain chosen text mode without falsely saying the browser is unsupported.
- [ ] **Step 5: Use ordinary list/disclosure semantics.** Replace the incomplete tree roles with headings, lists and standard buttons. On each selectable row provide an accessible expanded/current state linked to its revealed details. Keep connection navigation and the existing live selection summary; do not implement a custom tree keyboard system unnecessarily.
- [ ] **Step 6: Make URL and storage handling recoverable.** Catch decoding errors and return the default selection instead of throwing. Guard every existing hint-storage read/write; denied storage uses in-memory state. Ignore unknown `view` values. Preserve the initial valid deep-link protection and browser Back behavior; do not add redundant history entries during mount.
- [ ] **Step 7: Verify fallback conditions.** Test malformed and valid hashes, browser Back/Forward, chosen text mode, storage access throwing, and forced WebGL unavailability. All retain visible résumé/download links and the same selected-node content when applicable.
- [ ] **Step 8: Run typechecks/lint and commit** as `fix: expose an accessible career graph text view`.



## Task 3: A2 — Make destinations, document actions and metadata dependable

**Findings:** F04, F23, F25, F26. **Dependency:** A1.

**Files:** Modify shared data/image types, Hero, Header, Footer, Page and graph document link listed in the map. Create `/Users/andrew/Scripts/react-resume/tests/e2e/navigation.spec.ts`. A5 also touches Header; integrate these changes sequentially.

**Interfaces:**

- Consumes: existing `PortfolioItem.url: string`, section IDs, `siteConfig.siteUrl`, and A1’s fixture.
- Produces: document actions named `Download résumé PDF`; the header’s in-page action named `Experience`; footer control named `Back to top` targeting the current page’s top. All image-bearing data fields accept `StaticImageData | string`; link destinations remain strings.
- Produces: canonical and `og:url` based on the route pathname only, with `/` retained for the homepage. Query/hash information continues to serve navigation but is not page identity.

- [ ] **Step 1: Add failing destination tests.** Test the architecture link’s attribute is not `[object Object]`; follow it through the Playwright request context, require status 200 and an image content type. Test `/?utm_source=review#portfolio` declares canonical and `og:url` equal to `https://andrewmalvani.com/`. Test `/graph?view=list#node=skill%3Apython` declares `https://andrewmalvani.com/graph`. Test every footer upward control has its expected accessible name and returns to the current page’s top.

```ts
import {test, expect} from './fixtures';

test('campaign links retain one homepage identity', async ({page}) => {
  await page.goto('/?utm_source=review#portfolio');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href', 'https://andrewmalvani.com/',
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content', 'https://andrewmalvani.com/',
  );
});

test('the architecture card opens a real local image', async ({page, request}) => {
  await page.goto('/#portfolio');
  const link = page.locator('#portfolio a').filter({hasText: 'andrewmalvani.com'});
  const href = await link.getAttribute('href');
  expect(href).not.toBeNull();
  expect(href).not.toContain('[object Object]');
  const destination = new URL(href!, page.url());
  expect(destination.origin).toBe('http://127.0.0.1:3100');
  const response = await request.get(destination.toString(), {maxRedirects: 0});
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^image\//);
});
```

The explicit origin assertion matters because APIRequestContext is separate from browser route interception. Keep this test scoped to the generated local artifact.

- [ ] **Step 2: Run `yarn build` and `yarn test:e2e tests/e2e/navigation.spec.ts --project=chromium`.** Confirm existing link and canonical assertions fail before changes.
- [ ] **Step 3: Repair the image destination at its source.** Use the imported architecture image’s actual URL field for `PortfolioItem.url`. Remove misleading raster-image string declarations and align Hero/About image data with Next’s static-image shape. Retain video declarations and do not solve the mismatch with an unchecked string cast. Check every affected image import with TypeScript.
- [ ] **Step 4: Make action names and behavior explicit.** Use `Download résumé PDF` for homepage and graph download actions, with the `download` attribute and existing `Andrew-Malvani-Resume.pdf` filename on both. Verify each emits a browser download event instead of merely changing its label. Rename the in-page résumé navigation label to `Experience` without changing `#resume`. Give the footer a current-page top target and an accessible name; add a stable top anchor to the shared page wrapper if required. Update tests to distinguish section navigation from downloads.
- [ ] **Step 5: Normalize page identity.** Build the canonical/social URL from the actual route without query or fragment. Retain unique homepage/graph/stats titles, descriptions, and preview images; do not canonicalize all routes to the homepage.
- [ ] **Step 6: Rebuild and verify links in the generated export.** Run navigation and homepage tests together, both typechecks and lint. A1's reflow assertions must still pass with the longer download label. Open the full architecture image, download the PDF, and inspect footer behavior on homepage and stats. Keep external product availability outside this local regression suite.
- [ ] **Step 7: Commit the reviewed result** as `fix: make resume links and page metadata predictable`.



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



## Task 5: A3 — Reconcile professional facts, credentials and skill language

**Findings:** F05, F20, F24; editorial portion of F22. **Dependency:** A2. Coordinate graph introduction edits before B2 modifies its layout.

**Files:** Modify shared content, siteConfig, graph introduction, Skills, CertificationItem and PDF. Create the two fact/document source files in the map. No automated test is required merely to assert chosen prose.

**Interfaces:**

- Consumes: current role date `June 2024 - Present`, employer tenure from the existing timeline, Georgia Tech `Expected 2028`, and the owner’s location clarification.
- Produces: `docs/content/professional-facts.md` containing approved residence wording, job/employer dates, education status, metric interpretations, and credential evidence with verification date. `docs/content/resume-source.md` contains the complete editable résumé text used for the PDF.
- Extends `Certification` with `verificationUrl?: string` and `status?: 'current' | 'historical'`; populate them only with evidence. Existing `date` is labeled according to its confirmed meaning. No fabricated credential IDs or expiry dates.

- [ ] **Step 1: Build the fact record.** Copy each conflicting assertion and its source into a table with columns fact, approved wording, evidence, and confirmed date. Resolve residence from the owner’s reply; if none has arrived, request it at this task and keep only this fact-dependent work open. Ask for credential URLs/status and the meaning of years; record unavailable evidence as “not supplied,” not as a current credential claim.
- [ ] **Step 2: Reconcile metrics without inventing equivalence.** Have the owner resolve the PDF’s `$50m ROI` versus the website’s spend avoidance, and `90%` deployment improvement versus days-to-minutes. Preserve each verified metric’s unit and scope. Where no clarification is available, retain the existing fact in its original context rather than combine it into a stronger claim.
- [ ] **Step 3: Correct role and education presentation.** Label the graph sentence with current-role start June 2024, or explicitly separate “Career since 2018” from the current role. Keep the degree’s expected completion visible; represent in-progress education as study rather than completed alumni status in machine-readable metadata. Apply the approved residence consistently.
- [ ] **Step 4: Make sections contribute distinct information.** Keep the hero’s concise role/scale pitch; make About focus on the psychology-to-engineering progression and current focus. Keep quantified work outcomes in the timeline. Do not remove a quantified achievement merely to shorten the page.
- [ ] **Step 5: Define skill depth and credential meaning.** Present Familiar as limited hands-on exposure, Proficient as independent delivery, and Expert as repeated delivery plus design/debugging responsibility. Ask the owner to confirm these meanings against the current tiers; adjust only with that agreement. Provide the definition once per skills context. Link credentials with supplied verification evidence; otherwise retain historical year information without asserting current validity.
- [ ] **Step 6: Regenerate the PDF from the editable source.** Use the PDF skill at execution time. Preserve one-page readability, text selection, working email/LinkedIn links and existing accomplishments. Use its render-and-inspect workflow; do not overwrite the PDF with an unreviewed visual result.
- [ ] **Step 7: Perform a cross-format fact check.** Compare homepage, graph introduction, metadata, editable résumé source, and rendered PDF against each approved fact row. Check the longest credential and skill labels at 320 pixels. Record unresolved factual dependencies explicitly and do not mark F05/F24 closed until their affected assertions are reconciled.
- [ ] **Step 8: Run build/typechecks/lint and commit** as `content: reconcile professional facts across resume views`, including the updated source document and PDF together.



## Task 6: A4 — Present relevant, substantiated project evidence

**Findings:** F16, F21. **Dependency:** A3 shared data edits complete; unconfirmed residence does not block project work.

**Files:** Modify Portfolio, `PortfolioItem`, project data and the relevant existing images. Create `/Users/andrew/Scripts/react-resume/docs/content/project-evidence.md`. Extend `/Users/andrew/Scripts/react-resume/tests/e2e/navigation.spec.ts` only for disclosure/navigation behavior.

**Interfaces:**

- Consumes: existing five project destinations and screenshots; A2’s correctly typed image URLs.
- Extends `PortfolioItem` with optional `caseStudy` containing four strings: `problem`, `contribution`, `decision`, `outcome`. These are approved factual prose, not automatically generated claims.
- Produces: a native `details/summary` disclosure named `Project details` for projects with approved narratives. The demo/repository link and disclosure are separate controls; never nest an interactive disclosure inside a card-wide link.

- [ ] **Step 1: Collect two project narratives.** For Rolefit and Polyscannr, record the user problem, Andrew’s actual responsibility, one consequential decision/constraint, and an observable result. Attach a source or owner confirmation to every factual claim. If either cannot be substantiated, use another project with available evidence; do not publish invented adoption or business impact.
- [ ] **Step 2: Set evidence-oriented ordering and labels.** Lead with Rolefit and Polyscannr once their narratives are approved, then Retirement Simulations, architecture, and source. Name the current GitHub destination `Source for this site` so it accurately describes the repository. Use `Rolefit` as the concise project title and its purpose in supporting copy.
- [ ] **Step 3: Add the narrative disclosures.** Show the four labeled parts under their project without requiring an external visit. Keep demo/source links usable as ordinary links, preserve focus styles, and make card hover effects consistent with the actual interactive areas.
- [ ] **Step 4: Refresh image presentation.** Choose useful crops of the supplied product screenshots that communicate the key interface at card size; show the complete architecture diagram with containment where it carries structural meaning. Preserve source screenshots and aspect ratios. At execution time use the image-editing skill/tool if altering bitmap contents; CSS framing does not require image generation.
- [ ] **Step 5: Verify the actual reading journey.** On phone and desktop, open each disclosure by keyboard, follow its separate link, and return. Ask a reviewer to explain Andrew’s contribution to the two leading projects using only this page. Check thumbnails at their rendered size, not zoomed full-resolution images.
- [ ] **Step 6: Build, typecheck, lint and commit** as `content: surface project ownership and engineering decisions`. Include evidence notes with the factual changes; F16 remains open if two approved narratives are unavailable.



## Task 7: A5 — Apply motion preferences consistently

**Findings:** Homepage part of F27. **Dependency:** A1. Produces the hook consumed by B2.

**Files:** Create the shared hook in the map. Modify Header, ParticleField and Reveal. Create `/Users/andrew/Scripts/react-resume/tests/e2e/motion.spec.ts`.

**Interfaces:**

- Produces default export `useReducedMotion(): boolean`: server-safe initial behavior, immediate synchronization after mount, live updates from `prefers-reduced-motion`, and listener cleanup.
- Consumers: Header disables sliding transitions; ParticleField stops and clears its existing animation when preference becomes reduced and safely resumes if changed back; Reveal immediately exposes its content and avoids movement. Existing offscreen/tab visibility gating and density caps remain intact.

- [ ] **Step 1: Write a dynamic-preference regression.** Open the homepage with no reduction, switch with `page.emulateMedia({reducedMotion: 'reduce'})`, and inspect menu/reveal movement plus successive particle-canvas captures while the viewport remains fixed. Require the menu and content to stay usable and the particle image to stop changing. Switch back and verify normal behavior resumes without duplicate animation loops. Keep an initial-reduced-motion case too.

```ts
import {test, expect} from './fixtures';

test('particles stop when the preference changes during a visit', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.goto('/');
  const canvas = page.locator('#hero canvas');
  await expect(canvas).toBeVisible();
  const captureAfterFrames = () => canvas.evaluate(async node => {
    for (let frame = 0; frame < 6; frame += 1) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
    return (node as HTMLCanvasElement).toDataURL();
  });
  const moving = await captureAfterFrames();
  await expect.poll(captureAfterFrames).not.toBe(moving);
  await page.emulateMedia({reducedMotion: 'reduce'});
  const still = await captureAfterFrames();
  expect(await captureAfterFrames()).toBe(still);
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await expect.poll(captureAfterFrames).not.toBe(still);
});
```

- [ ] **Step 2: Run `yarn build` and `yarn test:e2e tests/e2e/motion.spec.ts --project=chromium`.** Confirm the dynamic particle/menu case exposes the current gap; do not mistake a hidden/offscreen canvas for a successful motion test.
- [ ] **Step 3: Implement the hook contract and use it in the three consumers.** Ensure cleanup occurs on preference change and unmount. Avoid a new global animation framework or per-render listener registration.
- [ ] **Step 4: Verify browser and operating-system behavior.** Rebuild and rerun the focused test; manually change the OS preference during a visit and inspect menu/content/particles. Recheck offscreen and background-tab pausing.
- [ ] **Step 5: Run typechecks/lint and commit** as `fix: honor live reduced-motion preferences`. Tell B2 the shared hook is available and avoid concurrent edits to Header/ParticleField during integration.


## Task 8: B2 — Give graph navigation, help and details independent layout space

**Findings:** F03, complete-heading part of F08, graph parts of F17/F27. **Dependencies:** B1 and A5. Coordinate with A3’s graph introduction edits.

**Files:** graph page, GraphExplorer, FocusPanel, ResumeGraphCanvas and graph-layout tests.

**Interfaces:**

- Consumes A5 default `useReducedMotion(): boolean` and the existing manual graph motion preference; effective reduction is their logical OR.
- Extends FocusPanel props with `reducedMotion: boolean`; state and dispatch retain their existing types.
- Canvas continues deriving size from its actual container through its existing resize observer. Page/toolbar/panel layout owns available space; the canvas does not position page navigation.
- Produces a named `Career graph controls` toolbar, native disclosures named `How to explore` and `Legend`, a `Selected career item` region for the 3D detail panel, and wrapped complete item headings. Text mode retains its visible inline item details; do not duplicate them in a second panel.

- [ ] **Step 1: Add the responsive interaction cases.** In `graph-layout.spec.ts`, cover 320×720, 390×844, 844×390 and 1280×900. For each, open help, open legend, select the Georgia Tech item through text mode, return to 3D when supported, and expand details. Assert the complete selected title remains visible and that résumé/PDF/mode controls can be scrolled into view and clicked without being covered.

```ts
import {test, expect} from './fixtures';

test('a long selected title remains readable in phone 3D view', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/graph?view=3d#node=education%3Agatech-ms-cs');
  await expect(page.getByRole('button', {name: '3D view', exact: true}))
    .toHaveAttribute('aria-pressed', 'true');
  const panel = page.getByRole('region', {name: 'Selected career item'});
  const title = panel.getByRole('heading', {name: 'M.S. Computer Science, Georgia Tech', exact: true});
  await title.scrollIntoViewIfNeeded();
  await expect(title).toBeVisible();
  expect(await title.evaluate(node => node.scrollWidth - node.clientWidth))
    .toBeLessThanOrEqual(1);
  const exit = page.getByRole('link', {name: 'Classic resume', exact: true});
  await exit.scrollIntoViewIfNeeded();
  await exit.click({trial: true});
});
```

This example requires working browser WebGL. A fallback-only run cannot establish that the 3D panel has been repaired; report that environment limitation explicitly.

- [ ] **Step 2: Capture the before state and run the failures.** Run `yarn build` then `yarn test:e2e tests/e2e/graph-layout.spec.ts --project=chromium`. Match the report’s overlap/landscape clipping before changing layout. Store failing screenshots as test artifacts, not new source assets.
- [ ] **Step 3: Restructure page layout within the existing components.** Put the introduction and toolbar in normal document flow. On wide screens, place the canvas and selected information in neighboring grid areas; on phones, stack the canvas and details. Permit page scrolling on short screens. Keep at least a useful 320-pixel canvas height where the viewport allows; let document scrolling provide room rather than forcing all information into one screen.
- [ ] **Step 4: Make help and legend expand in their own layout area.** They must not obscure the introduction, each other or exit links. Allow breadcrumbs and controls to wrap. Retain explicit close/toggle controls and their expanded state; remove obsolete hard-coded absolute positions and stale padding used to clear them.
- [ ] **Step 5: Bound detail reading without clipping navigation.** Wrap titles and metadata, including long achievement names. Keep detail actions in normal flow and allow the region/page to scroll. Expanded text must not extend above the page or cover the header. Preserve touch connection controls without allowing vertical scrolling to accidentally trigger a horizontal scan.
- [ ] **Step 6: Apply contrast and motion rules.** Use legible neutral-400-or-brighter informational text on the actual panel background. Prefer a sufficiently opaque information surface so readability does not depend on graph objects behind it. Under effective reduced motion, remove panel translation while preserving immediate visibility and functional state changes.
- [ ] **Step 7: Rebuild, rerun and inspect manually.** Verify help/legend/details together, both orientations, 200% text enlargement, keyboard focus and browser zoom equivalent to 320 CSS pixels. Confirm canvas resizing after disclosures open, after rotation and after switching modes. Measure small-text contrast on the real panel background.
- [ ] **Step 8: Run typechecks/lint and commit** as `fix: keep graph controls and details usable on small screens`.



## Task 9: B3 — Add direct discovery and a reliable overview action

**Findings:** Remaining F08. **Dependency:** B2.

**Files:** GraphSearch, GraphExplorer, graphReducer, ResumeGraphCanvas and graph-discovery tests.

**Interfaces:**

- Creates `GraphSearch` with props `{onSelect: (id: string) => void}`. It consumes existing `resumeGraph.nodes`; it does not duplicate graph descriptions.
- Search occupies a `search` landmark named `Career search`, with a labeled text input `Find a role, skill, or achievement` and a visible list of standard result buttons named by node label. Match normalized, case-insensitive label and description text. Show at most 10 results, the full match count, and an explicit no-results message. No custom combobox keyboard contract is introduced.
- Extends `GraphNavAction` with `{type: 'reset'}`; its reducer result is `initialGraphNavState(null)` so history, highlight and expansion reset together.
- Extends ResumeGraphCanvas props with `overviewRequest: number`. GraphExplorer increments this value on every `Show overview` action, including repeated clicks; the canvas fits the actual stage when it changes. Use zero animation duration under reduced motion.

- [ ] **Step 1: Add a direct-evidence journey.** In either mode, enter `Python`, select the exact Python result, and require its description and connections to match the existing node. Search `Georgia Tech` and require the complete education title. Search an impossible phrase and require a no-results message; clear it and recover. Verify input arrows are not intercepted by the graph application handler.

```ts
import {test, expect} from './fixtures';

test('search finds a named skill without learning graph navigation', async ({page}) => {
  await page.goto('/graph?view=list');
  const search = page.getByRole('search', {name: 'Career search'});
  await search.getByRole('textbox', {name: 'Find a role, skill, or achievement'}).fill('pYtHoN');
  await search.getByRole('button', {name: 'Python', exact: true}).click();
  const list = page.getByRole('navigation', {name: 'Career graph, list view'});
  await expect(list.getByRole('button', {name: 'Python', exact: true}))
    .toHaveAttribute('aria-current', 'true');
  await expect.poll(() => page.evaluate(() => decodeURIComponent(location.hash)))
    .toBe('#node=skill:python');
  await page.getByRole('button', {name: 'Show overview', exact: true}).click();
  await expect(list.locator('button[aria-current="true"]')).toHaveCount(0);
});
```

- [ ] **Step 2: Add an overview journey and run failures.** Select a node, follow a connection, then activate `Show overview`; require selected details and history to clear. Orbit/zoom the overview and activate it again; verify the camera refits instead of becoming a no-op. Run `yarn build` and `yarn test:e2e tests/e2e/graph-discovery.spec.ts --project=chromium`; expect missing controls initially.
- [ ] **Step 3: Implement the search component and integrate selection.** Use existing `focusNode` dispatch for results in both views. Keep result focus stable while selecting and announce the resulting selection through the existing status region. Do not silently clear the visitor’s search before they can choose another result.
- [ ] **Step 4: Implement reset and camera contracts.** Reset all navigation state together; increment the explicit overview request counter so repeated requests work. Fit nodes to the canvas container after layout is ready, accounting for its real width/height. Clean up pending animation when selection changes or the component unmounts.
- [ ] **Step 5: Reduce competing canvas labels.** Keep full labels for the selected, highlighted and hovered item. In overview show a restrained set of role/group labels; additional identities remain available through hover, selection and search. Do not remove nodes or connections merely to declutter the view.
- [ ] **Step 6: Rebuild and verify the complete flow.** Run the discovery and graph-access suites. Manually find a named skill, inspect its achievement, switch to text mode, return to 3D and recover overview, including reduced motion and a phone viewport. Confirm all former deep links still select their original node.
- [ ] **Step 7: Run typechecks/lint and commit** as `feat: add direct discovery and overview recovery to career graph`.


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


## Task 11: D1 — Ship a truthful reader before changing the producer

**Findings:** Frontend portions of F10–F12 and F14. **Dependency:** A1. This task can ship with the old producer.

**Files:** Client files, two JSON fixtures, unit/client tests from the map.

**Interfaces:** Implements `StatsSource`, `StatsObservation`, `StatsViewModel` and `normalizeStatsPayload` above. `useStats` success carries `StatsViewModel`. Change `StatCard` to accept a nullable displayed value plus explicit unavailable text; do not change unrelated general `Stat` consumers just to permit null. Sparkline accepts `StatsObservation[]` and does not connect missing points as zero.

- [ ] **Step 1: Create a small legacy fixture.** Include two daily unique visits in `uniqueVisitors: 2`, `totalViews: 10`, `lastUpdated: '2026-09-08'`, `since: '2026-09-01'`, positive September 6 views, zero September 7 views, zero September 8 views, and country requests US=12. Use only synthetic domains such as `example.com`. Include every existing top-level field.
- [ ] **Step 2: Create the v2-current fixture.** Retain those legacy fields, add schemaVersion 2, set both source statuses current with success date September 8; CloudFront coverage September 1–7, Cloudflare coverage September 2–7. Set September 6 observed views 10 and September 7 provisional views 0. Use the exact contract field names above. The v2 source establishes that zero is a measurement, unlike the ambiguous legacy fixture.
- [ ] **Step 3: Add deterministic normalization tests.** Include this core example, then tests for zero/missing distinctions, malformed dates, duplicate dates, unknown version, invalid labels, and stale aging:

```ts
import {test, expect} from '@playwright/test';
import legacy from '../fixtures/stats-v1.json';
import current from '../fixtures/stats-v2-current.json';
import {normalizeStatsPayload} from '../../src/utils/statsPayload';

test('legacy uniques are relabeled without inventing coverage', () => {
  const model = normalizeStatsPayload(legacy, '2026-09-08');
  expect(model?.dailyUniqueVisits).toBe(2);
  expect(model?.edgeSource.since).toBeNull();
  expect(model?.observations.some(point => point.date === '2026-09-08')).toBe(false);
});

test('a frozen payload eventually looks stale', () => {
  const model = normalizeStatsPayload(current, '2026-09-12');
  expect(model?.edgeSource.status).toBe('stale');
  expect(model?.documentSource.status).toBe('stale');
});
```

- [ ] **Step 4: Run the failing unit cases.** Run `yarn playwright test tests/unit/statsPayload.spec.ts --project=chromium` with A1’s existing export available. Initially expect the missing normalizer or incorrect adaptation assertions, not a fixture parsing error.
- [ ] **Step 5: Implement the client contract and loading states.** Move sanitization into the focused utility, adapt v1/v2 to the view model, and retain bounded lists/privacy rules. Remove the blanket rule that zero page views hides all statistics; valid zero is useful data. Preserve page-level loading/error/retry states and add a 10-second fetch timeout with cancellation on retry/unmount.
- [ ] **Step 6: Make measurement meanings explicit.** Use visible labels `Observed document requests`, `Daily unique visits (sum)`, and `Requests by country`. Explain that a person can count on several days, countries count requests across the measured zone, and document logs omit some client-side transitions. Show separate periods/freshness for the two sources; unavailable means unavailable, not zero.
- [ ] **Step 7: Make the chart interpretable.** Display dates and a text-accessible list/table of daily values in a native disclosure. Show provisional values distinctly and gaps as gaps. Exclude the current day. Show “No observations available for this period” when every value is missing; do not draw a flat zero line. Do not imply that all 30 days are complete merely because the job ran.
- [ ] **Step 8: Correct privacy copy.** State that the page publishes anonymous aggregates without a client-side tracking script, while operational access logs are retained. Explain the configured current-object 90-day expiration and separate version policy with a link to methodology. Avoid “No personal data” and avoid claiming raw logs were independently audited. Keep implementation detail in the methodology section, not card labels.
- [ ] **Step 9: Test presentation with intercepted payloads.** In `stats.spec.ts`, fulfill `/stats.json` with each fixture plus missing-source and malformed variants. Verify labels, separate periods, stale/unavailable text, valid zero, chart disclosure, error Retry and 320-pixel reflow. No public endpoint is mutated.
- [ ] **Step 10: Build, run focused suites/typechecks/lint and commit** as `fix: present analytics units and freshness honestly`. Deploy this reader before D2 output; it must work correctly with the current v1 file.



## Task 12: D2 — Publish source freshness and explicit daily observations

**Findings:** Producer portions of F10–F12. **Dependency:** D1 reader prepared; release order remains reader before producer.

**Files:** Lambda, new payload module, stats Terraform/workflow packaging, backend payload/source-failure tests, test requirements and analytics operations record.

**Interfaces:**

- `payload.py` exports `render_payload(items: list[dict], today: date, source_status: dict[str, dict]) -> dict`. `items` is the existing low-level DynamoDB aggregate representation; `source_status` provides the two `StatsSource` records. Output follows the v2 contract and retains legacy fields.
- The orchestrator persists day-precision source metadata under `source#cloudfront` and `source#cloudflare`. `lastSuccessfulUpdate` advances only after that source succeeds; a failed source retains its previous success/coverage and becomes stale, or unavailable without prior measurements.
- Existing daily Cloudflare items remain `cf#daily#YYYY-MM-DD`; summed uniques stay a sum. The query’s current zone scope is explicitly declared, not silently narrowed or relabeled.

- [ ] **Step 1: Establish isolated Python testing.** Use a fresh virtual environment, install boto3 for local tests, freeze that environment’s dependencies to `tests/requirements.txt`, and ignore the local environment directory. Use unittest rather than adding another test framework. Set dummy region/credentials and disable metadata lookup before importing the Lambda in tests; replace clients before exercising any orchestration.
- [ ] **Step 2: Add exact source/period test cases.** `test_payload.py` supplies low-level items for one visitor on each of two days and asserts the sum is two, country requests retain their own units, and the period starts from actual stored source dates. Assert 30 observation dates ending yesterday, no today value, null for absent days and provisional yesterday. A supplied daily item with numeric zero remains a real observed zero.

```python
from datetime import date
import unittest

from stats_aggregator.payload import render_payload


class PayloadTests(unittest.TestCase):
    def test_absent_observations_do_not_become_zero_traffic(self):
        sources = {
            "cloudfront": {
                "status": "unavailable", "since": None, "through": None,
                "lastSuccessfulUpdate": None, "scope": "site-document-requests",
            },
            "cloudflare": {
                "status": "unavailable", "since": None, "through": None,
                "lastSuccessfulUpdate": None, "scope": "zone-requests",
            },
        }
        result = render_payload([], date(2026, 9, 8), sources)
        observations = result["dailyObservations"]
        self.assertEqual(len(observations), 30)
        self.assertEqual(observations[0]["date"], "2026-08-09")
        self.assertEqual(observations[-1]["date"], "2026-09-07")
        self.assertTrue(all(point["views"] is None for point in observations))
        self.assertTrue(all(point["status"] == "missing" for point in observations))
        self.assertEqual(result["schemaVersion"], 2)
```

The pure payload module must be importable without creating AWS clients. Keep network-client creation confined to the existing orchestrator.

- [ ] **Step 3: Add source-failure tests.** In `test_source_failures.py`, simulate absent Cloudflare configuration, denied token read, HTTP timeout, API errors, empty usable results, and recovery. Existing CloudFront output must remain publishable on those Cloudflare failures with truthful source state. Test that source success does not advance on a failed query and that a genuinely fresh zero is distinct from absence.
- [ ] **Step 4: Run `python -m unittest discover -s tests/stats -p 'test_*.py' -v`.** Confirm assertions fail against existing behavior, with no AWS network calls or credential discovery.
- [ ] **Step 5: Implement payload construction and source bookkeeping.** Move pure rendering into `payload.py`. Preserve real coverage bounds and source-specific success dates; include only dates before today in observations. Mark missing dates null, yesterday provisional when measured, and older measurements observed. Keep the legacy dailySeries numeric for compatibility, derived from available observations only; the new reader uses dailyObservations.
- [ ] **Step 6: Make all Cloudflare failure boundaries recoverable.** Cover configuration, token retrieval, transport, API errors and parsing within the same source outcome. Publish CloudFront-derived data with stale/unavailable Cloudflare metadata, then preserve a clear alarm outcome when a configured source fails. Update the existing alarm description so it no longer promises partial publication after every possible kind of failure.
- [ ] **Step 7: Package the new module everywhere.** Update the Terraform bootstrap archive to contain `lambda_function.py` and `payload.py`, and the workflow’s bootstrap/code-update zip creation to include the same explicit files. Keep tests, local environments and caches out of the archive. Verify archive members and that importing the handler from an extracted archive succeeds with dummy clients.
- [ ] **Step 8: Verify compatibility and commit.** Run backend tests, the D1 client tests against generated v2 JSON, build/typechecks/lint, and Terraform formatting/validation using the existing provider lock. Commit as `feat: publish source-aware analytics observations`. Do not publish the producer ahead of the compatible reader.



## Task 13: D3 — Make new input processing recoverable and replay-safe

**Findings:** F13. **Dependency:** D2. This task also owns stats packaging/IAM changes before E4 adjusts upload metadata and E5 edits general CI.

**Files:** New ledger module, Lambda, stats Terraform/workflow, fake-service and ledger tests, analytics operations record.

**Interfaces:**

- `ledger.py` exports `apply_log_counts(client, table_name: str, log_key: str, payload_digest: str, counts: dict[str, int], remaining_ms: Callable[[], int]) -> bool`. Return true for newly completed input, false for already completed input. Raise on unresolved interruption, inconsistent input content or service failure; do not convert those into successful completion.
- Export `IngestionIncomplete` for remaining-budget exhaustion. Only the orchestrator interprets it, by preserving the last good public payload and retrying on a later invocation.
- Log identity is a SHA-256 of bucket-qualified object key; counts are already sanitized aggregate counters. Store a digest of the sorted counts and deterministic chunks of at most 90 distinct counter keys. Chunk records use `logv2#<identity>#chunk#<index>`; the final record is `logv2#<identity>#complete`. The bracket notation describes generated identifiers, not literal placeholder values.
- `log_key` is the complete bucket-qualified key. `payload_digest` is SHA-256 of UTF-8 JSON for the sanitized count mapping with sorted keys and compact separators, so the same observations produce the same digest across retries. The ledger verifies this value before applying counts.
- Each transaction updates that chunk’s counters and creates its chunk record conditionally in the same transaction. Store chunk digest and count for verification; do not rely solely on DynamoDB’s short-lived request-token deduplication. New completion/chunk records have no TTL until a separate evidence-backed retention policy can prove input cannot recur.
- Treat existing `marker#` inputs as legacy completed inputs and never replay them automatically. Advance the listing cursor only beyond complete inputs. Set Lambda reserved concurrency to 1 to keep publication from racing a second writer.

- [ ] **Step 1: Add an atomic fake and request-shape checks.** `fakes.py` stages a transaction and commits all its actions together, can fail before commit, and can commit then simulate a lost response. It records requests for assertions. Test the application’s calls and outcomes, not merely the fake’s own behavior; use boto3/botocore validation to check actual transaction request shapes.

Define the test-only `AtomicDynamo(fail_once_after_commits: int | None = None)` adapter with the boto3 low-level `get_item`, `put_item` and `transact_write_items` methods used by the ledger. Its configured failure raises `TimeoutError` once, before the transaction following that many successful commits; `aggregate_counts() -> dict[str, int]` exposes aggregate values only. Add a separate commit-then-lost-response mode for the uncertainty case. This adapter must honor conditions and atomic writes rather than blindly return success.

```python
import hashlib
import json
import unittest

from stats_aggregator.ledger import apply_log_counts
from fakes import AtomicDynamo


class LedgerTests(unittest.TestCase):
    def test_retry_after_one_chunk_matches_one_complete_processing(self):
        counts = {f"page#/synthetic-{index}": 1 for index in range(181)}
        counts.update({"total#views": 181, "daily#2026-09-07": 181})
        digest = hashlib.sha256(json.dumps(
            counts, sort_keys=True, separators=(",", ":"),
        ).encode("utf-8")).hexdigest()
        client = AtomicDynamo(fail_once_after_commits=1)
        args = (client, "test-stats", "test-logs/cloudfront-logs/synthetic.gz",
                digest, counts, lambda: 120_000)
        with self.assertRaises(TimeoutError):
            apply_log_counts(*args)
        self.assertTrue(apply_log_counts(*args))
        self.assertEqual(client.aggregate_counts(), counts)
        self.assertFalse(apply_log_counts(*args))
        self.assertEqual(client.aggregate_counts(), counts)
```

`unittest discover -s tests/stats` places that start directory on the import path for `from fakes import AtomicDynamo`. Retain the separate real-orchestrator test below; the helper test alone cannot catch premature public output.

- [ ] **Step 2: Add the recovery matrix.** In `test_ledger.py`, exercise normal processing, replay, failure before any transaction, failure between chunks, committed transaction with lost response, final-completion-record failure, insufficient remaining time, changed digest for the same input, legacy marker, and more than 180 distinct counters. After each retriable failure, rerun the same input and require final totals equal exactly one uninterrupted processing.
- [ ] **Step 3: Assert publication boundaries.** Drive the real orchestrator with fake services: if an input remains partly applied, no new `stats.json` may be written and the cursor must not skip that input. After successful retry, publish once with matching total/day/page counts. Marked zero-view days should be represented as measured zero only when input actually established that observation.
- [ ] **Step 4: Run the backend suite and confirm the current failure.** The original marker-first behavior must fail the interrupted-write case. Do not mark the regression satisfied by only testing the proposed helper outside its orchestrator.
- [ ] **Step 5: Implement bounded atomic counter application.** Parse and aggregate one input before any completion decision; sort keys deterministically; verify existing chunk records with strongly consistent reads. For a transaction failure/uncertain response, recognize success only from a matching committed record; otherwise propagate and retry later. Reject a changed digest instead of counting a modified input as another visit set.
- [ ] **Step 6: Complete and publish only at consistent boundaries.** Write the final completion record after every chunk is verified. A failure or low budget inside an input leaves no public update and no advanced cursor. Stopping between completed inputs may publish with CloudFront marked stale/catching up if more work remains. Read aggregate pages with `ConsistentRead: true` after ingestion writes complete; combined with reserved concurrency 1 and no other aggregate writers, this prevents eventual-read lag from publishing mismatched totals. Test a fake that exposes stale values to ordinary reads to catch this regression. Keep only required aggregate families in the publication scan; do not accumulate ledger records in memory as if they were metrics. A scan filter does not avoid reading ledger items: record table/scan growth, and consider a later storage-layout change only if measurements justify it.
- [ ] **Step 7: Update packaging and concurrency; verify existing permissions.** Add `ledger.py` to both bootstrap and update archives and set reserved concurrency to 1. Verify the role's existing table-scoped `PutItem`, `UpdateItem` and `GetItem` grants against the actual calls: [transaction IAM permissions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis-iam.html) follow those underlying operations. Do not invent a separate `dynamodb:TransactWriteItems` IAM action or broaden access when the current grants suffice. [AWS’s transaction reference](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html) limits one transaction to 100 actions/4 MB and gives request tokens a 10-minute window; the 90-counter-plus-record design stays below the action limit and durable records cover later retries. Check byte size before submitting as well.
- [ ] **Step 8: Verify the extracted deployment artifact.** Run all recovery tests against modules imported from an extracted zip, using fake services. Inspect a Terraform plan for only expected permission/concurrency changes; no table replacement, data reset or resource renaming is acceptable.
- [ ] **Step 9: Commit** as `fix: make analytics ingestion recoverable across interruptions`. Keep historical reconciliation and production cutover separate in D4.



## Task 14: D4 — Roll out the reader, producer and ledger without losing history

**Findings:** Completes F10–F13 operational verification. **Dependencies:** D1–D3 verified; coordinate cache metadata with E4 and release mechanics with E5.

**Files:** Update `/Users/andrew/Scripts/react-resume/docs/operations/analytics.md`; modify release configuration only if needed to preserve the ordering already specified. No blanket data rewrite.

**Interfaces:** Consumes the v2 reader, packaged producer, transaction-capable IAM, single-writer configuration and existing production counts. Produces a release record containing commit/package digest, prior payload backup location, safe rollback boundary, source coverage dates, and a finding closure decision.

- [ ] **Step 1: Record the historical baseline privately.** Save the current public payload and a secured backup/export of aggregate counters and processing metadata using existing authorized account access. Do not commit raw logs, credentials or full table exports. Compare total/day/page relationships and record discrepancies already present before the change.
- [ ] **Step 2: Reconcile only what evidence supports.** Determine which original logs still exist. Document that expired inputs cannot be reconstructed exactly. Keep legacy totals intact; if corrections to them are proposed, produce a separate before/after reconciliation artifact for owner review instead of silently adjusting them in this rollout.
- [ ] **Step 3: Deploy the compatible reader first.** Verify it against the still-existing v1 payload in production: daily-unique sum label, unknown coverage, no current-day plunge and accurate privacy text. Record the consumer commit before publishing v2.
- [ ] **Step 4: Apply the reviewed prerequisite configuration and new package.** Confirm archive membership, transaction permissions and reserved concurrency before invoking the new producer. Keep a copy of the old package for investigation, but do not treat it as a safe post-ledger rollback: old code does not understand new completion records.
- [ ] **Step 5: Verify a controlled processing run.** Run the producer through the established deployment process, inspect its aggregate-only diagnostics, and verify source-specific dates plus stable repeated invocation. Confirm new records prevent duplicate counts and public totals remain consistent after the run. Do not induce an outage or write synthetic visitor events into production.
- [ ] **Step 6: Define the safe rollback action.** If the new producer fails after ledger writes begin, pause its schedule/invocations and restore the previous public payload if necessary while preserving the ledger and counts. Repair forward or deploy a version that understands the ledger. Re-enabling marker-first code against the same inputs is not an acceptable rollback.
- [ ] **Step 7: Observe the next scheduled update.** Verify it arrives with expected source dates and no false current-day zero. Use a scheduled follow-up only if the user requests one; otherwise record the exact remaining observation rather than claiming it occurred.
- [ ] **Step 8: Commit the release record** as `docs: record analytics migration and historical limits`. Close code-level findings with their passing tests; close live behavior only after the corresponding production checks are actually complete.


## Task 15: E1 — Normalize public page URLs and provide purposeful missing-page recovery

**Finding:** F15. **Dependency:** A1 for browser tests; does not depend on the analytics producer.

**Files:** Modify main Terraform; create the extracted edge function, 404 page and two route test files from the map. Record staging and public checks in `docs/operations/delivery.md`.

**Interfaces:**

- Extract the existing CloudFront Function source into the named JavaScript file, still defining the CloudFront-required `handler(event)` entry point. Terraform loads that file as the function’s code. Node tests execute that exact file in an isolated VM context.
- `/` maps to `/index.html`; extensionless `/stats` and `/graph` map to `.html`; non-root trailing-slash paths redirect to their no-slash equivalent. Preserve the original query fields and repeated values in redirects using the CloudFront event representation.
- Static asset paths keep their extensions. Unknown paths produce a site-styled 404 with links to the résumé and contact. Origin 403/404 missing-object responses use `/404.html` with response status 404 and a short 10-second error-cache TTL.

- [ ] **Step 1: Add a route matrix against the actual edge function.** Test `/`, `/stats`, `/stats/`, `/graph`, `/graph/`, `/assets/resume.pdf`, `/_next/static/example.js`, and `/does-not-exist`. Add trailing-slash query cases with multiple values, spaces, encoded plus signs and encoded ampersands; following the redirect must preserve their meaning, not double-encode or drop them.

```js
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../../terraform/functions/rewrite-extensionless.js', import.meta.url), 'utf8');

test('the slash redirect preserves repeated query values', () => {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  const result = context.handler({request: {
    method: 'GET', uri: '/graph/', headers: {}, cookies: {},
    querystring: {view: {value: 'list'}, tag: {
      value: 'skills', multiValue: [{value: 'skills'}, {value: 'roles'}],
    }},
  }});
  assert.ok([301, 308].includes(result.statusCode));
  const target = new URL(result.headers.location.value, 'https://andrewmalvani.com');
  assert.equal(target.pathname, '/graph');
  assert.equal(target.searchParams.get('view'), 'list');
  assert.deepEqual(target.searchParams.getAll('tag'), ['skills', 'roles']);
});
```

Use AWS's [event structure](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html) for the encoded-value cases and validate those event fixtures against an actual CloudFront test invocation before production rollout. VM tests do not establish the deployed runtime's capabilities by themselves.

- [ ] **Step 2: Add the missing-page browser check.** In the static-export preview, an unknown page must return 404, show `Page not found`, and expose ordinary links to the homepage and contact. The page must fit 320 pixels and have a clear page title and non-indexing metadata. No screenshots are needed to test exact prose beyond its navigational purpose.
- [ ] **Step 3: Run the current failures.** Run `node --test tests/infra/edge-routing.test.mjs` and, after `yarn build`, `yarn test:e2e tests/e2e/not-found.spec.ts --project=chromium`. The edge behavior must be tested separately because the local preview server cannot prove CloudFront configuration.
- [ ] **Step 4: Implement the routing contract.** Preserve static file addresses, normalize non-root trailing slashes consistently and maintain safe query serialization. Build the 404 with the existing Page/typography patterns and useful navigation. Configure the distribution’s 403 and 404 response mappings without changing successful-route behavior.
- [ ] **Step 5: Validate the export and infrastructure.** Rebuild; confirm `out/404.html`, `out/stats.html` and `out/graph.html` exist. Run tests, typechecks/lint, `terraform -chdir=terraform fmt -check`, then isolated `terraform -chdir=terraform init -backend=false -lockfile=readonly` and `terraform -chdir=terraform validate`.
- [ ] **Step 6: Review and stage delivery.** Inspect the real Terraform plan using existing authorized variables; require only the function/error-response changes for this task. Make the new `404.html` available before enabling its error response. Do not introduce a window in which the recovery document itself is absent.
- [ ] **Step 7: Verify public responses after rollout.** Use `curl -I`/browser navigation on both slash variants and a unique nonexistent path. Require working pages or one purposeful redirect, a true 404 for unknown content, and no XML access-denied screen. Check a known asset as a guard against a broader origin-permission problem being disguised as a 404.
- [ ] **Step 8: Commit code and record results** as `fix: normalize public routes and serve useful 404 pages`.



## Task 16: E2 — Stop log destinations from logging themselves

**Finding:** F18; verify F14 methodology remains accurate. **Dependency:** None on application code.

**Files:** Self-logging configuration and delivery operations record.

**Interfaces:** Retain the existing log bucket, CloudFront log destination, website-access log destination and 90-day current-object lifecycle. Only the bucket’s logging-to-itself setting is removed. AWS confirms the problem in its [logging-destination guidance](https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-server-access-logging.html).

- [ ] **Step 1: Record current logging relationships.** Inspect the current configured source/destination pairs and, with authorized read-only access, verify the destination bucket’s logging setting. Record aggregate object counts/volume by prefix; do not download or publish raw records.
- [ ] **Step 2: Prepare removal of the self-logging configuration.** Preserve the bucket and all data/lifecycle resources. A Terraform plan showing bucket replacement, deletion or unrelated retention changes is a failure for this task.
- [ ] **Step 3: Run formatting/validation and review the real plan.** The expected change disables one logging relationship and leaves normal operational log collection intact.
- [ ] **Step 4: Apply through the normal reviewed execution path and verify.** Confirm the destination bucket no longer logs to itself, while the original website/CloudFront sources still deliver logs. Existing queued deliveries may arrive briefly; do not interpret that alone as a failed change.
- [ ] **Step 5: Record follow-up evidence.** Compare subsequent prefix growth with the initial snapshot and document the observation window. If enough time has not elapsed, record that operational observation as remaining; do not claim a measured savings figure.
- [ ] **Step 6: Commit** as `fix: stop recursive access logging`, including the delivery record and any corrected methodology wording needed by D1.



## Task 17: E3 — Verify and correct the transport path as a coordinated change

**Finding:** F19. **Dependency:** Read-only AWS/Cloudflare account access; no speculative account mutation.

**Files:** Delivery behavior/comments, public output definitions where useful, delivery operations record.

**Interfaces:** Produces a verified delivery diagram and mode record. Resolve distribution IDs through Terraform’s known resources or a read-only `aws cloudfront list-distributions` query restricted to IDs, domain names and aliases. Resolve Cloudflare settings through the connected account/dashboard; credentials never enter source or output artifacts.

- [ ] **Step 1: Inspect the actual configuration.** Record Cloudflare SSL mode, proxy status, hostname coverage, origin hostname, CloudFront aliases/certificate and current redirect behavior. Check public HTTPS pages plus the HTTPS origin connection with correct host/SNI. Do not infer the current mode solely from repository comments.
- [ ] **Step 2: Choose the explicit branch.** If Full (strict) is already active and origin validation succeeds, retain it and correct stale comments. If Flexible is active, prepare Full (strict) only after verifying an unexpired certificate covers the origin hostname and the HTTPS origin is reachable. If origin validation fails, identify and repair that exact certificate/hostname/reachability prerequisite before changing the mode; leave the working configuration in place meanwhile. See [Cloudflare’s Full (strict) requirements](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/).
- [ ] **Step 3: Prepare a bounded rollout and rollback record.** Save the nonsecret previous settings and define success as working homepage/graph/stats/assets with HTTPS on each hop and no redirect loop. A rollback restores the previous complete configuration, not just one redirect flag.
- [ ] **Step 4: Perform the mode transition under execution authorization.** For Flexible, move Cloudflare to the verified HTTPS origin mode first and verify traffic before tightening the CloudFront viewer policy. If redirect loops or certificate errors occur, restore the recorded coordinated settings and investigate the specific failing hop.
- [ ] **Step 5: Verify all entry paths.** Inspect HTTP-to-HTTPS behavior, the apex and any configured aliases, deep links, PDF, stats JSON and static chunks. Confirm certificate validation remains enabled; do not “verify” success by ignoring certificate errors.
- [ ] **Step 6: Update Terraform/documentation and commit** as `fix: verify encrypted site delivery end to end`. If external access prevents the live checks, retain an explicit F19 dependency with the verified code/configuration work and the exact unperformed check.



## Task 18: E4 — Establish intentional static caching without stale releases

**Finding:** F28. **Dependencies:** E3 transport known; D3 producer/workflow changes merged before editing their cache metadata.

**Files:** CloudFront cache behaviors, upload metadata in workflow, stats object cache metadata, delivery operations record.

**Interfaces:**

- HTML, PDF and other stable-address public content: browser max-age 60 seconds and shared-cache max-age 300 seconds; minimum cache TTL 0 so explicit no-cache responses can still work.
- Content-hashed `/_next/static/*`: browser/shared max-age 31,536,000 seconds and immutable; no cookies, arbitrary viewer headers or tracking queries in the cache key.
- `stats.json`: browser max-age 60 seconds, shared max-age 300 seconds, independently published by Lambda. Preserve its ownership/exclusion in frontend deployment.
- New cache policies must agree with origin response metadata; an origin’s one-hour browser max-age is not fixed merely by changing edge TTLs. Compression support remains enabled where appropriate.

- [ ] **Step 1: Measure current behavior.** Record cache-control, Age and available cache-status headers for HTML, a hashed chunk, PDF and stats JSON across repeat requests. Inspect relevant Cloudflare cache rules as well. Report latency only as a small sample, not field Core Web Vitals or a guaranteed speedup.
- [ ] **Step 2: Prepare policies for the three classes above.** Replace the all-path CachingDisabled arrangement with deliberate path behaviors. Ignore campaign query values for these static objects without discarding query values used by client navigation. Keep origin identity/permissions intact.
- [ ] **Step 3: Align object metadata.** Update frontend uploads and the stats producer to the class-specific cache controls. Existing unchanged S3 objects may retain old metadata, so plan a scoped metadata refresh for the affected known keys; do not rewrite unrelated bucket contents.
- [ ] **Step 4: Verify a local release manifest and reviewed Terraform plan.** Check that every HTML-referenced hashed asset is included. Confirm the plan changes only caching/metadata behavior and does not replace the distribution or bucket. Test that dynamic `stats.json` remains excluded from frontend sync/deletion.
- [ ] **Step 5: Deploy and verify repeat requests plus an update.** Check the public headers/cache state, then deploy a controlled content update through the usual process and confirm it becomes visible within the declared freshness window/invalidation policy. Verify the PDF and separately refreshed stats too.
- [ ] **Step 6: Record actual measurements and commit** as `perf: define cache behavior for static site assets`. Preserve prior hashed assets for older open tabs; E5 formalizes that release ordering. Do not apply an age-only lifecycle rule that can delete an old-but-still-referenced hash.



## Task 19: E5 — Add nonmutating PR checks and guard deployment continuity

**Finding:** F29. **Dependencies:** A1 tooling and all relevant tests; D3 packaging changes merged. This task follows E4’s cache contract.

**Files:** New checks workflow, existing deployment workflow, shared scripts only as needed for the defined commands.

**Interfaces:**

- PR checks run with `contents: read`, without cloud secrets, state refresh, infrastructure apply or contact traffic. Reuse the same verification entry points on main.
- Frontend build output is produced once per checked commit and reused for browser tests and deployment. Do not rebuild altered source after review.
- Stats bootstrap/update archives contain `lambda_function.py`, `payload.py`, `ledger.py`; the contact archive retains only its own handler. D3 remains the source of this packaging contract.
- Upload referenced hashed assets before HTML; retain previous hashes so already-open tabs can finish navigation. Keep `stats.json` outside frontend ownership. Do not use blanket deletion to clean unrelated generated data.

- [ ] **Step 1: Add checks.yml for pull requests.** Use Node 22/Yarn Classic and Python 3.12, install locked dependencies, run both typechecks and nonmutating lint, install Chromium, build once, and run the browser/unit suites on the generated export. Install `tests/requirements.txt` and run Python tests with dummy credentials/metadata lookup disabled. Run the Node edge-function tests and Terraform formatting/validation with backend disabled; no real plan/apply is part of PR checks.
- [ ] **Step 2: Make check failures actionable.** Upload failed browser traces/screenshots and concise test logs with short retention; no raw contact or cloud data. Missing WebGL support must be visible as an environment failure or documented manual requirement, not silently counted as graph verification.
- [ ] **Step 3: Verify checks do not modify reviewed source.** Snapshot tracked source state before checks and compare afterward; ignore intended untracked test/build outputs. Confirm `lint` and typechecks no longer run formatting/autofixing. Review any external branch protection separately rather than claim this workflow automatically configures it.
- [ ] **Step 4: Integrate the same checks before main deployment.** Ensure deploy jobs depend on the passing checked artifact. Preserve OIDC only where deployment requires it. Keep provider locks and existing secret injection, and coordinate the new archive members from D3 rather than overwrite its changes.
- [ ] **Step 5: Implement safe asset ordering.** Upload content-hashed assets first with immutable metadata and without deleting previous hashes; then upload stable-address files with their short freshness policy. Explicitly exclude stats JSON. Record removed fixed-address files for scoped cleanup rather than deleting unknown bucket contents. Use the existing invalidation only after the new referenced assets are available.
- [ ] **Step 6: Verify behavior, not just workflow syntax.** Exercise a PR run without cloud secrets, a known failing regression in a temporary test branch, and a passing run. In a controlled release, keep an older tab open across deployment and verify it can still load its referenced assets; verify a fresh tab receives the new page.
- [ ] **Step 7: Commit** as `ci: verify user journeys before deploying checked artifacts`. Keep any repository-setting change distinct from merely adding workflow files.



## Task 20: E6 — Document operation and close each finding with evidence

**Finding:** F30; final cross-plan closure. **Dependency:** All completed implementation tasks and their evidence. Owner/external dependencies may be recorded as still open without blocking documentation.

**Files:** README, historical review, new remediation status file, delivery and analytics operation records. Read [LICENSE](/Users/andrew/Scripts/react-resume/LICENSE:1) and preserve the existing MIT notice and attribution.

**Interfaces:** The status file contains one row per F01–F30: status (`open`, `implemented`, `verified`, or `blocked`), owning task, commit, acceptance evidence, and any exact remaining dependency. `verified` means the required checks actually ran; a local implementation is not automatically live verification.

- [ ] **Step 1: Rewrite repository orientation.** Explain the homepage/graph/stats roles, prerequisites, locked install, local development, production build/preview, tests and lint/format differences. Explain that `stats.json` is published separately and that local missing data is expected unless tests provide fixtures.
- [ ] **Step 2: Correct licensing and historical context.** State that the project uses the existing MIT license and retain upstream attribution. Mark the older design review as historical with links to the newer report and status table; do not erase its findings or retroactively claim completion.
- [ ] **Step 3: Document operational boundaries.** Summarize contact test isolation, analytics source units/freshness, ledger-aware rollback, delivery/cache settings and how to inspect failures. Keep credentials/raw data out of examples. Record the actual discovered account-dependent configuration, not assumptions copied from the old report.
- [ ] **Step 4: Run the integrated acceptance pass.** Build the reviewed commit, run typechecks/lint/browser/unit/backend/edge tests once, and inspect desktop plus 320/390-pixel and landscape flows. Verify PDF facts against the approved record. Recheck every High finding and all affected cross-page navigation.
- [ ] **Step 5: Complete the finding ledger.** Map every report acceptance criterion to its task result. Leave owner facts, credential evidence, scheduled-update observations or unavailable account checks open with a precise dependency; do not downgrade severity just to close them.
- [ ] **Step 6: Commit documentation** as `docs: document verified UX remediation and operations`. Deliver the status ledger plus a concise summary of what changed, how it was verified, and what remains externally dependent.

## Execution verification commands

These commands assume the earlier tasks have established their declared scripts and test files, and run from the execution checkout:

```sh
yarn typecheck
yarn typecheck:tests
yarn lint
yarn build
yarn test:e2e --project=chromium
python -m unittest discover -s tests/stats -p 'test_*.py' -v
node --test tests/infra/edge-routing.test.mjs
terraform -chdir=terraform fmt -check
terraform -chdir=terraform init -backend=false -lockfile=readonly
terraform -chdir=terraform validate
git diff --check
```

Initialization/validation belongs in an isolated execution workspace. A real infrastructure plan uses the normal authorized backend and variables; it must not be confused with backend-disabled PR validation. Public verification happens after the associated release, and must be reported separately from local pass results.

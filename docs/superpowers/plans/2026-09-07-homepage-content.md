# Homepage and Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the résumé readable on phones, its actions predictable, and its professional evidence consistent and persuasive.

**Architecture:** Improve the existing homepage components and shared data without replacing the design system. Introduce browser verification with the first substantive fix, keep public assets correctly typed, and use native project disclosures rather than adding another application or CMS. A shared motion-preference hook serves the homepage and graph.

**Tech Stack:** Next.js Pages Router static export, React 18, TypeScript, Tailwind, existing image assets; Playwright Test and `serve` as development-only dependencies.

**Spec:** [Quality report](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07.md), F01, F04, F05, F16, F17, F20–F27, F29. [Master plan](/Users/andrew/Scripts/react-resume/docs/superpowers/plans/2026-09-07-design-ux-remediation.md).

## Global Constraints

- “No architectural rewrite is warranted by the reviewed evidence.”
- “Each section contributes something distinct.”
- Preserve dark/orange identity, current primary actions, direct email and the printable one-page résumé.
- Use existing facts until owner evidence permits changes. Do not invent accomplishments, certification status, residence or project ownership.
- Keep all application changes within the existing major framework versions. Pin added development dependencies in the lockfile.
- Test code and commands below are verification material, not fix implementations. Pure editorial/style changes receive visual/content checks instead of artificial unit tests.

---

## File map

| Responsibility | Files |
|---|---|
| Build and browser verification | Modify `/Users/andrew/Scripts/react-resume/package.json`, `yarn.lock`, `.gitignore`; create `/Users/andrew/Scripts/react-resume/playwright.config.ts`, `tsconfig.tests.json`, and `/Users/andrew/Scripts/react-resume/tests/e2e/fixtures.ts` |
| Responsive homepage and reading | Modify [Hero](/Users/andrew/Scripts/react-resume/src/components/Sections/Hero.tsx:24), [TimelineItem](/Users/andrew/Scripts/react-resume/src/components/Sections/Resume/TimelineItem.tsx:12), [CertificationItem](/Users/andrew/Scripts/react-resume/src/components/Sections/Resume/CertificationItem.tsx:33) |
| Actions, assets and metadata | Modify [data](/Users/andrew/Scripts/react-resume/src/data/data.tsx:65), [dataDef](/Users/andrew/Scripts/react-resume/src/data/dataDef.ts:1), [image declarations](/Users/andrew/Scripts/react-resume/src/types.d.ts:1), [Footer](/Users/andrew/Scripts/react-resume/src/components/Sections/Footer.tsx:1), [Page](/Users/andrew/Scripts/react-resume/src/components/Layout/Page.tsx:36), [graph page](/Users/andrew/Scripts/react-resume/src/pages/graph.tsx:49) |
| Fact record and document source | Create `/Users/andrew/Scripts/react-resume/docs/content/professional-facts.md` and `/Users/andrew/Scripts/react-resume/docs/content/resume-source.md`; modify [siteConfig](/Users/andrew/Scripts/react-resume/src/data/siteConfig.ts:1), [PDF](/Users/andrew/Scripts/react-resume/public/assets/resume.pdf), [Skills](/Users/andrew/Scripts/react-resume/src/components/Sections/Resume/Skills.tsx:29) |
| Project evidence | Create `/Users/andrew/Scripts/react-resume/docs/content/project-evidence.md`; modify [Portfolio](/Users/andrew/Scripts/react-resume/src/components/Sections/Portfolio.tsx:1), shared project data and existing selected project images |
| Shared motion | Create `/Users/andrew/Scripts/react-resume/src/hooks/useReducedMotion.ts`; modify [Header](/Users/andrew/Scripts/react-resume/src/components/Sections/Header.tsx:1), [ParticleField](/Users/andrew/Scripts/react-resume/src/components/ParticleField.tsx:1), [Reveal](/Users/andrew/Scripts/react-resume/src/components/Reveal.tsx:1) |

Paths named without a full prefix in the first table row are in `/Users/andrew/Scripts/react-resume/`. All commands run from the execution checkout’s repository root, not the original checkout when using a worktree.

## Task A1: Repair mobile reflow and establish browser regression verification

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

## Task A2: Make destinations, document actions and metadata dependable

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

## Task A3: Reconcile professional facts, credentials and skill language

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

## Task A4: Present relevant, substantiated project evidence

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

## Task A5: Apply motion preferences consistently

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

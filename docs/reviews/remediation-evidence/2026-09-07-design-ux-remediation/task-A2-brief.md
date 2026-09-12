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




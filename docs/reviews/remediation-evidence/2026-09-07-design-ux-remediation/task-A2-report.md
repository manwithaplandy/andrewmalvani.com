# Task A2 implementation report

## Status

DONE

## Implemented

- Repaired the architecture card destination at its data source by using the imported static image's `.src` URL. The link remains a string and now points to the generated local WebP artifact.
- Replaced the misleading raster module declarations with `StaticImageData` declarations for JPG, WebP, and PNG while retaining string declarations for SVG and both video formats. `Hero.imageSrc`, `About.profileImageSrc`, portfolio images, and certification images accept `StaticImageData | string`.
- Named both document actions `Download résumé PDF`, retained `/assets/resume.pdf`, and set `download="Andrew-Malvani-Resume.pdf"` on the homepage and graph actions.
- Renamed the header's in-page résumé navigation to `Experience` while retaining `/#resume`.
- Added the shared `#top` page anchor and changed the footer control to the route-local `#top` destination with the accessible name `Back to top`.
- Built canonical and `og:url` metadata from `router.pathname`, excluding query and fragment state while retaining `/` for the homepage and distinct `/graph` and `/stats` identities. Existing route titles, descriptions, and preview metadata remain unchanged.
- Added `tests/e2e/navigation.spec.ts` and updated the existing graph-access assertion for the explicit PDF action name.

## TDD evidence

All commands used Node 22 with a clean environment:

```text
env -u NO_COLOR PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH PREFIX=/private/tmp/react-resume-prefix YARN_CACHE_FOLDER=/private/tmp/react-resume-yarn-cache
```

### RED

Pre-change production build:

```text
yarn build
```

Result: exit 0; Next.js compiled, generated all five static pages, and completed sitemap generation (`Done in 9.20s`). This established a working baseline before the behavioral tests.

Pre-change regression command:

```text
yarn test:e2e tests/e2e/navigation.spec.ts --project=chromium
```

Result: **7 failed**. The failures matched the intended missing behavior:

- Homepage canonical received `https://andrewmalvani.com/?utm_source=review#portfolio` instead of `https://andrewmalvani.com/`.
- Graph canonical received `https://andrewmalvani.com/graph?view=list#node=skill%3Apython` instead of `https://andrewmalvani.com/graph`.
- Architecture href received `[object Object]`.
- `Experience` and both `Download résumé PDF` actions were absent.
- `Back to top` was absent on homepage and stats.

The sandboxed first attempt could not bind `127.0.0.1:3100` (`EPERM`). The same command was rerun with authorized local-server escalation; no application or tooling workaround was introduced.

### GREEN

Final focused command after formatting:

```text
yarn test:e2e tests/e2e/navigation.spec.ts --project=chromium
```

Result: **7 passed (7.5s)**, `Done in 8.03s`.

Final combined regression command:

```text
yarn test:e2e tests/e2e/navigation.spec.ts tests/e2e/homepage.spec.ts tests/e2e/graph-access.spec.ts --project=chromium
```

Result: **33 passed (42.5s)**, `Done in 43.06s`: 22 preserved graph-access cases, four A1 homepage/reflow cases, and seven A2 navigation cases.

## Browser and generated-export verification

- `/?utm_source=review#portfolio` exposes homepage canonical and `og:url` values without campaign or section state.
- `/graph?view=list#node=skill%3Apython` retains query/hash navigation while exposing the `/graph` page identity.
- The architecture href stays on `http://127.0.0.1:3100`, returns HTTP 200 with an image content type, opens in a browser popup, and renders a visible full image.
- Homepage and graph PDF controls both expose the exact download name and each emits a successful browser download event.
- The homepage header exposes `Experience` at the unchanged `/#resume` destination.
- The homepage and stats footer controls expose `Back to top`, preserve their current route, target `#top`, and return the viewport to `scrollY <= 1`.
- The 320px, 390px, 430px, and 200%-text homepage checks still pass with the longer download label.
- All graph text/3D, malformed-link, storage-denial, fallback, history, selection, and focus regressions still pass.

Playwright reports the served response basename (`resume.pdf`) from `suggestedFilename()` even when the exact `download="Andrew-Malvani-Resume.pdf"` attribute is present. The permanent checks therefore assert the required attribute separately and verify that the real download event finishes successfully.

## Final verification

- `yarn build` under Node 22: exit 0; compile, static export, and sitemap complete (`Done in 9.02s`).
- `yarn typecheck:tests`: exit 0 (`Done in 1.09s` after final formatting).
- `yarn lint`: exit 0, zero warnings/errors (`Done in 2.00s`).
- Scoped `yarn prettier --check ...`: all matched files use Prettier style.
- `git diff --check`: exit 0.
- Focused A2 browser suite: 7/7 passing after formatting.
- Combined A1/B1/A2 browser suite: 33/33 passing.

## Files changed

- `src/components/Layout/Page.tsx`
- `src/components/Sections/Footer.tsx`
- `src/components/Sections/Header.tsx`
- `src/data/data.tsx`
- `src/data/dataDef.ts`
- `src/pages/graph.tsx`
- `src/types.d.ts`
- `tests/e2e/graph-access.spec.ts`
- `tests/e2e/navigation.spec.ts`

## Self-review

- Re-read every A2 step and checked it against the final diff and browser evidence.
- Confirmed the implementation uses no unchecked casts, keeps link destinations typed as strings, and retains the SVG/video declarations.
- Confirmed the page wrapper anchor does not alter the route-specific page content, the footer control stays on the current route, and graph access remains intact.
- Confirmed canonical normalization uses only the route pathname and does not collapse graph or stats into the homepage.
- Confirmed no factual content, graph data/layout, shared motion behavior, dependencies, framework versions, external destinations, or cloud settings changed.
- The scoped Prettier check initially found the new test file; formatted it, reran the check, test typecheck, and focused browser suite successfully.
- Reviewed the final scoped diff and found no unrelated edits.

## Concerns

None unresolved. No push or deployment was performed.

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




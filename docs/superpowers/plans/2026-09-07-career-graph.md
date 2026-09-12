# Career Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the career graph accessible by keyboard, usable on small screens, and efficient for finding a specific skill or achievement.

**Architecture:** Preserve the existing graph data and shared selection reducer. Render an explicitly selected text or 3D experience, give page navigation and controls normal layout space, and add a small direct-search surface plus an overview action. Keep the expensive canvas dynamically imported.

**Tech Stack:** Existing React, TypeScript, Headless UI, react-force-graph-3d/Three.js and Tailwind; A1’s Playwright fixture.

**Spec:** [Quality report](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07.md), F02, F03, F08, F09 and graph portions of F17/F27. [Master plan](/Users/andrew/Scripts/react-resume/docs/superpowers/plans/2026-09-07-design-ux-remediation.md).

## Global Constraints

- “Preserve access to the graph’s complete information.”
- Retain all existing node IDs, connections, valid deep links, PDF and conventional résumé access, reduced-motion behavior and graphics fallback.
- Never keep a visually clipped interactive list in the tab order. Do not remove the text alternative to hide the accessibility problem.
- Treat search, text view and orientation recovery as local functions; no search service or new graph library.
- Use A1’s test fixture and A5’s motion hook. Do not reinitialize dependencies or create a second shared motion hook.
- This plan specifies behaviors and contracts without fix-code snippets.

---

## File map

| Responsibility | Files |
|---|---|
| Page frame and graph introduction | Modify [graph page](/Users/andrew/Scripts/react-resume/src/pages/graph.tsx:24); A3 owns factual sentence changes |
| Mode, hash, controls and announcements | Modify [GraphExplorer](/Users/andrew/Scripts/react-resume/src/components/Graph/GraphExplorer.tsx:1) |
| Visible text rendering | Modify [GraphListFallback](/Users/andrew/Scripts/react-resume/src/components/Graph/GraphListFallback.tsx:1) |
| Selected information | Modify [FocusPanel](/Users/andrew/Scripts/react-resume/src/components/Graph/FocusPanel.tsx:1) |
| Drawing and camera | Modify [ResumeGraphCanvas](/Users/andrew/Scripts/react-resume/src/components/Graph/ResumeGraphCanvas.tsx:397) |
| Selection reset | Modify [graphReducer](/Users/andrew/Scripts/react-resume/src/components/Graph/graphReducer.ts:1) |
| Focused search component | Create `/Users/andrew/Scripts/react-resume/src/components/Graph/GraphSearch.tsx` |
| Regression cases | Create `/Users/andrew/Scripts/react-resume/tests/e2e/graph-access.spec.ts`, `graph-layout.spec.ts`, and `graph-discovery.spec.ts` under that same test directory |

## Task B1: Expose text mode and recover from invalid browser state

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

## Task B2: Give graph navigation, help and details independent layout space

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

## Task B3: Add direct discovery and a reliable overview action

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

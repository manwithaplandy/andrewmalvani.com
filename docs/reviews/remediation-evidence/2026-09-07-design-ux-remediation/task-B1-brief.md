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




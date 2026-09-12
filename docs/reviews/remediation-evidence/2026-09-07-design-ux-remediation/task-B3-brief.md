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



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



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




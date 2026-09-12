# D1 implementation report — truthful analytics reader

Status: DONE

Base: `326be38`

## Result

The static client now reads both the existing unversioned payload and the source-aware v2 contract. It preserves measured zero, represents unavailable and missing measurements explicitly, ages independently reported sources after two UTC calendar days, and rejects malformed or unknown payloads without guessing.

The page uses the required labels:

- `Observed document requests`
- `Daily unique visits (sum)`
- `Requests by country`

It shows CloudFront and Cloudflare periods, freshness, and last successful update separately. The explanatory copy states that document logs omit some client-side transitions, one person can count on several days in the daily-unique sum, and country counts cover requests across the measured Cloudflare zone.

## Implementation

- Added `StatsSource`, `StatsObservation`, and the exact normalized `StatsViewModel` fields in `src/data/dataDef.ts`.
- Added `src/utils/statsPayload.ts` with real UTC-calendar validation, finite nonnegative bounded counts, bounded/privacy-filtered public lists, ascending unique observation validation, explicit v1 adaptation, v2 source validation, current-day exclusion, and deterministic stale aging from the supplied `today`.
- Preserved a legacy document total of zero, while treating legacy zero daily uniques and daily series points as unavailable/missing. V2 zero remains a measured value when its source establishes availability.
- Updated `useStats` so success carries `StatsViewModel`, removed the blanket total-zero empty state, and added a 10-second `AbortController` timeout with cleanup on retry and unmount.
- Changed only the stats-specific `StatCard` interface to accept `number | null` plus explicit unavailable text. The unrelated general `Stat` interface and consumers remain unchanged.
- Reworked the chart around `StatsObservation[]`. Missing days split the SVG path rather than becoming zero; provisional data uses a dashed segment and outlined point. The visible date range and provisional-day text accompany a native `details` disclosure containing a semantic table. An all-missing period renders exactly `No observations available for this period`.
- Corrected the privacy/methodology copy. It describes anonymous aggregates without a client-side tracker, acknowledges retained operational logs, states the configured 90-day current-object expiration and 30-day noncurrent-version expiration from the time a version becomes noncurrent, and explicitly avoids presenting policy as an audit of deletion timing.
- Added synthetic v1/v2 fixtures, eight deterministic normalizer cases, and eight browser cases. All browser stats requests are intercepted by page fixtures; the shared fixture blocks every non-local HTTP request.

## TDD evidence

### RED — deterministic normalization

Command:

`yarn playwright test tests/unit/statsPayload.spec.ts --project=chromium`

Initial result: exit 1. Playwright reported `Cannot find module '../../src/utils/statsPayload'` at `tests/unit/statsPayload.spec.ts:3`; the normalizer did not exist.

### GREEN — deterministic normalization

Same command after the focused implementation: `8 passed (1.3s)`.

Coverage includes v1 adaptation, measured-zero versus missing, invalid required/optional dates, duplicate and unsorted observations, unknown schema versions, unsafe labels and counts, array bounds, and stale aging.

### RED — intercepted presentation

Command:

`yarn playwright test tests/e2e/stats.spec.ts --project=chromium`

Against the pre-D1 export: `6 failed`. Failures were the new required labels, separate periods/staleness, measured-zero/unavailable treatment, disclosure semantics, real-calendar date validation/Retry, and 320 presentation. The malformed-date case also established that the old regex accepted `2026-02-30`.

### GREEN — focused client behavior

Command:

`yarn playwright test tests/unit/statsPayload.spec.ts tests/e2e/stats.spec.ts --project=chromium`

Result after the functional implementation: 14 passed and two assertion-level mismatches. The application behavior was visible, but the test expected CSS-capitalized status text as DOM text and counted unrelated icon paths. Rendering the status text with its actual accessible capitalization and scoping the path locator corrected both.

The next combined run passed 15/16, including all eight unit cases, all six requested presentation cases, and the real 10-second timeout/retry. The remaining assertion read the request signal before React effect cleanup completed. It was changed to poll the same native `AbortSignal` captured from the `/stats.json` fetch, and the narrow SPA test then passed `1 passed (3.1s)` with a same-document marker and the associated signal aborted.

After the mobile table correction described below, the legacy and 320 cases passed; the v2 disclosure passed `1 passed (2.2s)` after its row locator was scoped through the full accessible date label. Suites whose source behavior was unchanged were not rerun solely to produce a newer aggregate count.

No request reached a public analytics endpoint, and no public file or cloud setting was changed.

## Build and static checks

- Final `yarn build`: passed; Next.js compiled and statically generated all five pages. `/stats` is 8.17 kB with 98.8 kB first-load JavaScript.
- Final `yarn lint`: passed with zero warnings.
- Final `yarn typecheck:tests`: passed.
- The final build includes the source TypeScript compilation and Next.js lint/type validation.
- `git diff --check`: passed.

All commands used Node 22.16.0 with `env -u NO_COLOR`, `PREFIX=/private/tmp/react-resume-prefix`, and `YARN_CACHE_FOLDER=/private/tmp/react-resume-yarn-cache` as specified in context.

## Browser and visual evidence

The capture script fixes the browser calendar at `2026-09-08T12:00:00Z` while deriving `Date.now()` from elapsed real time, so request timers continue advancing. The stale-aging browser case separately fixes the calendar at September 12 while serving the untouched September 8 fixture.

Synthetic 320-pixel evidence:

- `evidence/d1-current-320.png`: current v2 periods, visible dates, a measured provisional zero, and path gaps.
- `evidence/d1-current-disclosure-320.png`: complete native disclosure with all 30 Date/Requests/Status rows.
- `evidence/d1-zero-unavailable-320.png`: valid document zero, unavailable edge total/countries, and the exact all-missing chart state.
- `evidence/d1-stale-320.png`: separately stale source labels.
- `evidence/d1-error-320.png`: malformed payload error with Retry.
- `evidence/d1-rendered-evidence.json`: fixed-calendar, traffic-isolation, viewport, and rendered contrast results.

The first disclosure capture exposed a clipped Status column inside the card at 320 pixels. Compact visible dates now use `Sep 7, 2026`, each date cell retains its full `September 7, 2026` accessible name, and the browser asserts that the disclosure section has no horizontal overflow. The regenerated screenshot shows every column and full status value.

Measured informational-text contrast against actual rendered backgrounds:

| Sample | Foreground | Background | Size | Opacity | Ratio |
|---|---|---|---:|---:|---:|
| Source coverage caption | `rgb(163, 163, 163)` | `rgb(23, 23, 23)` | 12 px | 1 | 7.11:1 |
| Observation date range | `rgb(163, 163, 163)` | `rgb(23, 23, 23)` | 12 px | 1 | 7.11:1 |
| Disclosure summary | `rgb(253, 186, 116)` | `rgb(23, 23, 23)` | 14 px | 1 | 10.63:1 |
| Methodology text | `rgb(163, 163, 163)` | `rgb(10, 10, 10)` | 14 px | 1 | 7.85:1 |

Browser semantics establish the native disclosure, table headers/cells, complete dates, values and status names. OS screen-reader speech was unavailable and was not claimed as manual speech evidence.

## Self-review and concerns

- The v1 path remains deliberately uncertain: document freshness is unknown, the Cloudflare coverage period is not invented, and legacy zero daily values are disclosed as potentially missing.
- Source success is never inferred across providers. Invalid source metadata degrades only that source and its measurement to unavailable.
- The chart keeps missing calendar positions in the horizontal scale and breaks paths at each gap; a provisional continuation remains visually distinct through dash pattern, point shape, visible prose, and table status.
- The retention statement is limited to the controller-verified configured lifecycle. It makes no raw-data audit or exact-deletion guarantee.
- The static reader is ready before the v2 producer. Production will continue to exercise the v1 adaptation until D2 publishes source-aware data.

No implementation concerns remain for D1. Deployment and producer changes are outside this task.

## Fix round 1 — privacy threshold and sparse calendar geometry

Review base: `f371c0b`

### Changes

- `sanitizeList` now keeps only valid named buckets of at least five. Valid named counts from zero through four are summed into a single `Other` bucket, and a preexisting `Other` value joins that sum. The aggregate is clamped to the existing 1,000,000,000 maximum. If `Other` is present, at most five named buckets precede it, preserving the six-row public bound.
- The normalizer test covers named values at four and five, a preexisting `Other` bucket, aggregation across all three public list types, and saturation at the count maximum. The existing list-bound test now uses values that legitimately meet the publication threshold.
- Sparkline x coordinates now derive from UTC-day offsets between the first and last supplied observation. Missing rows and omitted calendar days both break line continuity. The accessible missing count includes absent calendar days, while the disclosure remains bounded to supplied observations rather than expanding gaps into synthetic rows.
- The real-browser sparse fixture supplies September 1, 2, 4, and 7, including explicit missing and provisional states. It verifies the accessible `4 missing` summary, UTC-proportional circle positions, the absence of any `L` segment across gaps, and exactly four disclosure body rows.
- Both checked-in fixtures now keep every named public bucket at five or above. The v2 daily observations sum to the prescribed `totalViews: 10` while retaining September 6 observed `10` and September 7 provisional `0`. The zero-total browser variant clears page, referrer, and country lists instead of presenting positive related breakdowns.

### RED evidence

Small-bucket command:

`yarn playwright test tests/unit/statsPayload.spec.ts --project=chromium -g 'named buckets'`

Result: `1 failed`. The received model still exposed `US: 4`, kept `Other: 1`, and did not combine the small count.

Sparse-calendar command:

`yarn playwright test tests/e2e/stats.spec.ts --project=chromium -g 'sparse calendar'`

Result: `1 failed`. The requested browser-accessible summary with four calendar gaps was absent because the chart counted only explicit missing array entries. Source inspection and the reviewer render also established equal index spacing and a joined September 4–7 segment.

### GREEN evidence

- Full normalizer file: `9 passed (1.3s)`.
- Focused sparse-calendar browser case: `1 passed (2.1s)`.
- Complete focused stats browser file: `9 passed (14.9s)`, including v1/v2, measured zero/unavailable/all-missing, stale aging, malformed Retry, real 10-second timeout/retry, SPA abort, sparse UTC geometry, and 320 reflow.
- Final `yarn build`: passed and statically generated all five pages; `/stats` is 8.29 kB with 98.9 kB first-load JavaScript.
- Final `yarn lint`: passed with zero warnings.
- Final `yarn typecheck:tests`: passed.
- `git diff --check`: passed.

All HTTP data remained intercepted synthetic fixtures, with non-local requests blocked by the shared browser fixture. No public endpoint, cloud setting, or external data was touched.

### Updated evidence and self-review

- `evidence/d1-current-320.png` now shows coherent document total `10`, daily observation sum `10`, and `Other: 5` for both page and referrer breakdowns.
- `evidence/d1-zero-unavailable-320.png` shows document total zero with empty page/referrer lists, unavailable edge data, empty countries, and the all-missing chart message.
- `evidence/d1-sparse-calendar-320.png` shows September 1, 4, and 7 at calendar-proportional positions with no connecting stroke across the absent days.
- The regenerated `evidence/d1-rendered-evidence.json` retains the measured small-text ratios from 7.11:1 to 10.63:1.

The implementation does not expand omitted ranges, reconcile production totals, or change source freshness/availability semantics. `Other` remains last and the public output retains its prior six-item and per-count caps. No concerns remain for this fix round.

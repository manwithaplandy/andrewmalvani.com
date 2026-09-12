# Analytics Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish understandable metrics that distinguish measurement units and freshness and survive processing interruptions without losing or duplicating new observations.

**Architecture:** Deploy a backward-compatible reader first, then enrich the existing static payload with source metadata and explicit daily observations. Keep the existing historical aggregate baseline. Replace early processing claims with bounded atomic counter batches and durable completion records; publish only after the current ingestion pass reaches a consistent boundary.

**Tech Stack:** React/TypeScript static client, Python 3.12, boto3, DynamoDB transactions, S3, Cloudflare daily analytics, Terraform and the existing Lambda deployment job. Playwright Test supplies client/unit checks; Python unittest supplies backend checks.

**Spec:** [Quality report](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07.md), F10–F14. [Master plan](/Users/andrew/Scripts/react-resume/docs/superpowers/plans/2026-09-07-design-ux-remediation.md).

## Global Constraints

- “Data absence and staleness remain visible; successful updates from one source do not imply that all sources are current.”
- Preserve the existing historical baseline; do not erase counts or replay legacy-marked objects automatically.
- Continue publishing anonymous aggregates only. Keep domain/IP filtering, ISO country validation, bounded public arrays/counts, and the small-bucket threshold of 5.
- Public dates remain UTC calendar days, not per-event timestamps. Do not store raw request details in the new ledger.
- No client-side tracking, additional collection service or per-person identifier is introduced.
- New producer output must remain parseable by old readers during rollout. Readers must support both payload versions.
- Never mark a whole input complete before its counter effects are durably recorded. An uncertain response is not proof that a transaction did not commit.
- Fix implementations are omitted; contracts, fixtures, test cases and rollout actions are explicit.

---

## File map

| Responsibility | Files |
|---|---|
| Public data contract | Modify [dataDef](/Users/andrew/Scripts/react-resume/src/data/dataDef.ts:55); create `/Users/andrew/Scripts/react-resume/src/utils/statsPayload.ts` |
| Data loading and presentation | Modify [useStats](/Users/andrew/Scripts/react-resume/src/hooks/useStats.ts:1), [stats page](/Users/andrew/Scripts/react-resume/src/pages/stats.tsx:1), [StatCard](/Users/andrew/Scripts/react-resume/src/components/Sections/Stats/StatCard.tsx:1), [Sparkline](/Users/andrew/Scripts/react-resume/src/components/Sections/Stats/Sparkline.tsx:1), [BarList](/Users/andrew/Scripts/react-resume/src/components/Sections/Stats/BarList.tsx:1) |
| Producer and recovery | Modify [Lambda](/Users/andrew/Scripts/react-resume/stats_aggregator/lambda_function.py:1); create `/Users/andrew/Scripts/react-resume/stats_aggregator/payload.py` and `/Users/andrew/Scripts/react-resume/stats_aggregator/ledger.py` |
| Deployment integration | Modify [stats Terraform](/Users/andrew/Scripts/react-resume/terraform/statsLambda.tf:1) and [workflow](/Users/andrew/Scripts/react-resume/.github/workflows/main.yml:1); D owns these stats-specific changes before E4 cache metadata and E5 CI integration |
| Tests and evidence | Create `/Users/andrew/Scripts/react-resume/tests/unit/statsPayload.spec.ts`, `/Users/andrew/Scripts/react-resume/tests/e2e/stats.spec.ts`, `/Users/andrew/Scripts/react-resume/tests/fixtures/stats-v1.json`, `/Users/andrew/Scripts/react-resume/tests/fixtures/stats-v2-current.json`, `/Users/andrew/Scripts/react-resume/tests/stats/test_payload.py`, `/Users/andrew/Scripts/react-resume/tests/stats/test_source_failures.py`, `/Users/andrew/Scripts/react-resume/tests/stats/test_ledger.py`, `/Users/andrew/Scripts/react-resume/tests/stats/fakes.py`, `/Users/andrew/Scripts/react-resume/tests/requirements.txt` |
| Operations record | Create `/Users/andrew/Scripts/react-resume/docs/operations/analytics.md` |

## Shared contract: version 2 and normalized client model

The new producer retains every current top-level field with its current JSON type: `totalViews`, `uniqueVisitors`, `lastUpdated`, `since`, `dailySeries`, `topPages`, `topReferrers`, and `countries`. In particular, the legacy `uniqueVisitors` field continues carrying the sum of daily uniques; the new UI gives it a truthful name. It must not be silently redefined as deduplicated people.

Add these exact fields:

| Field/type | Contract |
|---|---|
| `schemaVersion: 2` | Declares the enriched format. Unknown later versions must not be guessed as v2. |
| `sources.cloudfront: StatsSource` | Metadata for filtered document requests observed in CloudFront logs. |
| `sources.cloudflare: StatsSource` | Metadata for Cloudflare zone requests and summed daily uniques. |
| `StatsSource.status` | `'current' \| 'stale' \| 'unavailable' \| 'unknown'`; `unknown` is reserved for adapting legacy input. |
| `StatsSource.since`, `.through`, `.lastSuccessfulUpdate` | Valid UTC `YYYY-MM-DD` strings or null. Period bounds describe observed coverage, not guaranteed complete delivery. |
| `StatsSource.scope` | `'site-document-requests'` for CloudFront or `'zone-requests'` for Cloudflare. Do not label zone-wide metrics as homepage-only metrics. |
| `dailyObservations: StatsObservation[]` | Exactly 30 calendar days from today minus 30 through yesterday in producer output; client accepts up to 30 sorted, unique days. |
| `StatsObservation` | `{date: string; views: number \| null; status: 'observed' \| 'provisional' \| 'missing'}`. Null means missing, never zero. Yesterday is provisional if a value exists. Older supplied counts are observed, not a promise that late logs can never arrive. |

Client normalization lives in `src/utils/statsPayload.ts` and exports `normalizeStatsPayload(raw: unknown, today: string): StatsViewModel | null`. `today` is an explicit UTC day so stale-data tests are deterministic. `StatsViewModel` has exactly `generatedOn: string`, `documentRequests: number | null`, `dailyUniqueVisits: number | null`, `documentSource: StatsSource`, `edgeSource: StatsSource`, `observations: StatsObservation[]`, and the three existing lists `topPages`, `topReferrers`, `countries`.

Normalization rules:

- Validate real calendar dates, unique ascending observations, finite nonnegative counts and existing label restrictions. Preserve genuine zero when source metadata establishes availability. Invalid optional measurements become unavailable, not fabricated zero; invalid overall structure returns null.
- Adapt v1’s `totalViews` as document requests and `uniqueVisitors` as summed daily unique visits. Its source freshness is unknown; the Cloudflare period is unknown. A legacy zero unique count is unavailable because its meaning cannot be distinguished from missing configuration. Do not invent historical collection bounds.
- Convert legacy zero daily points into missing observations where zero cannot be distinguished from absence; omit today and future days. Keep supplied positive earlier observations. Explain legacy uncertainty in the display.
- Even if a stored v2 status says current, render it stale when `today - lastSuccessfulUpdate` exceeds two UTC days. A stopped producer must not leave a permanently fresh-looking page.


## Execution context

Work only in /Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation. Paths in the source plan point to the original checkout; map them into this worktree. The user has now authorized implementation. Do not deploy/push or change cloud settings in a task; prepare reviewable changes and record exact external dependencies. Do not invent missing factual evidence.

## Verified execution tools

Use Node 22 at /Users/andrew/.nvm/versions/node/v22.16.0/bin/node (prepend that bin directory to PATH for Yarn commands). Default PATH selected Node 26 during setup. Python 3.12.14 is available at /Users/andrew/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3. Network-bound calls may require require_escalated; AWS and GitHub credentials were verified by read-only calls outside the sandbox. See environment-notes.md for already performed live checks; do not repeat them without a new reason.

For clean subsequent validation output, use `env -u NO_COLOR` with the Node 22 PATH; B1 reported conflicting color environment warnings. If Yarn reports unwritable cache/global directories in the sandbox, select task-scoped writable temporary paths or use the already authorized escalation, rather than changing application behavior or suppressing test failures.

Verification efficiency: after focused and relevant combined checks pass on the final source, do not repeat the same unchanged suite merely to label it fresh. Rebuild/rerun only when an actual change, failure, or unresolved concern warrants it; record exactly what source/results were verified.

Runner follow-up: Yarn 1 still warned with YARN_GLOBAL_FOLDER alone in C1. A2 produced clean output using PREFIX=/private/tmp/react-resume-prefix and YARN_CACHE_FOLDER=/private/tmp/react-resume-yarn-cache plus env -u NO_COLOR. Prefer that known-working environment for subsequent checks; do not rerun completed tasks solely for this cosmetic runner warning.

Analytics test runtime update: a ready isolated Python 3.12 environment is available at /private/tmp/react-resume-stats-venv/bin/python with boto3/botocore 1.43.89 and validated offline DynamoDB models. See environment-notes.md for pinned versions. Add a durable test dependency declaration in the owning analytics task; use fake services/synthetic credentials and avoid the owner’s live AWS session in tests.


Workflow validator now available: /private/tmp/react-resume-actionlint-1.7.12/actionlint (official releasev1.7.12,darwin_arm64), prepared by controller from the official release asset with published SHA256 match aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f. Version command passes. Use after actual workflow edits for semantic/static validation; this does not substitute for the approved GitHub PR/failing/passing runs. Documentation https://github.com/rhysd/actionlint/blob/main/docs/install.md and exact release https://github.com/rhysd/actionlint/releases/tag/v1.7.12. No global install/source dependency change.

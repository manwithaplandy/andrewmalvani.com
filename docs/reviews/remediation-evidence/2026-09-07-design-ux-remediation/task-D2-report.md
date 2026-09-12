# D2 implementation report

Status: DONE WITH RELEASE DEPENDENCIES. Base: `4180436`. Commit: `2317b68` (`feat: publish source-aware analytics observations`). No deployment, invocation, public request, cloud mutation, live credential discovery or historical replay occurred. The controller assigns independent review; this is implementation self-review only.

## Delivered behavior

- Added pure stdlib `stats_aggregator/payload.py` with the specified low-level-item `render_payload` interface. It emits v2 plus every legacy field with its prior JSON type. Exactly 30 UTC observation days end yesterday; absence stays null/missing, supplied zero remains measured, yesterday is provisional. Numeric legacy dailySeries includes only supplied measurements. Daily uniques remain summed, countries remain zone request counts, and coverage comes from actual stored source dates.
- Retained page/domain/IP/country-shape restrictions, named bucket floor 5, five named rows plus Other, and bounded public counts (1,000,000,000). Historical aggregate items and CF daily keys remain intact. Pure import is verified to load neither boto3 nor botocore.
- Persisted independent source records under source#cloudfront/source#cloudflare, storing null with DynamoDB NULL attributes. Successful refresh advances only its own day/actual bounds. Failed refresh preserves previous success and coverage, or real legacy bounds with null success when there is no previous metadata. Stale/unavailable are distinct from a successful measured zero.
- Wrapped all recoverable Cloudflare boundaries together: absent/partial configuration, denied/malformed token, request/transport failure, API error, empty results, malformed JSON/groups/dates/counts and daily storage errors. The full API result is validated before any writes. Independent CloudFront data publishes before configured-source failures raise. Fully absent optional config is visible without repeated alarm; partially supplied config raises. Error logs contain exception type, not token/API response details.
- CloudFront truncation or skipped/unparseable objects cannot advance source success. Scan is strongly consistent. Metadata/scan/publication failures can still prevent publication; revised alarm text no longer promises otherwise or treats a cleared alarm as proof all sources recovered.
- Every stats packaging declaration/command includes explicit lambda_function.py and payload.py. No environments, caches or tests enter these archives. Added website-publication dependency before workflow code updates; documented the remaining actual public/cache reader verification prerequisite for D4/E5 and first-bootstrap sequencing.
- Added durable operations notes at docs/operations/analytics.md, an ignored fresh .venv-stats, and frozen tests/requirements.txt.

## Scoped decisions and RED evidence

The task's implementation authorization overrides inherited plan-only wording. The existing marker-first CloudFront durability implementation is intentionally retained for D3, as agreed with the controller; D2 does not claim ingestion is transactionally safe.

Ruling 15: the shared contract permits null source dates, and stored legacy daily observations do not establish a historical successful refresh date. D1 had rejected stale+null and hid valid measured uniques. The controller explicitly authorized the minimal compatibility correction in D2: stale with a null lastSuccessfulUpdate remains stale with its measurements; current still requires a valid real date and still ages after two days. No execution timestamp is inferred from an item date. Source diff is one conditional change.

Meaningful pre-implementation RED was saved in evidence/d2-red-python.log: missing pure payload module, missing source records, token-read failure preventing independent publication, and malformed/empty Cloudflare responses accepted as success. The focused D1 normalization RED in evidence/d2-red-normalizer.log showed expected 2 unique visits becoming null for stale legacy measurements.

Self-review found a further concrete absence risk: if total#views is missing/invalid but daily rows survive, the required numeric legacy fallback 0 could be displayed as a current total. Added a focused failing test (expected unavailable, got current), then constrained CloudFront aggregate availability to a valid total item. Actual daily observations and their coverage remain intact, rather than summing a possibly partial daily subset into a fabricated historical total. The synthetic test asserts unavailable plus the retained daily value 10. This particular missing-total scenario has backend coverage; it was not separately browser-captured. Existing reader logic turns an unavailable source's total into null and independently retains observations.

## Isolated environment and verification

Created a fresh Python 3.12.14 .venv-stats using the provided runtime, seeded the exact installed SDK distribution files from the controller-provided isolated SDK environment without network installation. Froze the resulting fresh environment to tests/requirements.txt and ran `PIP_NO_CACHE_DIR=true .venv-stats/bin/python -m pip check` successfully. Pins: boto3/botocore 1.43.89, jmespath 1.1.0, python-dateutil 2.9.0.post0, s3transfer 0.19.2, six 1.17.0, urllib3 2.7.0. The ops record provides standard fresh-environment pip installation from those pins for reproduction.

Tests clear inherited environment during handler import, set synthetic AWS credentials/region, disable metadata, point config files at the null device and replace clients. Browser subprocesses execute only synthetic handler export; Playwright intercepts stats and blocks external traffic. No live service calls or user credentials are used.

Final meaningful checks:

- `.venv-stats/bin/python -m unittest discover -s tests/stats -p 'test_*.py' -v`: **24 passed**, final source including missing-total correction. Six pure payload, fifteen source/failure, three packaging/pure-import tests. Evidence: evidence/d2-green-python.log.
- `STATS_TEST_PYTHON=<worktree>/.venv-stats/bin/python yarn playwright test tests/unit/statsPayload.spec.ts tests/e2e/stats-producer.spec.ts --project=chromium`: **13 passed** (10 D1 normalizer + 3 actual-generated producer/browser cases). Evidence: evidence/d2-client.log. Cases cover stale legacy unknown success, current measured data, fresh zero. Tests assert total 10; summed uniques 2 or 0; date bounds/no today; Other aggregation; independent visible statuses and success caption; native daily disclosure. The later missing-total guard does not change these fixtures, all of which contain valid total#views.
- `yarn build`: pass including application type compilation and static export; evidence/d2-build.log. Node 22.16.0 used.
- `yarn typecheck:tests`: pass (tsc exit 0); `yarn lint`: pass with max-warnings=0. Exact terminal transcript recorded in evidence/d2-static-checks.txt.
- `terraform -chdir=terraform fmt -check`: pass. `terraform -chdir=terraform validate -no-color`: `Success! The configuration is valid.` Existing provider lock/cache used; no backend/state read or apply. State-backed consolidated plan belongs to the controller under Ruling 11.
- `/private/tmp/react-resume-actionlint-1.7.12/actionlint .github/workflows/main.yml`: pass, exit 0 with no findings.
- `git diff --check`: pass. Source and tests self-reviewed. Restored unrelated Prettier-only formatting to keep D1 change minimal; no behavior altered after its validation.

Archive verification boundaries: unit tests reconstruct the Terraform-declared explicit members, create workflow zip archives from the explicit command/matrix members, verify exact member lists and import each extracted flat handler under isolated dummy clients. Terraform validate separately validates the real archive schema. This is not a Terraform apply or GitHub Actions run.

## Rendered evidence and remaining gates

Saved outside Playwright's auto-cleaned output:

- evidence/d2-producer-stale.png: actual generated payload at 320px. Inspected: document total 10/current, unique sum 2/stale, real Sept 2–7 edge coverage, “Last successful update: Unavailable” fits and remains understandable in its success-date context. Full daily chart and privacy-preserving Other rows remain visible.
- evidence/d2-producer-current.png: inspected desktop output with independent real source periods and Sept 8 success dates.
- evidence/d2-producer-zero.png: browser-captured fresh measured-zero edge case.
- evidence/d2-produced-stale.json: final actual handler/fake-services output, not a hand-authored frontend fixture.

No CSS or stats presentation component changed. Existing D1 rendered contrast evidence (evidence/d1-rendered-evidence.json, 7.11:1–10.63:1 for relevant informational text) applies to these unchanged text/background styles; D2 does not claim a new contrast measurement or actual OS screen-reader speech. Browser assertions establish visible semantics and native disclosure only.

Release remains separate: D3 must complete ledger/durability safeguards; D4/E5 must verify compatible public/cached reader before producer and handle first bootstrap, migration and production checks. Web upload alone is not that verification. No raw data replay, baseline reset, resource identity change, retention change, cache-policy redesign, or broad E5 workflow redesign was performed.

## Fix round 1 — consistent failed-source publication (base 2317b68, commit 12c0e09)

Independent review identified an Important defect: successful first daily writes followed by a failed second write were included in the post-write scan, while the source retained its previous coverage. The same leftover rows could make a previously unavailable source appear available on a later failed attempt. The old failure test only failed the first write.

Ruling 16, authorized by the controller: persist the last accepted privacy-filtered public Cloudflare projection with its metadata, bootstrap before any new daily write, and replace only after a complete source refresh. Cost: a small bounded internal record format and validation responsibility in source#cloudflare, to preserve/migrate in future changes. Public render_payload signature and StatsSource output remain exact; CF daily item shapes/history and CloudFront ledger behavior are unchanged.

Implementation: source#cloudflare now carries checkpointVersion N=1 and publicProjection S containing the bounded summed uniques and at most five named country rows plus Other. A single item write stores all five metadata attributes and the projection together. Failed refresh uses that accepted record for measurements, availability and period on every invocation; leftover daily rows do not promote a previously unavailable dataset. Current/zero/full recovery and legacy stale+null success are retained. The pure renderer understands this internal low-level record while exposing only the existing public fields. Validation enforces version, source shape/date/scope, numeric bounds, privacy floor, unique labels and list bounds; malformed or missing new-format projection fails closed. An old record with neither internal checkpoint field is treated as legacy and seeded before writes. Deleting an established checkpoint entirely is not a supported recovery operation; it is indistinguishable from legacy storage and future migrations must preserve the marker/record (documented in ops).

The accepted record describes the last accepted dataset, not the last attempt. A failed attempt presents it stale/unavailable while retaining its accepted date/coverage. An acceptance write that returns an error may have committed: this invocation publishes the previous complete dataset and raises without undoing a possibly committed checkpoint. A later strongly consistent read sees either the old record or the complete new metadata/projection. No uncertain response is interpreted as proof the write did not commit. If initial checkpoint persistence fails, the invocation aborts before any CF daily write; the documented storage-failure publication limitation applies.

RED: evidence/d2-fix1-red.log contains actual-handler failures for the review examples: expected previous sum 0, got100; expected previous sum1, got101. The regression holds the same stored fake table across repeated second-write failures and then checks full recovery. Prior-data case also checks US7 and Sept2–2/successSept3; empty case checks unavailable/null dates/empty countries despite residual Sept6 daily data.

GREEN and evidence:

- `python -m unittest discover -s tests/stats -p 'test_*.py' -v` using .venv-stats: **29 passed** on final Python source; evidence/d2-fix1-python.log. Covers both second-write cases, repeat failure, complete recovery, genuine zero, failed checkpoint write before persistence, committed-but-lost response, initial checkpoint failure before any daily write, malformed/missing checkpoint, pure validator privacy/bounds, and extracted package imports. Existing source failure tests remain green.
- Five actual handler-generated browser/normalizer cases: **5 passed**; evidence/d2-fix1-browser.log. Includes stale-null/current/zero and the two new partial-write cases. No hand-written public payload is used. The later validator tightening only rejects malformed attribute shapes/unavailable-positive checkpoints; successful fixture shapes are unchanged and remain covered by final backend checks.
- `yarn typecheck:tests`: pass; evidence/d2-fix1-types.log. `git diff --check`: pass. Existing application source, build output, styles, workflow and Terraform did not change in this fix, so their already passing unchanged checks were not repeated.
- Inspected and preserved evidence/d2-fix1-partial-prior.png and evidence/d2-fix1-partial-empty.png at 320px. First shows1/US7/stale/Sept2–2/successSept3; second shows Unavailable and unavailable country data. Both retain independent CloudFront10/Current and intact document observations. New fixture JSON is evidence/d2-fix1-partial-prior.json. Captures live outside Playwright auto-cleaned output.

Operations notes now describe the checkpoint format, atomic acceptance, uncertainty behavior, failure boundaries and preservation requirement. D3 CloudFront durability and D4/E5 release prerequisites remain outstanding at their original scopes. No cloud action, history rewrite, raw-data replay or deployment occurred. This report is implementation self-review, not independent approval.

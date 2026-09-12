## Task 12: D2 — Publish source freshness and explicit daily observations

**Findings:** Producer portions of F10–F12. **Dependency:** D1 reader prepared; release order remains reader before producer.

**Files:** Lambda, new payload module, stats Terraform/workflow packaging, backend payload/source-failure tests, test requirements and analytics operations record.

**Interfaces:**

- `payload.py` exports `render_payload(items: list[dict], today: date, source_status: dict[str, dict]) -> dict`. `items` is the existing low-level DynamoDB aggregate representation; `source_status` provides the two `StatsSource` records. Output follows the v2 contract and retains legacy fields.
- The orchestrator persists day-precision source metadata under `source#cloudfront` and `source#cloudflare`. `lastSuccessfulUpdate` advances only after that source succeeds; a failed source retains its previous success/coverage and becomes stale, or unavailable without prior measurements.
- Existing daily Cloudflare items remain `cf#daily#YYYY-MM-DD`; summed uniques stay a sum. The query’s current zone scope is explicitly declared, not silently narrowed or relabeled.

- [ ] **Step 1: Establish isolated Python testing.** Use a fresh virtual environment, install boto3 for local tests, freeze that environment’s dependencies to `tests/requirements.txt`, and ignore the local environment directory. Use unittest rather than adding another test framework. Set dummy region/credentials and disable metadata lookup before importing the Lambda in tests; replace clients before exercising any orchestration.
- [ ] **Step 2: Add exact source/period test cases.** `test_payload.py` supplies low-level items for one visitor on each of two days and asserts the sum is two, country requests retain their own units, and the period starts from actual stored source dates. Assert 30 observation dates ending yesterday, no today value, null for absent days and provisional yesterday. A supplied daily item with numeric zero remains a real observed zero.

```python
from datetime import date
import unittest

from stats_aggregator.payload import render_payload


class PayloadTests(unittest.TestCase):
    def test_absent_observations_do_not_become_zero_traffic(self):
        sources = {
            "cloudfront": {
                "status": "unavailable", "since": None, "through": None,
                "lastSuccessfulUpdate": None, "scope": "site-document-requests",
            },
            "cloudflare": {
                "status": "unavailable", "since": None, "through": None,
                "lastSuccessfulUpdate": None, "scope": "zone-requests",
            },
        }
        result = render_payload([], date(2026, 9, 8), sources)
        observations = result["dailyObservations"]
        self.assertEqual(len(observations), 30)
        self.assertEqual(observations[0]["date"], "2026-08-09")
        self.assertEqual(observations[-1]["date"], "2026-09-07")
        self.assertTrue(all(point["views"] is None for point in observations))
        self.assertTrue(all(point["status"] == "missing" for point in observations))
        self.assertEqual(result["schemaVersion"], 2)
```

The pure payload module must be importable without creating AWS clients. Keep network-client creation confined to the existing orchestrator.

- [ ] **Step 3: Add source-failure tests.** In `test_source_failures.py`, simulate absent Cloudflare configuration, denied token read, HTTP timeout, API errors, empty usable results, and recovery. Existing CloudFront output must remain publishable on those Cloudflare failures with truthful source state. Test that source success does not advance on a failed query and that a genuinely fresh zero is distinct from absence.
- [ ] **Step 4: Run `python -m unittest discover -s tests/stats -p 'test_*.py' -v`.** Confirm assertions fail against existing behavior, with no AWS network calls or credential discovery.
- [ ] **Step 5: Implement payload construction and source bookkeeping.** Move pure rendering into `payload.py`. Preserve real coverage bounds and source-specific success dates; include only dates before today in observations. Mark missing dates null, yesterday provisional when measured, and older measurements observed. Keep the legacy dailySeries numeric for compatibility, derived from available observations only; the new reader uses dailyObservations.
- [ ] **Step 6: Make all Cloudflare failure boundaries recoverable.** Cover configuration, token retrieval, transport, API errors and parsing within the same source outcome. Publish CloudFront-derived data with stale/unavailable Cloudflare metadata, then preserve a clear alarm outcome when a configured source fails. Update the existing alarm description so it no longer promises partial publication after every possible kind of failure.
- [ ] **Step 7: Package the new module everywhere.** Update the Terraform bootstrap archive to contain `lambda_function.py` and `payload.py`, and the workflow’s bootstrap/code-update zip creation to include the same explicit files. Keep tests, local environments and caches out of the archive. Verify archive members and that importing the handler from an extracted archive succeeds with dummy clients.
- [ ] **Step 8: Verify compatibility and commit.** Run backend tests, the D1 client tests against generated v2 JSON, build/typechecks/lint, and Terraform formatting/validation using the existing provider lock. Commit as `feat: publish source-aware analytics observations`. Do not publish the producer ahead of the compatible reader.




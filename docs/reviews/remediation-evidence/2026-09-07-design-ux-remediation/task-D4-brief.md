## Task 14: D4 — Roll out the reader, producer and ledger without losing history

**Findings:** Completes F10–F13 operational verification. **Dependencies:** D1–D3 verified; coordinate cache metadata with E4 and release mechanics with E5.

**Files:** Update `/Users/andrew/Scripts/react-resume/docs/operations/analytics.md`; modify release configuration only if needed to preserve the ordering already specified. No blanket data rewrite.

**Interfaces:** Consumes the v2 reader, packaged producer, transaction-capable IAM, single-writer configuration and existing production counts. Produces a release record containing commit/package digest, prior payload backup location, safe rollback boundary, source coverage dates, and a finding closure decision.

- [ ] **Step 1: Record the historical baseline privately.** Save the current public payload and a secured backup/export of aggregate counters and processing metadata using existing authorized account access. Do not commit raw logs, credentials or full table exports. Compare total/day/page relationships and record discrepancies already present before the change.
- [ ] **Step 2: Reconcile only what evidence supports.** Determine which original logs still exist. Document that expired inputs cannot be reconstructed exactly. Keep legacy totals intact; if corrections to them are proposed, produce a separate before/after reconciliation artifact for owner review instead of silently adjusting them in this rollout.
- [ ] **Step 3: Deploy the compatible reader first.** Verify it against the still-existing v1 payload in production: daily-unique sum label, unknown coverage, no current-day plunge and accurate privacy text. Record the consumer commit before publishing v2.
- [ ] **Step 4: Apply the reviewed prerequisite configuration and new package.** Confirm archive membership, transaction permissions and reserved concurrency before invoking the new producer. Keep a copy of the old package for investigation, but do not treat it as a safe post-ledger rollback: old code does not understand new completion records.
- [ ] **Step 5: Verify a controlled processing run.** Run the producer through the established deployment process, inspect its aggregate-only diagnostics, and verify source-specific dates plus stable repeated invocation. Confirm new records prevent duplicate counts and public totals remain consistent after the run. Do not induce an outage or write synthetic visitor events into production.
- [ ] **Step 6: Define the safe rollback action.** If the new producer fails after ledger writes begin, pause its schedule/invocations and restore the previous public payload if necessary while preserving the ledger and counts. Repair forward or deploy a version that understands the ledger. Re-enabling marker-first code against the same inputs is not an acceptable rollback.
- [ ] **Step 7: Observe the next scheduled update.** Verify it arrives with expected source dates and no false current-day zero. Use a scheduled follow-up only if the user requests one; otherwise record the exact remaining observation rather than claiming it occurred.
- [ ] **Step 8: Commit the release record** as `docs: record analytics migration and historical limits`. Close code-level findings with their passing tests; close live behavior only after the corresponding production checks are actually complete.



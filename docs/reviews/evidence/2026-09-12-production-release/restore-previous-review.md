# Previous analytics producer restoration review

**Approved for the controller's narrowly scoped restoration. No concrete blocker found.** This approval relies on the established facts that the new producer never acquired execution capacity or ran, invokers remain held, and the full stored dataset/public payload still match the pre-install recovery capture. It does not approve a quota increase, a retry of the rejected account-scope action, or old-code rollback after new-format writes.

- `restore_previous_analytics.py:7–11` refuses evidence of opening/invocation, requires rule DISABLED and reserved concurrency 0, verifies the exact old archive SHA-256, compares two complete strongly consistent sorted table scans with the captured digest, rejects ledger-v2 records and matches public payload bytes plus version/metadata. The saved capture records 59,808 rows and the expected old digest; no raw rows or environment values were printed in this review.
- Lines 12–17 require the expected installed new digest and settled state, record restoration start, then install the exact old ZIP using the current RevisionId while execution remains blocked. They wait for the old digest to settle, require preservation of runtime, handler, role, timeout, memory, VPC and environment, and reassert the stopped state.
- Lines 18–21 validate the original cron and sole unqualified target, perform a third complete table comparison, then remove the temporary reservation and verify it is absent before enabling the original rule. The old digest is checked again after enable. Removing the reservation restores the controller-confirmed original unreserved state; it does not request additional account concurrency.
- Line 22 accurately records the migration as blocked pending quota approval, with the next scheduled observation pending. The script does not invoke either producer or claim controlled/repeated new-producer verification.

The imported `prepare_backup` helpers were checked: importing the module does not execute its main operations; scan uses ConsistentRead, sorts by ID and rejects duplicate IDs; object metadata includes VersionId, ETag, LastModified, MIME/cache and encryption fields. Its save helper keeps receipts private.

**Remaining observable checks:** preserve the completed restoration receipt and read back old code/state, absent reservation, enabled original cron/sole target and account settings. Observe the next scheduled old-service execution separately; do not infer that it ran from enable success. If any guard or update fails, stop and inspect current state rather than blindly rerunning or reopening admission. A later new-producer attempt requires its full admission/quota/recovery/reader gates again.

No script execution, Lambda invocation, cloud query/mutation, quota request, source edit or subagent was performed by this reviewer. Only the restoration script, relevant imported helpers and selected safe capture metadata were read; this report is the sole write.

Reviewed script SHA-256: `005cbf5e7f2e67f9c3c753738611d00124a5b3c2a66ac3410fee3fd520905b5c`. Review recorded 2026-09-12T09:20:06.213967+00:00.

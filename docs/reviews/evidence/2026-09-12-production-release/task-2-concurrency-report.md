# Task 2 — reserved-concurrency preflight gap

Documentation-only correction from base `53a6749c8b326ec4387eb4d66e57618ea92c2895`. No code/runtime/Terraform/provider/workflow changes, tests, cloud/account calls, invocation, quota request, restoration, push or subagents.

Controller evidence: API/frontend ready, but allocating producer reserved concurrency 1 failed with regional total/unreserved concurrency 10/10. New producer remained at reserved concurrency 0 and had not been invoked. A request for 101 was rejected by AWS's request rules; account-wide 1001 was not automatically authorized and explicit owner approval remained pending. These are supplied controller facts, not new worker verification. No migration-complete claim is made.

Read primary AWS documentation for GetAccountSettings and configuring reserved concurrency. GetAccountSettings supplies regional account limits including total/unreserved concurrency. AWS documents an unreserved floor of 100; current/effective service constraints and other reservations must be checked. A quota of 11 must not be presumed sufficient. The checked Terraform plan and local tests cannot prove capacity or service acceptance.

Changes are confined to analytics operations, delivery operations, and the current release plan. Both general and short handover now require regional GetAccountSettings plus GetFunctionConcurrency before producer pause/release, accounting for the function's current reservation and pool available to other functions. Insufficient/uncertain capacity blocks pause. Regional quota increases require their own scope/owner approval and may need AWS Support; 1001 is not an automatically safe site-local remedy. Actual acceptance/readback remains required during authorized activation.

The recovery exception is deliberately narrow: while admission stays frozen and concurrency zero, require no new execution/write evidence, exact strong full-table snapshot equality, unchanged public bytes/version, and no new source/active/chunk/completion records. Retain the no-writer proof; stable scans are not a substitute. Only then may the controller restore the exact private old package/configuration with successful update/digest checks and recheck snapshot/public identity before restoring prior reservation/admission state. Do not mutate the table to make guards pass. If writes/execution/uncertainty exist, retain new code and stop admission for ledger-aware repair forward. Restoring the baseline is not completing the new handover. No restoration is claimed executed by this documentation.

Validation: `evidence/task2-concurrency-doc-checks.json` confirms exactly three changed documentation paths, per-file SHA256, all relative links and heading anchors resolve, and no source/runtime/config change. `evidence/task2-concurrency-doc-whitespace.log` is empty: git diff --check passed. The root-owned untracked production-release report/evidence and controller ledger are untouched. No unchanged test/build suites were rerun for prose. Independent scoped review remains pending.

Primary sources read (no account APIs called):
- https://docs.aws.amazon.com/lambda/latest/api/API_GetAccountSettings.html
- https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html

Final commit `e73eee88cbe5a203f407b4ee850e5c21ac229661` — `docs: check regional concurrency before analytics handover`. Staged whitespace check passed. Exact scoped review diff: `task-2-concurrency-review.diff`, base `53a6749c8b326ec4387eb4d66e57618ea92c2895`. Ready for independent documentation review; no cloud action or migration completion implied.

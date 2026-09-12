# Approved infrastructure scope — independent saved-plan review

**Verdict: APPROVED for the exact saved targeted plan only.** No Critical, Important, or Minor issue was found within the newly authorized scope. This approval supersedes the obsolete RC0/DISABLED prerequisite of the earlier website-only review: the required baseline is now the restored old analytics code, original absent reservation, and enabled original daily schedule.

## Identity and inspected evidence

- Plan: `private/approved-infra-20260912-targeted.tfplan`.
- Binary SHA256: `b0db3c653d0be847b01a17d45cfe8baa5c6fd0e3a58099b5992beb5bd424eaf2`.
- Rendering: `private/approved-infra-20260912-targeted-plan.json`, SHA256 `8341c70bb3400b2e05c5f16b1fb3c747e4289e3ef5333e9f9d24ee0804f58f26`.
- Refreshed at 2026-09-12 15:50:02 UTC using Terraform 1.14.7; applyable=true, errored=false, no deferred changes. Complete=false correctly identifies the exceptional targeted scope.
- Also inspected the associated complete full plan, current Terraform cache/routing source, and private `approved-infra-20260912/before.json` and `quota-before.json`. No cloud queries or operations were performed by this reviewer.

## Exact admitted action set

1. Create the immutable cache policy: min TTL zero, default/max 31,536,000 seconds, gzip/Brotli cache variation, no cookies/query/header variation.
2. Create the stable cache policy: min TTL zero, default/max 300 seconds, otherwise the same bounded policy settings.
3. Update the existing CloudFront distribution only for the default/hashed-asset policy associations, compression and exact 403/404-to-404 recovery mappings with a ten-second error minimum.
4. Update and publish the existing CloudFront routing function's code/comment. Planned code exactly equals the current reviewed source; name, runtime and identity are unchanged.
5. Replace only the immutable API deployment, create before delete, for the previously reviewed empty-map fingerprint convergence.
6. Update only the existing API stage's deployment pointer to that new snapshot.
7. Delete only the log bucket's recursive self-logging relationship, whose source and destination are the same existing log bucket with `this-bucket-log/` prefix.

All seven changes are identical to their corresponding changes in the full plan. The full plan's only additional changed addresses are the analytics reserved-concurrency allocation and alarm-description update; both are excluded from this saved targeted plan. No Lambda code/configuration action, analytics admission/schedule/target action, table/data action, IAM change, quota change, paid add-on, or unrelated replacement/deletion is present.

Distribution ID, aliases, origins/OAC, certificate, logging destination/prefix, response-header policy, viewer policy, restrictions, price class and protocol settings remain unchanged. API/stage identities and all actual contact integrations, methods and Lambda behavior remain unchanged. The only replace/delete targets are the superseded immutable API snapshot and recursive logging relationship; no persistent service, bucket or data identity is removed. The existing website bucket logging receipt remains directed to `website-log/`, and CloudFront access-log delivery is preserved.

The targeted refresh drift is limited to the known OPTIONS empty-map normalization and a distribution ETag change. Unknown plan values are the expected created identifiers; empty nested unknown maps do not imply unknown logging/security changes.

## Execution conditions and acceptance boundary

- Apply only the exact saved binary above after its SHA256 is rechecked. The user's newly stated infrastructure approval does not authorize the full plan or the two excluded analytics changes.
- Before and after application, require the original analytics digest `e3f30b13d0335aa5d898d2c21f71ef9153d769f96e07510e9be137f2254eee51`, absent reservation, enabled daily rule and sole unqualified target. The saved 15:48 baseline and 15:50 quota read show that state and total/unreserved concurrency 10/10.
- Wait for CloudFront deployment and verify both public hosts, redirect/query preservation, recovery status/content, exact checked assets, intended cache/compression behavior, and unchanged contact non-sending checks. Verify self-logging is removed while existing website/CloudFront destinations remain configured.
- Produce a fresh complete read-only reconciliation after apply. API deployment/stage convergence must be no-op; any remaining analytics changes must stay excluded pending their separate prerequisites. A successful targeted apply alone does not complete the new-producer migration or prove runtime delivery checks.

This review authorizes no operation by the reviewer. The controller owns the approved apply, readbacks, and final release-state record.

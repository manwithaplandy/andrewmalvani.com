# E3 implementation report

Status: DONE_WITH_CONCERNS, pending independent task review and authenticated Cloudflare/release evidence. Base `70e48d7`. Commit `796e7de`. No cloud or public rediscovery, Cloudflare sign-in/token/plugin action, setting mutation, plan, apply, deployment, push, merge, automation, contact send, or application behavior change occurred.

## Scope and decisions

Corrected the stale Terraform comment that asserted Cloudflare Flexible mode as fact. The distribution's working `viewer_protocol_policy = "allow-all"` remains unchanged while account SSL mode and proxy settings are unknown. The replacement comment states the evidence boundary and points to the coordinated branch/rollback record. No origin, alias, certificate, cache, function, error response, resource identity, or security setting changed.

Expanded `docs/operations/delivery.md` with a Mermaid hop diagram and a nonsecret evidence table. It records:

- observed viewer HTTP-to-HTTPS behavior at Cloudflare and valid public HTTPS;
- unknown Cloudflare-to-CloudFront origin scheme, SSL mode, per-host proxy state, cache rules, and Browser Cache TTL;
- distribution `EDHU4C51HW4BG`, domain `d2v6o77xftr5if.cloudfront.net`, apex/`www` aliases, and the ISSUED apex/wildcard ACM certificate expiring `2027-03-10T16:59:59-07:00`;
- successful direct apex and `www` HTTPS origin probes with original Host/SNI and certificate verification enabled;
- the actual default S3 origin and OAC `E3Q6QZXOS9AMQ8` with always-sign SigV4 HTTPS semantics;
- the two existing custom apex/`www` origins as unselected by the default behavior, preserving their identities without mistaking them for the active default hop;
- successful PDF, `stats.json`, and actual referenced-chunk samples with their narrow cache-evidence limits.

No new Terraform outputs were needed: the existing HTTPS distribution URL output remains useful, while the verified operational record carries the stable nonsecret identifiers and evidence boundaries without changing the public module interface.

The rollout record has explicit branches for already-active Full (strict) with successful origin validation, Flexible with ordered transition to Full (strict) before any CloudFront redirect tightening, and failed certificate/hostname/reachability validation with no settings change. Unexpected modes, DNS-only hostnames, or divergent host settings stop for a state-specific plan. Rollback restores the recorded prior CloudFront viewer policy/revision and Cloudflare SSL mode, per-host proxy state, redirect setting, cache rules, and Browser Cache TTL before repeating the same path checks. A one-sided redirect reversal is not treated as complete rollback.

The E2 follow-up wording now states that repeating the capped 100-page self-log observation still yields lower-bound observations and cannot produce an actual total-prefix delta. Quantified growth requires complete comparable coverage or another justified metric.

## Existing evidence consumed

- `evidence/delivery-entry-paths-before.json`: public HTTP apex/`www` one-redirect chains, public HTTPS pages/deep links, and direct `www` origin validation. The earlier direct apex origin probe is in `environment-notes.md`.
- `evidence/delivery-origin-access-control.json`: read-only default-origin OAC identity/type/signing behavior/protocol and AWS transport conclusion.
- `evidence/delivery-cache-before.json`: narrow PDF, `stats.json`, and real chunk success/cache samples.
- `environment-notes.md`: read-only distribution aliases/default origin/custom-origin boundary, ACM status/coverage/expiry, and unauthenticated Cloudflare dashboard boundary.

Primary acceptance references already verified by the controller and cited in the operations record are Cloudflare's [Full (strict) requirements](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/), [Browser Cache TTL behavior](https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/set-browser-ttl/), [cache-control behavior](https://developers.cloudflare.com/cache/concepts/cache-control/), and [AWS OAC prerequisites](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html).

These existing records were consumed without repeating queries, sign-in attempts, probes, or raw-data access. Public responses prove observed traffic behavior; they do not reveal all authenticated account settings.

## Validation and self-review

No application or backend test was run for a Terraform comment and operations-only change. Focused configuration/diff checks are the relevant verification.

- `terraform -chdir=terraform fmt -check -no-color`: pass, no output.
- `terraform -chdir=terraform validate -no-color`: pass using the existing backend-disabled initialized cached-provider environment; exact output `Success! The configuration is valid.` No init, backend/state access, plan, or apply.
- Focused source/docs review: `allow-all` remains; the stale current-Flexible assertion is absent from Terraform; all three decision branches, current unknowns, origin selection, aliases/certificate, rollback, public checks, and E4 dependency are explicit.
- `git diff --exit-code -- terraform/.terraform.lock.hcl`: pass, no output. E5 retains ownership of the unused-null cleanup.
- `git diff --check`: pass, no output.

Exact command results are preserved in `evidence/e3-validation-transcript.md`. Reviewed the complete two-file diff against base `70e48d7`; no runtime Terraform value changed. Unchanged app/browser/backend suites were not repeated.

## Remaining dependency and release boundary

F19 remains open. No owner Cloudflare reply has arrived, and authenticated account SSL mode, apex/`www` proxy state, redirect configuration, matching cache rules, and Browser Cache TTL remain uninspected. Before mutation, record those complete nonsecret previous settings. Then select the documented branch, use the controller's consolidated state-backed plan for any Terraform action, and run the complete apex/`www` homepage/graph/stats/PDF/`stats.json`/actual-chunk/404/known-asset matrix with certificate validation enabled.

E4 freshness also remains dependent on the actual matching Cloudflare cache rules and Browser Cache TTL. AWS headers alone cannot establish end-to-end freshness; Cloudflare may override origin directives, and a purge does not clear existing browser caches. The release/account checks and any coordinated mutation are deliberately unperformed, so the local result is `DONE_WITH_CONCERNS`, not a claim that F19 is closed.

## Commit handoff

`796e7de` — `fix: verify encrypted site delivery end to end` (2 files, 50 insertions, 12 deletions). The tracked worktree is clean after commit; the ignored E3 report/evidence remain in the SDD workspace for controller review.

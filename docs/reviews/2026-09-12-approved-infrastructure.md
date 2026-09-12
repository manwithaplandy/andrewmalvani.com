# Approved infrastructure closeout — September 12, 2026

**Status: all four approved infrastructure changes are applied and verified.** The existing website and contact service remain live. The previous analytics processor, original daily schedule and account concurrency limit remain unchanged. The new analytics migration remains incomplete.

This follow-up supersedes the infrastructure-approval and quota-approval statements in the earlier [production release record](2026-09-12-production-release.md). It does not replace that record's backup, recovery or checked-artifact history.

## What changed

| Approved area | Result |
| --- | --- |
| Caching and compression | The existing distribution now uses separate stable-file and immutable-file cache policies and enables compression. Both policies permit origin no-cache instructions; stable shared caching is bounded at five minutes. |
| Routing and missing pages | The existing edge function normalizes page paths, preserves query parameters and redirects trailing-slash page routes. Missing pages and missing hashed assets receive the checked 404 recovery page. |
| API snapshot convergence | The existing API and named stage now use deployment `xpyhk9`. The superseded deployment `11hxml` was subsequently removed; no contact handler or API identity was replaced. |
| Recursive logging removal | The log bucket no longer writes its own access logs back into itself. Website and CloudFront access-log destinations and existing stored logs remain intact. |

The exact seven-action saved plan was applied at **15:55:15 UTC**. The already-approved predecessor deletion remained deposed after that apply; an independently reviewed one-action cleanup completed at **16:07:43 UTC**. The cleanup changed no current API deployment, stage or analytics resource. [Main apply receipt](evidence/2026-09-12-approved-infrastructure/apply-result.json), [cleanup receipt](evidence/2026-09-12-approved-infrastructure/api-cleanup-result.json), [independent cleanup review](evidence/2026-09-12-approved-infrastructure/api-cleanup-independent-review.md).

Cache clearing completed at **15:56:38 UTC**. This added one CloudFront invalidation path, increasing the recorded monthly path count from two to three within the existing free allowance. No Cloudflare configuration, website upload or new paid add-on was introduced in this follow-up. No service with a new material fixed or recurring charge was added; ordinary usage metering still applies, so this is not a promise of a zero bill. [Allowance preflight](evidence/2026-09-12-approved-infrastructure/recovery-and-invalidation-preflight.json), [invalidation request](evidence/2026-09-12-approved-infrastructure/invalidation.json), [completion](evidence/2026-09-12-approved-infrastructure/invalidation-complete.json).

## Verification and honest limits

The ordinary-browser journeys passed on both public hosts, including graph search, mobile layout, statistics, invalid contact input and the newly working missing-page recovery. All seven non-sending API checks passed. The exact statistics reader passed on both hosts against the actual legacy payload and both supported data contracts. These checks do not send an email or execute the new analytics producer. [Browser results](evidence/2026-09-12-approved-infrastructure/browser-verification.json), [API results](evidence/2026-09-12-approved-infrastructure/api-verification.json), [reader results](evidence/2026-09-12-approved-infrastructure/reader-verification.json).

The supplemental delivery helper initially reported 18 passes and four failures. Its two incorrect assumptions were a fixed ordering of independent query names and one spelling of the JavaScript MIME type. The responses preserved both repeated `tag` values and matched the checked file bytes. The independently reviewed correction still rejects changed bytes, missing parameters, reordered repeated values, wrong destinations and non-JavaScript types. A fresh run at **16:12:06 UTC passed all 22 checks**: both-host slash redirects, checked pages/PDF/current assets, missing-page and missing-asset 404/noindex, intended cache headers, and direct CloudFront cache HIT/compressed-JS observations. The original failed receipt remains separately preserved. [Initial result](evidence/2026-09-12-approved-infrastructure/delivery-initial-failure.json), [correction review](evidence/2026-09-12-approved-infrastructure/delivery-verifier-independent-review.md), [fresh passing result](evidence/2026-09-12-approved-infrastructure/delivery-verification.json).

The read-only infrastructure validator passed at **16:14:18 UTC**, confirming the applied cache policies, API deployment, routing and logging state while preserving the previous analytics code, alarm configuration, unreserved execution and enabled daily schedule. Its initial two response-interpretation errors were independently reviewed and corrected without changing production; the failed run is retained. [Infrastructure readback](evidence/2026-09-12-approved-infrastructure/infrastructure-verification.json), [initial result](evidence/2026-09-12-approved-infrastructure/infrastructure-initial-failure.json), [correction review](evidence/2026-09-12-approved-infrastructure/infra-verifier-independent-review.md).

Existing browser caches and open tabs are not cleared by these checks. Cache HIT and compression observations describe the tested requests and edges rather than every future request. HTML retains its earlier `no-transform` policy and the documented loss of injected measurement/browser-detection signals. No security or browser-identity workaround was used to make a verifier pass.

## Analytics and quota decision

The previous analytics code remains installed with no reserved concurrency and its original enabled daily schedule. The account still has total/unreserved concurrency **10/10**. The new producer never ran and produced no ledger or public-payload writes during the attempted migration.

The producer-owned `stats.json` still carries its legacy browser lifetime of **3,600 seconds** on both public hosts, and its digest remains the original `6efd7283d1cd8b5969acfad78552e84ed368b10b427604b2a77a293a0b6dd973`. The five-minute CloudFront shared-cache ceiling does not change that browser policy or the daily update schedule; it is not a promise of five-minute end-to-end statistics freshness. No statistics metadata was changed in this infrastructure-only follow-up. [Observed statistics headers](evidence/2026-09-12-approved-infrastructure/browser-verification.json).

The earlier recommendation to request an account quota of 1,001 is **withdrawn**. The workload review found a daily job with observed maximum concurrency one and seven runs during September 5–11; there is no demonstrated need for more workers. The quota request was not submitted. A revised safe handover design within the existing limits is still required and has not been implemented. This is no longer an item awaiting quota approval.

A fresh complete read-only plan confirms that the approved infrastructure has converged. Exactly two excluded analytics differences remain: allocating reserved concurrency one to the old processor, and changing the analytics alarm description. **Do not apply that full plan.** It neither installs the new producer nor satisfies the revised handover requirements. A later migration needs fresh admission, recovery and reader evidence followed by controlled, repeat and scheduled acceptance. [Final reconciliation](evidence/2026-09-12-approved-infrastructure/final-reconciliation.json), [plan review](evidence/2026-09-12-approved-infrastructure/final-reconciliation.md).

## Exact execution boundary

| Saved artifact | SHA256 | Meaning |
| --- | --- | --- |
| Seven-action targeted plan | `b0db3c653d0be847b01a17d45cfe8baa5c6fd0e3a58099b5992beb5bd424eaf2` | Applied approved website/API/logging scope; analytics excluded. |
| One-action API cleanup plan | `7166117432fade1858e1deeef8d266475609a1fac95aa15ff98fcbf108e40c98` | Applied deletion of deposed predecessor `11hxml` only. |
| Final complete read-only plan | `a1bd37d2f0731b25fb1c28b788aec7d1fcae9664c1dad89efb29258041819744` | Evidence of the two excluded analytics differences; **must not be applied**. |

API `vs7dthj3vb`, named stage `api`, distribution `EDHU4C51HW4BG`, production hostnames, origins, certificate and security-header policy are preserved. The checked website and contact artifacts remain the earlier CI 34679848934 / source `e2f891a` release; this follow-up did not rebuild or republish them. [Independent applied-plan review](evidence/2026-09-12-approved-infrastructure/plan-independent-review.md), [checked-artifact identity](evidence/2026-09-12-production-release/final-checked-artifact-identity.json).

The earlier nine-change and paused website-only plans are historical evidence, not instructions to apply. Their admission conditions and planned state have been superseded. Only the saved plans identified here were authorized for this follow-up; any future change requires a fresh plan and the appropriate prerequisites.

## Remaining work

- Design and verify the analytics transition within the existing account limits; no new producer controlled, repeated or scheduled result is claimed.
- Confirm actual inbox delivery with a real owner-authorized contact message, and separately observe a future scheduled analytics execution. Neither has been verified by this follow-up, and no automatic follow-up has been scheduled.

The local review page also returned 200 at 16:14:49 UTC with same-origin connection/form restrictions, no-store and noindex; it remains separate from production. [Local readback](evidence/2026-09-12-approved-infrastructure/local-review.json).

Selected sanitized evidence is retained in the [evidence directory](evidence/2026-09-12-approved-infrastructure/), with an [artifact provenance index](evidence/2026-09-12-approved-infrastructure/artifact-provenance.json). Private state, full plans, environment values, raw logs and table rows remain outside the tracked report.

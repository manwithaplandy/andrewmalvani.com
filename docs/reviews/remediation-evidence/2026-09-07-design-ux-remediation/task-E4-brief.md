## Task 18: E4 — Establish intentional static caching without stale releases

**Finding:** F28. **Dependencies:** E3 transport known; D3 producer/workflow changes merged before editing their cache metadata.

**Files:** CloudFront cache behaviors, upload metadata in workflow, stats object cache metadata, delivery operations record.

**Interfaces:**

- HTML, PDF and other stable-address public content: browser max-age 60 seconds and shared-cache max-age 300 seconds; minimum cache TTL 0 so explicit no-cache responses can still work.
- Content-hashed `/_next/static/*`: browser/shared max-age 31,536,000 seconds and immutable; no cookies, arbitrary viewer headers or tracking queries in the cache key.
- `stats.json`: browser max-age 60 seconds, shared max-age 300 seconds, independently published by Lambda. Preserve its ownership/exclusion in frontend deployment.
- New cache policies must agree with origin response metadata; an origin’s one-hour browser max-age is not fixed merely by changing edge TTLs. Compression support remains enabled where appropriate.

- [ ] **Step 1: Measure current behavior.** Record cache-control, Age and available cache-status headers for HTML, a hashed chunk, PDF and stats JSON across repeat requests. Inspect relevant Cloudflare cache rules as well. Report latency only as a small sample, not field Core Web Vitals or a guaranteed speedup.
- [ ] **Step 2: Prepare policies for the three classes above.** Replace the all-path CachingDisabled arrangement with deliberate path behaviors. Ignore campaign query values for these static objects without discarding query values used by client navigation. Keep origin identity/permissions intact.
- [ ] **Step 3: Align object metadata.** Update frontend uploads and the stats producer to the class-specific cache controls. Existing unchanged S3 objects may retain old metadata, so plan a scoped metadata refresh for the affected known keys; do not rewrite unrelated bucket contents.
- [ ] **Step 4: Verify a local release manifest and reviewed Terraform plan.** Check that every HTML-referenced hashed asset is included. Confirm the plan changes only caching/metadata behavior and does not replace the distribution or bucket. Test that dynamic `stats.json` remains excluded from frontend sync/deletion.
- [ ] **Step 5: Deploy and verify repeat requests plus an update.** Check the public headers/cache state, then deploy a controlled content update through the usual process and confirm it becomes visible within the declared freshness window/invalidation policy. Verify the PDF and separately refreshed stats too.
- [ ] **Step 6: Record actual measurements and commit** as `perf: define cache behavior for static site assets`. Preserve prior hashed assets for older open tabs; E5 formalizes that release ordering. Do not apply an age-only lifecycle rule that can delete an old-but-still-referenced hash.




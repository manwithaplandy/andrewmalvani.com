## Task 17: E3 — Verify and correct the transport path as a coordinated change

**Finding:** F19. **Dependency:** Read-only AWS/Cloudflare account access; no speculative account mutation.

**Files:** Delivery behavior/comments, public output definitions where useful, delivery operations record.

**Interfaces:** Produces a verified delivery diagram and mode record. Resolve distribution IDs through Terraform’s known resources or a read-only `aws cloudfront list-distributions` query restricted to IDs, domain names and aliases. Resolve Cloudflare settings through the connected account/dashboard; credentials never enter source or output artifacts.

- [ ] **Step 1: Inspect the actual configuration.** Record Cloudflare SSL mode, proxy status, hostname coverage, origin hostname, CloudFront aliases/certificate and current redirect behavior. Check public HTTPS pages plus the HTTPS origin connection with correct host/SNI. Do not infer the current mode solely from repository comments.
- [ ] **Step 2: Choose the explicit branch.** If Full (strict) is already active and origin validation succeeds, retain it and correct stale comments. If Flexible is active, prepare Full (strict) only after verifying an unexpired certificate covers the origin hostname and the HTTPS origin is reachable. If origin validation fails, identify and repair that exact certificate/hostname/reachability prerequisite before changing the mode; leave the working configuration in place meanwhile. See [Cloudflare’s Full (strict) requirements](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/).
- [ ] **Step 3: Prepare a bounded rollout and rollback record.** Save the nonsecret previous settings and define success as working homepage/graph/stats/assets with HTTPS on each hop and no redirect loop. A rollback restores the previous complete configuration, not just one redirect flag.
- [ ] **Step 4: Perform the mode transition under execution authorization.** For Flexible, move Cloudflare to the verified HTTPS origin mode first and verify traffic before tightening the CloudFront viewer policy. If redirect loops or certificate errors occur, restore the recorded coordinated settings and investigate the specific failing hop.
- [ ] **Step 5: Verify all entry paths.** Inspect HTTP-to-HTTPS behavior, the apex and any configured aliases, deep links, PDF, stats JSON and static chunks. Confirm certificate validation remains enabled; do not “verify” success by ignoring certificate errors.
- [ ] **Step 6: Update Terraform/documentation and commit** as `fix: verify encrypted site delivery end to end`. If external access prevents the live checks, retain an explicit F19 dependency with the verified code/configuration work and the exact unperformed check.




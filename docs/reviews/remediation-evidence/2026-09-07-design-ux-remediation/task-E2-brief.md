## Task 16: E2 — Stop log destinations from logging themselves

**Finding:** F18; verify F14 methodology remains accurate. **Dependency:** None on application code.

**Files:** Self-logging configuration and delivery operations record.

**Interfaces:** Retain the existing log bucket, CloudFront log destination, website-access log destination and 90-day current-object lifecycle. Only the bucket’s logging-to-itself setting is removed. AWS confirms the problem in its [logging-destination guidance](https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-server-access-logging.html).

- [ ] **Step 1: Record current logging relationships.** Inspect the current configured source/destination pairs and, with authorized read-only access, verify the destination bucket’s logging setting. Record aggregate object counts/volume by prefix; do not download or publish raw records.
- [ ] **Step 2: Prepare removal of the self-logging configuration.** Preserve the bucket and all data/lifecycle resources. A Terraform plan showing bucket replacement, deletion or unrelated retention changes is a failure for this task.
- [ ] **Step 3: Run formatting/validation and review the real plan.** The expected change disables one logging relationship and leaves normal operational log collection intact.
- [ ] **Step 4: Apply through the normal reviewed execution path and verify.** Confirm the destination bucket no longer logs to itself, while the original website/CloudFront sources still deliver logs. Existing queued deliveries may arrive briefly; do not interpret that alone as a failed change.
- [ ] **Step 5: Record follow-up evidence.** Compare subsequent prefix growth with the initial snapshot and document the observation window. If enough time has not elapsed, record that operational observation as remaining; do not claim a measured savings figure.
- [ ] **Step 6: Commit** as `fix: stop recursive access logging`, including the delivery record and any corrected methodology wording needed by D1.




## Task 19: E5 — Add nonmutating PR checks and guard deployment continuity

**Finding:** F29. **Dependencies:** A1 tooling and all relevant tests; D3 packaging changes merged. This task follows E4’s cache contract.

**Files:** New checks workflow, existing deployment workflow, shared scripts only as needed for the defined commands.

**Interfaces:**

- PR checks run with `contents: read`, without cloud secrets, state refresh, infrastructure apply or contact traffic. Reuse the same verification entry points on main.
- Frontend build output is produced once per checked commit and reused for browser tests and deployment. Do not rebuild altered source after review.
- Stats bootstrap/update archives contain `lambda_function.py`, `payload.py`, `ledger.py`; the contact archive retains only its own handler. D3 remains the source of this packaging contract.
- Upload referenced hashed assets before HTML; retain previous hashes so already-open tabs can finish navigation. Keep `stats.json` outside frontend ownership. Do not use blanket deletion to clean unrelated generated data.

- [ ] **Step 1: Add checks.yml for pull requests.** Use Node 22/Yarn Classic and Python 3.12, install locked dependencies, run both typechecks and nonmutating lint, install Chromium, build once, and run the browser/unit suites on the generated export. Install `tests/requirements.txt` and run Python tests with dummy credentials/metadata lookup disabled. Run the Node edge-function tests and Terraform formatting/validation with backend disabled; no real plan/apply is part of PR checks.
- [ ] **Step 2: Make check failures actionable.** Upload failed browser traces/screenshots and concise test logs with short retention; no raw contact or cloud data. Missing WebGL support must be visible as an environment failure or documented manual requirement, not silently counted as graph verification.
- [ ] **Step 3: Verify checks do not modify reviewed source.** Snapshot tracked source state before checks and compare afterward; ignore intended untracked test/build outputs. Confirm `lint` and typechecks no longer run formatting/autofixing. Review any external branch protection separately rather than claim this workflow automatically configures it.
- [ ] **Step 4: Integrate the same checks before main deployment.** Ensure deploy jobs depend on the passing checked artifact. Preserve OIDC only where deployment requires it. Keep provider locks and existing secret injection, and coordinate the new archive members from D3 rather than overwrite its changes.
- [ ] **Step 5: Implement safe asset ordering.** Upload content-hashed assets first with immutable metadata and without deleting previous hashes; then upload stable-address files with their short freshness policy. Explicitly exclude stats JSON. Record removed fixed-address files for scoped cleanup rather than deleting unknown bucket contents. Use the existing invalidation only after the new referenced assets are available.
- [ ] **Step 6: Verify behavior, not just workflow syntax.** Exercise a PR run without cloud secrets, a known failing regression in a temporary test branch, and a passing run. In a controlled release, keep an older tab open across deployment and verify it can still load its referenced assets; verify a fresh tab receives the new page.
- [ ] **Step 7: Commit** as `ci: verify user journeys before deploying checked artifacts`. Keep any repository-setting change distinct from merely adding workflow files.




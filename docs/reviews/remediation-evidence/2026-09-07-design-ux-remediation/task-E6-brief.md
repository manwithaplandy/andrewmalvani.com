## Task 20: E6 — Document operation and close each finding with evidence

**Finding:** F30; final cross-plan closure. **Dependency:** All completed implementation tasks and their evidence. Owner/external dependencies may be recorded as still open without blocking documentation.

**Files:** README, historical review, new remediation status file, delivery and analytics operation records. Read [LICENSE](/Users/andrew/Scripts/react-resume/LICENSE:1) and preserve the existing MIT notice and attribution.

**Interfaces:** The status file contains one row per F01–F30: status (`open`, `implemented`, `verified`, or `blocked`), owning task, commit, acceptance evidence, and any exact remaining dependency. `verified` means the required checks actually ran; a local implementation is not automatically live verification.

- [ ] **Step 1: Rewrite repository orientation.** Explain the homepage/graph/stats roles, prerequisites, locked install, local development, production build/preview, tests and lint/format differences. Explain that `stats.json` is published separately and that local missing data is expected unless tests provide fixtures.
- [ ] **Step 2: Correct licensing and historical context.** State that the project uses the existing MIT license and retain upstream attribution. Mark the older design review as historical with links to the newer report and status table; do not erase its findings or retroactively claim completion.
- [ ] **Step 3: Document operational boundaries.** Summarize contact test isolation, analytics source units/freshness, ledger-aware rollback, delivery/cache settings and how to inspect failures. Keep credentials/raw data out of examples. Record the actual discovered account-dependent configuration, not assumptions copied from the old report.
- [ ] **Step 4: Run the integrated acceptance pass.** Build the reviewed commit, run typechecks/lint/browser/unit/backend/edge tests once, and inspect desktop plus 320/390-pixel and landscape flows. Verify PDF facts against the approved record. Recheck every High finding and all affected cross-page navigation.
- [ ] **Step 5: Complete the finding ledger.** Map every report acceptance criterion to its task result. Leave owner facts, credential evidence, scheduled-update observations or unavailable account checks open with a precise dependency; do not downgrade severity just to close them.
- [ ] **Step 6: Commit documentation** as `docs: document verified UX remediation and operations`. Deliver the status ledger plus a concise summary of what changed, how it was verified, and what remains externally dependent.

## Execution verification commands

These commands assume the earlier tasks have established their declared scripts and test files, and run from the execution checkout:

```sh
yarn typecheck
yarn typecheck:tests
yarn lint
yarn build
yarn test:e2e --project=chromium
python -m unittest discover -s tests/stats -p 'test_*.py' -v
node --test tests/infra/edge-routing.test.mjs
terraform -chdir=terraform fmt -check
terraform -chdir=terraform init -backend=false -lockfile=readonly
terraform -chdir=terraform validate
git diff --check
```

Initialization/validation belongs in an isolated execution workspace. A real infrastructure plan uses the normal authorized backend and variables; it must not be confused with backend-disabled PR validation. Public verification happens after the associated release, and must be reported separately from local pass results.

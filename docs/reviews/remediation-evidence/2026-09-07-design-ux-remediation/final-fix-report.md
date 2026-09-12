# Final whole-branch fix wave — WBR-01

Base: **288a6c58a50f76fdf14ea56d5a80e444979efbcd**. This is the single controller-authorized fix wave for the whole-branch review's sole Important blocker. No subagents, branch-finishing flow, live requests, contact sends, cloud operations, separate backend/Node-release/edge suite invocations, Terraform plan or release occurred. Root owns scoped independent re-review, final ledger/archive refresh and the integration decision.

## Correction and attribution

`GraphExplorer.tsx` now delegates all three graph history writes to Next Pages Router's public shallow `push`/`replace` API with scrolling disabled. Initial default focus still replaces rather than adds a history entry; selection and chosen-mode entries still push. No private router history shape is manufactured or copied. The existing hash validation, reducer, list/3D components, focus recovery, search and camera behavior remain unchanged.

The hash writes were inherited; the remediation added the mode write using the same null-state pattern. This report does not attribute all three original lines to the branch. Installed Next 14.0.3 `router.js` shows that a null-state pop replaces metadata for the currently rendered route and returns without restoring another page. Its `changeState` creates the route/address/options/key metadata required for subsequent cross-page restoration. The public API maintains that contract.

The hash effect also waits for the public `useRouter().isReady`. Static-export query hydration performs its own initial replacement (`next/dist/client/index.js`, Container.componentDidMount). An initial public-router correction passed cross-page restoration but a deeper selection-history Back reached a hashless overview entry. The readiness guard avoids competing with that initial hydration replacement. The public singleton supplies stable imperative methods; the hook provides reactive readiness without depending on a changing router-context object for every hash synchronization.

## Meaningful RED and correction evidence

The new three-case actual-export regression separately covers initial default replacement, changed selection and a changed view. Each traverses graph → Classic resume → Back, verifies rendered graph, URL, pressed mode, expanded selection and absence of homepage content, then traverses deeper selection/mode entries and Forward to the homepage. It repeats Back and checks a document marker, so a full-page reload cannot accidentally substitute for the required same-document router journey. Real WebGL is used for the mode-entry case, and page errors must remain absent. Existing fixtures block external requests; no contact form is submitted.

- [RED identity](evidence/final-fix-red-identity.json): the unmodified existing export exactly matched all 54 E6 manifest files, SHA256 `98dcf560ecafa71245f9a3d30ab28a101440b699998d9a15e5f11bf8c01e446d`. No product source changed before RED.
- [Actual RED](evidence/final-fix-red.log): **3/3 fail** at the restored graph's presence after Back, while the preceding graph URL assertion passes. Screenshots and error contexts are retained in `evidence/final-fix-red-artifacts/`. This is the reported product failure, not a selector/setup error.
- [First corrected build](evidence/final-fix-build.log) passed. [First attempted GREEN](evidence/final-fix-green.log) is **2/3 pass, 1 fail** despite its green filename. The failure occurs on deeper Back to the initial selection; first cross-page restoration already succeeds. The source was refined only because of this concrete additional failure.
- The bounded diagnostic's first script invocation had an incorrect relative Playwright import and never started a browser: [setup output](evidence/final-fix-hydration-diagnosis.log). The corrected diagnostic recorded actual initial hydration/default-selection writes: [settled output](evidence/final-fix-hydration-diagnosis-corrected.log), [fast-selection output](evidence/final-fix-fast-history-diagnosis.log). Those diagnostic runs themselves reached the correct history; they are ordering observations, not claimed reproductions of the failed race. The failed regression plus the installed hydration path motivated the public readiness guard.
- [Final corrected build](evidence/final-fix-build-hydration.log) passed. Two builds were necessary because the first exposed the initial-entry ordering defect; there was no rebuild solely to refresh a label.
- [Final focused GREEN](evidence/final-fix-green-hydration.log): **3/3 pass**. Its screenshots are preserved in `evidence/final-fix-focused-green-artifacts/` before the complete suite's cleanup. The selection-restoration image visibly shows the graph page rather than the homepage.

## Validation commands and scope

Commands ran from the execution worktree with Node 22.16.0, Yarn 1.22.22 and the established local static preview. Exact stdout/stderr is preserved, including failures. The only product change is `src/components/Graph/GraphExplorer.tsx`; tracked test changes are its new regression in `tests/e2e/graph-access.spec.ts` and the observed contact-unmount synchronization repair in `tests/e2e/contact-submission.spec.ts`.

```sh
# Environment for the Yarn commands below:
export PATH=/Users/andrew/.nvm/versions/node/v22.16.0/bin:$PATH
export PREFIX=/private/tmp/react-resume-prefix YARN_CACHE_FOLDER=/private/tmp/react-resume-yarn-cache

env -u NO_COLOR yarn test:e2e tests/e2e/graph-access.spec.ts --project=chromium --grep 'cross-page history'
env -u NO_COLOR yarn build
env -u NO_COLOR yarn typecheck
env -u NO_COLOR yarn typecheck:tests
env -u NO_COLOR yarn lint
node node_modules/prettier/bin/prettier.cjs --check tests/e2e/graph-access.spec.ts src/components/Graph/GraphExplorer.tsx

env -u NO_COLOR STATS_TEST_PYTHON="$PWD/.venv-stats/bin/python" \
  AWS_ACCESS_KEY_ID=testing AWS_SECRET_ACCESS_KEY=testing AWS_DEFAULT_REGION=us-west-1 \
  AWS_EC2_METADATA_DISABLED=true AWS_CONFIG_FILE=/dev/null AWS_SHARED_CREDENTIALS_FILE=/dev/null \
  yarn test:e2e --project=chromium

node scripts/publish_static_site.mjs manifest --artifact-dir out \
  --manifest .superpowers/sdd/2026-09-07-design-ux-remediation/evidence/final-fix-checked-site-manifest.json
```

[Static output](evidence/final-fix-static.log): both TypeScript checks, nonmutating lint and focused formatting check pass. [Input continuity](evidence/final-fix-input-continuity.json) records the initial two focused paths changed from the base before the later test-only synchronization repair; final identity below includes that third test path explicitly. The E6 reflow components, layout/colors/fonts/data, PDF source and exported bytes, backend, infrastructure, workflows and package inputs remain unchanged. Existing visual/contrast/fact evidence and E5 package/backend/Terraform results apply through those identities; they are not called new runs.

The checked final website manifest SHA256 is **9adc540eeb85bdd1fd822f82efd8e2668cc931f587b4861d5623fdb926ad36c7**. [Manifest](evidence/final-fix-checked-site-manifest.json), [CLI output](evidence/final-fix-manifest.log). The final web is distinct from E6's prior export. Unchanged PDF SHA256 is `246239dc0c28c26121734ad9780ecb1caad83e1f6564c549b51b89db4a024fa5`; unchanged stats/contact ZIP identities are in the continuity record.

## Actual integrated result and visual replay

The first complete final run is **99/100 pass**, not a clean full-suite pass: [exact output](evidence/final-fix-browser-suite.log). All graph/navigation/reflow/motion/stats cases pass. The remaining contact cleanup assertion checks the native submitted signal immediately after the graph URL changes, before waiting for actual unmount. This was reported to the controller and corrected within the authorized contact-unmount verification scope: wait for actual `#contact` removal, then poll the actual submitted native signal. Contact product source is unchanged. Same-document proof, delayed route release/settlement and no stale feedback after returning remain asserted. Failure screenshots/error context and successful PNG/JSON artifacts are preserved in `evidence/final-fix-complete-run-artifacts/`.

[Focused cleanup plus all three history cases](evidence/final-fix-cleanup-and-history.log) pass **4/4** after that test-only synchronization repair. [Updated test static output](evidence/final-fix-cleanup-static.log) records a passing test typecheck and an optional Prettier wrapping warning. The base version also has Prettier differences. An attempted raw emitted-JavaScript identity guard rejected existing line-wrapping differences before any file write, so the unrelated whole-file formatting remains unchanged. [Boundary record](evidence/final-fix-optional-format-boundary.json). This optional formatter check is not a pass; the actual test source remains byte-identical to the passing run. Playwright discovery also executes the existing four edge VM cases, visible as TAP output; no separate Node edge/release command was run or relabeled as new targeted coverage. The complete final suite is repeated only because the first run exposed a concrete failing check; no web rebuild or unchanged backend/infrastructure rerun accompanies this test-only change. The first 99/100 result remains preserved separately.

The targeted real-clock replay completed six same-document graph/mode/homepage history steps with no page errors: [observations](evidence/final-fix-history-capture.json), [output](evidence/final-fix-capture.log), script `final-fix-capture.mjs`. Inspected captures visibly show [restored text Python details](evidence/final-fix-back-list-python.png) and [restored 3D Python geometry and details](evidence/final-fix-back-3d-python.png). No Date override is used; the capture waits for the actual canvas and its camera animation. The local capture server/browser were stopped in finally cleanup.

## Final passing result and identity

[Complete final output](evidence/final-fix-browser-suite-final.log): **100/100 pass, no skips, 3.5 minutes**, plus the four edge VM cases executed during discovery. This is the complete post-synchronization run; the earlier 99/100 run is not relabeled. All 144 recorded source/configuration/content files are unchanged before/after this run and at commit preparation. [Identity](evidence/final-fix-validation-identity.json), [source continuity and 25 preserved final PNG/JSON artifacts](evidence/final-fix-post-suite-source-check.json). No product rebuild followed the test-only synchronization correction, and no source changed after the final passing run. Both typechecks and nonmutating lint pass; only the inherited optional formatting difference described above remains.

## Self-review and remaining boundaries

Self-review checks the actual null-state mutation, correct initial replacement versus subsequent pushes, no-scroll shallow navigation, hydration readiness, existing malformed/unescaped links, reducer-driven history, focus recovery and rapid camera requests. The new tests assert visitor-visible state rather than private Next fields, preserve all external-service isolation and fail under the original history writes. There is no new content, appearance, framework, backend or release mechanism.

WBR-02 fixed-menu overlap and WBR-03 inherited Autoprefixer resolution warning remain accepted deferred Minors. The exact-PDF-URI generator guard remains optional; the current PDF's two exact targets remain verified. Owner facts, first-time-reader observation, actual OS speech/zoom/rotation/preference/background checks, GitHub execution/enforcement, authenticated Cloudflare settings, fresh approved release planning, quiescence/durable-backup proof and controlled/repeated/scheduled/public-consumer observations remain open. Local history correctness does not close those gates.

The existing committed archive and WS are left intact. Root will preserve this report, outputs and final scoped review in the final archive refresh and update the ledger; this fix does not retroactively rewrite the earlier independent “needs correction” verdict.

Final implementation commit: **f8ab5340c66e0d56f94d3837bdb681fb2e873e31**, `fix: restore graph pages across browser history`. Committed versions of all three changed files match the validated source hashes. Tracked worktree is clean; ignored report/evidence remains for the controller’s final archive refresh.

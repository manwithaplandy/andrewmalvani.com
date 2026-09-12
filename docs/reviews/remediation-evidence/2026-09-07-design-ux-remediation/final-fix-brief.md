# Final whole-branch fix wave — WBR-01

Base: 288a6c58a50f76fdf14ea56d5a80e444979efbcd. This is the single consolidated final fix wave, not another branch-finishing workflow. Root owns scoped re-review, evidence closure and the integration decision.

Read review-whole-branch-report.md first: it is the complete findings list, including exact behavior, attribution and acceptance. WBR-01 is the sole merge blocker. WBR-02 menu overlap and WBR-03 inherited Autoprefixer warning may remain explicitly deferred per that independent verdict and existing rulings; do not silently discard them or bundle unrelated navigation redesign/dependency upgrades. The exact-PDF-URI guard is optional, with current PDF link identities already verified.

## Required result

Correct graph history so graph → Classic resume → browser Back/Forward restores the correct rendered page, URL, view mode and selected node, including a view-mode history entry. Preserve valid/malformed deep-link handling, within-graph selection/history, complete text/3D information, named search, overview/camera recovery and visible focus. Respect the installed router's history contract. The hash-write mechanism was inherited; the new view-mode write extends it. Attribute the defect accurately. No architecture rewrite or new content is needed.

Evidence: evidence/whole-review-graph-history-observed.json is the recorded actual observation and export identity. evidence/whole-review-graph-history-replay.mjs is explicitly an equivalent replay helper written afterward, not the original executed script.

## Implementation and validation

Use systematic debugging and TDD. Add meaningful actual-export cross-page history regression(s), capture RED on the current checked export before source edits, then make the narrow correction across the relevant graph history writes. Verify Back and Forward from direct graph entry and after a view-mode change; assert rendered page/mode/selection as well as URL, not URL alone. Keep all external traffic and contact requests intercepted.

Build once after the correction is settled, run focused GREEN and the appropriate graph/navigation/motion/contact-unmount coverage. Because this defect crosses the app's page router and the full browser suite is short, plan one complete final Playwright pass on the corrected export, with both typechecks and nonmutating lint. Broaden/repeat only for a new change/failure/concern. Use actual progressing-clock graph captures for visual evidence. Record final runtime source identity, unchanged inputs, exact checked site manifest and a targeted Back/Forward capture/output. Existing layout/color/PDF evidence remains applicable only through explicit unchanged-input/content identity. Do not repeat unchanged backend, Node release/edge suites or a real Terraform plan; if a broader input must change, report the concrete need first.

Keep the five E6 reflow components, professional facts, services, backend, infrastructure, package/deployment contract and remaining owner/OS/account/live gates intact. Source checks and recorded evidence must remain honest; no real messages, cloud mutation/invocation, push, merge or deployment.

You are the only implementation worker. No subagents. Do not touch the index/HEAD to inspect another revision; use the current branch. Commit the focused code/tests with a clear message, write final-fix-report.md in this WS with actual commands/output, RED/GREEN, source/manifest identity, self-review and remaining deferred findings, then return HEAD and compact result. Root will package the fix diff from this BASE and dispatch one scoped independent re-review. Leave WS and the committed archive intact for root's final refresh/cleanup.

# Independent whole-branch review

**Ready to merge: No — one Important graph-navigation acceptance gap needs correction and a scoped re-review.** No Critical issue was found. Two Minor follow-ups can remain deferred with the present evidence. Production readiness is separately **not established**; the owner, accessibility, account, GitHub and approved-release gates remain open.

Reviewed on September 8, 2026 by the retained review-only agent `/root/content_and_journeys`, which did not implement any branch change. Review range: `9b7f6fe20e30784b21ee39fb5f328aafb8e713b8` → `288a6c58a50f76fdf14ea56d5a80e444979efbcd`. The supplied whole-branch package has SHA256 `7d3e376d59121e1f8d3a72833eba208bd62ca78f3dbb996bfcf5dcbe26c3a598` and 100,861 LF-indexed lines, most of which preserve historical evidence.

## Scope and method

This is the final integration review of the complete remediation, not another E6-only review. Authority is the September design/UX report, master plan and five subplans, binding constraints, chronological rulings through Ruling27, and current progress. The earlier plan-only constraint is superseded by the recorded implementation authorization; missing owner facts do not authorize invention.

I reviewed indexed source/documentation passes from the supplied diff, the cross-task contracts, the current status ledger, operation and release procedures, final E6 validation/visual records, and the controller's sanitized infrastructure and archive evidence. The independent D2/D2-fix, D3, D4, E4, E5/E5-fix reviews conducted by this same seat inform the recovery review; their current source/package continuity is recorded. I sampled eight final images independently: desktop hero, 320px work/contact, 320px enlarged dates, stats, graph overview/selected Python, and the one-page PDF. Historical screenshot/transcript archives were not treated as maintained application code or all re-executed.

One concrete remaining risk warranted a new focused check: graph history returning across a Next.js page transition. It used the existing checked static export and local Chromium, with external requests and all non-GET requests blocked. No rebuild, unchanged suite, cloud request, contact submission, production operation or application change was performed. The temporary preview was stopped afterward. Report/evidence files are the only review writes.

## Findings ranked by severity

### Important — WBR-01: Back can show the homepage under a graph URL

**Location:** [GraphExplorer.tsx:168](/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation/src/components/Graph/GraphExplorer.tsx:168), [GraphExplorer.tsx:170](/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation/src/components/Graph/GraphExplorer.tsx:170), and the new view-mode history write at [GraphExplorer.tsx:259](/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation/src/components/Graph/GraphExplorer.tsx:259). The cross-page navigation is the [Classic resume link, graph.tsx:53](/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation/src/pages/graph.tsx:53).

**What happens:** Open `/graph?view=list`, follow the visible Classic resume link, then use browser Back. The address returns to the graph URL and selected-node hash, but the conventional homepage remains rendered. The graph does not return. A visitor trying to resume an exploration loses their place and sees a page inconsistent with its address; sharing or refreshing that address behaves differently from the page currently shown.

**Focused evidence:** The executed check observed graph-present/contact-present counts of **1/0 → 0/1 → 0/1**, with the same document marker throughout. After Back, the address was `/graph?view=list#node=job%3Aga-lead-ai-ml-engineer`. The graph entry had null history state. The installed Next Pages Router treats a null-state pop as a same-page hash update and returns without loading the graph page; the resulting state paired the homepage route with the graph address. This connects the observed failure to the history writes rather than a slow page load.

The [observed result and artifact identity](/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation/.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/whole-review-graph-history-observed.json) preserve the actual tool output, checked HTML digests and evidence limits. A [focused replay helper](/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation/.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/whole-review-graph-history-replay.mjs) is provided for the implementer. The helper was recorded afterward as an equivalent reproduction and is not falsely presented as the exact original stdin script or an additional successful test run.

**Attribution:** The hash writes at 168/170 predate this branch; the new view choice at 259 extends the same null-state pattern. This is an unresolved B1 integration defect, not a claim that this branch introduced every contributing line. B1 explicitly requires browser Back behavior and Back/Forward verification ([career-graph plan:74](/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation/docs/superpowers/plans/2026-09-07-career-graph.md:74)). The existing intra-graph history and direct-load tests do not establish graph → Classic resume → Back restoration.

**Why Important:** This breaks a standard visitor action across two primary site experiences and leaves the displayed page inconsistent with the URL. It is recoverable by reloading or navigating again, so it is not Critical. It should be corrected before calling graph navigation complete or merging the remediation.

**Desired outcome:** Browser history must restore the correct page, mode and selected graph item after cross-page navigation while retaining normal within-graph navigation. Preserve the router's history contract, and verify the demonstrated graph → Classic resume → Back/Forward journey, including a mode-change entry, against the actual static export. Keep valid deep links, overview recovery and focus behavior intact. No architecture rewrite is needed.

**Confidence:** High — directly reproduced on the checked final export and explained by the installed router's actual handling.

### Minor — WBR-02: The fixed mobile menu briefly covers enlarged content while scrolling

**Location:** [Header.tsx:94](/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation/src/components/Sections/Header.tsx:94), including the scalable icon/padding at line 96.

**What happens:** At narrow widths with 200% root text, the fixed orange menu occupies a large top-right area. Content passing behind it becomes temporarily unreadable. The [final 320px date capture](/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation/.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/e6-final-text200-320-date.png) visibly covers part of the Georgia Tech/date information, despite the text now fitting the document width.

**Why Minor:** This causes avoidable reading friction, especially for a visitor who needs enlarged text. It does not recreate the persistent horizontal clipping repaired by E6: further scrolling exposes the complete text, and the recorded anchor and first-invalid-field destinations remain usable. The behavior is inherited and explicitly retained under Ruling25. The evidence supports a follow-up without blocking the demonstrated reflow improvements.

**Desired outcome:** Keep mobile navigation readily available while allowing content to remain readable at arbitrary scroll positions and the visitor's selected text size. A later navigation adjustment should be assessed at ordinary and enlarged phone text, including anchor and keyboard-focus destinations.

**Confidence:** High for the visible overlap; this review does not claim native browser zoom or physical-device testing.

### Minor — WBR-03: The inherited Autoprefixer override leaves a persistent dependency warning

**Location:** [package.json:75](/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation/package.json:75).

**What happens:** The resolution forces Autoprefixer 10.4.5 while a dependency requests `^10.4.16`. The checked install reports the mismatch ([E5 full check:4](/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation/.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/e5-full-release-check.log:4)); README now documents it accurately.

**Why Minor:** The warning weakens the clarity of an otherwise clean verification baseline and can make future dependency changes harder to assess. It predates the remediation, and the recorded build/browser checks show no resulting CSS failure. There is no evidence here for a user-visible breakage, security claim, or urgent dependency upgrade.

**Desired outcome:** Handle the override in a separate, intentional dependency-maintenance change: establish whether it is still required and align the declared dependency policy with the version actually installed, followed by relevant CSS/build verification. Retaining its current explicit deferred status is acceptable for this branch.

**Confidence:** High for the version conflict; no unsupported claim about downstream defects.

## Strengths and cross-task assessment

| Area | Assessment and reasoning |
| --- | --- |
| Architecture and scope | The conventional résumé, static export, direct email and optional separately loaded graph remain intact. Small shared components and a common motion hook address repeated behavior without a framework or design-system rewrite. The more substantial analytics changes are directly justified by the original integrity finding. |
| Responsive design and visual identity | The dark/orange hierarchy remains recognizable. The hero's action stack, stable résumé reading edge, wrapped facts/dates/long terms and responsive credentials improve access without shrinking the visitor's chosen text or removing content. The regression checks actual text ranges and internal row bounds, not merely overall document width. The final captures substantiate those improvements. |
| Graph information and discovery | Visible text/3D controls, native selectable disclosures, direct search across labels/descriptions, full selected labels and overview recovery preserve access to the complete graph. Search and text mode provide practical routes to evidence. Camera and contrast checks use actual rendered projection/materials; the frozen-clock image and withdrawn antialiased-pixel claim are not used as proof. The outstanding cross-page history issue is isolated above. |
| Contact journey | Validation directs focus and ties messages to fields. A trimmed immutable submission snapshot, immediate single-attempt guard, read-only pending fields, bounded timeout and draft-preserving uncertain-delivery feedback form a coherent interaction. SPA cleanup prevents late feedback. Direct email remains available. The test evidence uses synthetic interception; actual delivery and OS speech are not claimed. |
| Facts and credibility | Current-role dates and in-progress study are clarified across the graph/metadata/PDF. Conflicting residence/metrics, credential validity, skill meanings and project contributions remain explicitly unresolved. Project images and destinations improve without fabricated case studies or assumed ownership. The current PDF remains one page with independently recorded exact contact links. |
| Analytics reader/producer contract | The reader distinguishes requests, sums of daily uniques, independent source coverage, stale/unknown status, measured zero, missing days and provisional yesterday. The producer retains legacy fields and bounded privacy-filtered lists. Accepted Cloudflare measurements and matching metadata remain one checkpoint, so failed partial writes cannot promote unaccepted values or imply previous availability on first failure. |
| Interrupted ingestion and recovery | Deterministic bounded counter transactions carry durable completion proofs. The active-input guard is stored before partial effects, survives missing listing input, and prevents publication/cursor progress from concealing incomplete work. Uncertain writes require strongly matching proof; ordinary service/conflict failures remain errors. Only budget exhaustion takes the documented incomplete-pass path. Single-writer assumptions, nontransactional scans, record growth and unsafe old-handler rollback are explicitly disclosed. |
| Release ordering and cache ownership | Verification produces exact web/manifest/Lambda artifacts once. Terraform's removed archive generators cannot silently replace checked bytes. Recovery assets precede error-policy activation; hash uploads precede stable files; old hashes remain; `stats.json` remains producer-owned. Zero cache minima preserve error compatibility. Both bootstrap and ordinary analytics installation retain public-reader prerequisites, and the expanded admission/storage classifier requires the manual cutover boundary. |
| Evidence and operational honesty | Source/run identities distinguish the changed final web build from reused backend/package checks. The real Terraform result is explicitly a dated nonlocking observation, not deployment approval or a permanently current plan. Durable archive manifests and controller hash/round-trip checks protect historical evidence; Ruling27's archive-only whitespace exceptions do not conceal current-source warnings. The ledger preserves all 30 original IDs/severities and their outstanding acceptance dependencies. |

## Verification evidence and limits

- **Final UI:** the existing E6 log records **97/97** Chromium/browser-unit cases, no skips, at UI source `02ec761`; both TypeScript checks, nonmutating lint and corrected production build passed. The checked final 54-file site manifest has SHA256 `98dcf560ecafa71245f9a3d30ab28a101440b699998d9a15e5f11bf8c01e446d`. The review's graph/home HTML identities match that manifest. A passing suite did not cover WBR-01's cross-page journey.
- **Final visual record:** 46 recorded states and 31 DOM contrast states/541 samples, with stated actual-composition methods and minimum 7.0631:1. I inspected the eight representative images listed above; I did not independently replay all 46 captures. Selected/overview graph proof uses progressing-clock captures and the actual WebGL suite.
- **Analytics/packages/release:** the E5 full log confirms **63 outer Python cases** and the **nested 49-case extracted-archive recovery run**; these are not 112 distinct discovered cases. It also records 17 original Node release/publication/edge checks. Subsequent workflow/plan-classifier corrections have their focused final evidence, including the 12-case release/pipeline run. These results are reused through explicit unchanged-input records, not relabeled as fresh E6 backend runs.
- **Infrastructure:** the controller's one real refresh-inclusive plan at `c9a2a6f` records seven expected managed actions: two cache creates, four in-place updates and one self-logging relationship removal; no replacement or unrelated managed action. The [final input-continuity record](/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation/.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/final-infrastructure-input-continuity.json) confirms unchanged Terraform/Lambda/packager inputs and exact ZIP digests through the reviewed head. This supports continued applicability of that scope review, not an atomic state snapshot or authorization to apply it later unchanged.
- **Archive:** the controller independently verified 529 file hashes/lengths, 25 gzip round trips and safe paths with zero integrity failures. I inspected that evidence and the preservation procedure; I did not duplicate the archive-wide scan. No known secret/full-state/full-plan signature candidates were reported. These heuristics are not proof of secret absence. New reviewer/controller records still need the promised final archive refresh before this plan's scratch cleanup.

## Deferred and unverifiable boundaries

The exact-PDF-URI generator guard is an optional maintenance improvement, **not an additional defect in the current delivered PDF**. [PDF maintenance:24](/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation/docs/content/pdf-maintenance.md:24) states that the generator guards annotation count, while its explicit portable follow-up check verifies the exact mailto/LinkedIn destinations. The recorded current artifact passes those identity checks. Automating that manual guard would reduce future error opportunities, but the present evidence does not justify blocking this branch.

The original owner-dependent findings remain open: residence/metric reconciliation (F05), two substantiated project narratives (F16), skill-tier meaning (F20), and credential evidence/title/status (F24). Preserve their original severity and factual contexts until the owner supplies the missing evidence. First-time visitor discovery, actual screen-reader speech, native zoom/device rotation and OS preference/background behavior remain beyond the recorded browser emulation.

Production also requires the existing explicit gates: authenticated Cloudflare transport/cache settings; an approved fresh plan and release record; actual admission/in-flight/retry quiescence and a durable validated backup; public compatible-reader checks; controlled/repeated/scheduled analytics completion; real route/query/404/cache behavior on both hosts; and actual GitHub execution/enforcement. No-writer proof cannot be replaced by disabling one schedule, concurrency zero, or the workflow's attestation input. These are correctly recorded unfinished acceptance items, not additional claims of tested failure.

## Final assessment

**Spec compliance: Needs correction for B1's cross-page browser-history acceptance.** Apart from that demonstrated gap, the reviewed implementation aligns with the plan and its explicit rulings; remaining owner/manual/release conditions are honestly separated from local completion.

**Quality: Needs fixes before merge, limited to WBR-01.** WBR-02 and WBR-03 can remain documented Minor follow-ups. The fix should stay focused on the demonstrated history contract, with an actual export regression and the relevant graph/navigation checks; a repeated unchanged backend, infrastructure or cloud test run is unnecessary for that frontend-only correction. Reassess evidence identity if the correction touches any broader inputs.

After WBR-01 passes scoped independent re-review and the promised final evidence/ledger refresh is preserved, this review has no other identified merge blocker. That future local mergeability decision would still not mean the branch is approved for production or that all 30 original findings have been publicly closed.

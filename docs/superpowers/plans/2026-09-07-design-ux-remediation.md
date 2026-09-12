# Design and UX Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all 30 review findings through independently verifiable improvements to access, content, analytics, and delivery.

**Architecture:** Keep the existing Next.js Pages Router static export, React components, optional Three.js graph, and AWS-hosted backend. Five linked plans define small changes within those boundaries; analytics receives a compatible public-data contract and interruption-safe processing. Shared verification is introduced with the first homepage fix, then reused by the other workstreams.

**Tech Stack:** Baseline Node 22, Yarn Classic 1.22.22, Next.js 14.0.3, React 18, TypeScript 5.3.2, Tailwind CSS, Python 3.12 Lambda, DynamoDB, S3, CloudFront, Cloudflare, Terraform, GitHub Actions. Proposed development-only additions: Playwright Test and `serve`; no new production UI framework.

**Spec:** [Design and UX quality report](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07.md), reviewed revision `a1121a1`. Executors read the report and their workstream plan. Report screenshots remain the before-state evidence.

## Global Constraints

- Preserve the report’s direction: “No architectural rewrite is warranted by the reviewed evidence.”
- Preserve the graph requirement: “Preserve access to the graph’s complete information.”
- Preserve the data requirement: “Data absence and staleness remain visible; successful updates from one source do not imply that all sources are current.”
- Preserve the content requirement: “Each section contributes something distinct.”
- Keep the dark/orange visual identity, conventional résumé homepage, direct email, static export, and separately loaded graph. A light theme, new CMS, new analytics tracking script, and framework upgrade are outside this plan.
- For F17, verify at least 4.5:1 contrast for small informational text against its actual rendered background, including translucent states. A Tailwind color name alone is not acceptance evidence; check the relevant text across all three pages during E6.
- This is a plan-only deliverable. It contains test examples, contracts, and commands, but no fix implementations, honoring the earlier request against fix-code/end-state snippets.
- Keep all 30 finding IDs stable. A finding closes only when its acceptance checks pass; source inspection or compilation alone does not close a browser finding.
- Do not fabricate residence, credential validity, project ownership, private work details, or performance results. Content-specific evidence requests do not block unrelated work.
- Preserve existing messages, statistics, raw-log retention, resource identities, and historical artifacts unless a particular task explicitly describes a reviewed migration. Do not reset the statistics table to repair historical uncertainty.
- Use intercepted requests and synthetic data for tests. Sending a real contact message is not part of verification.
- Each task ends with focused verification, a reviewable diff, and one cohesive commit. Use an isolated execution checkout via `superpowers:using-git-worktrees`; carry the report and these currently untracked plan artifacts into it before starting.

---

## Plan organization and ownership

| Workstream | Plan | Independently useful deliverables |
|---|---|---|
| A — Homepage and content | [Detailed plan](/Users/andrew/Scripts/react-resume/docs/superpowers/plans/2026-09-07-homepage-content.md) | A1 responsive access and test runner; A2 reliable links/metadata; A3 consistent facts and credentials; A4 persuasive project evidence; A5 motion consistency |
| B — Career graph | [Detailed plan](/Users/andrew/Scripts/react-resume/docs/superpowers/plans/2026-09-07-career-graph.md) | B1 visible text alternative and safe links; B2 responsive layout; B3 direct discovery and overview recovery |
| C — Contact | [Detailed plan](/Users/andrew/Scripts/react-resume/docs/superpowers/plans/2026-09-07-contact-reliability.md) | C1 accessible validation; C2 bounded, draft-safe submission |
| D — Analytics | [Detailed plan](/Users/andrew/Scripts/react-resume/docs/superpowers/plans/2026-09-07-analytics-integrity.md) | D1 truthful compatible frontend; D2 source freshness and observation contract; D3 recoverable ingestion; D4 coordinated publication and historical reconciliation |
| E — Delivery and quality | [Detailed plan](/Users/andrew/Scripts/react-resume/docs/superpowers/plans/2026-09-07-delivery-quality.md) | E1 route recovery; E2 finite logging; E3 verified transport; E4 caching; E5 release checks; E6 documentation and closure |

These are 20 implementation/review units. Checkboxes separate preparation, behavioral changes, verification and commits. Split longer implementation steps into focused edits during execution; visual verification, external propagation, and owner fact gathering have variable duration. Do not report elapsed time as a guarantee or treat waiting as approval.

## File and interface boundaries

Before task execution, preserve these ownership rules:

- A owns shared content models, homepage components, asset declarations, metadata, and the shared `useReducedMotion(): boolean` hook. A3 owns the graph introduction’s factual sentence; B owns the graph page’s layout. Coordinate those edits sequentially.
- B owns graph mode, responsive layout, discovery controls, and camera recovery. It retains the existing graph data IDs and reducer-driven selection. It consumes A5’s motion hook only when A5 is available; it must not invent a second shared hook.
- C owns contact validation and submission in the existing form. It does not change SNS delivery semantics or add automatic retries.
- D owns the stats data contract, producer, consumer, backend tests, and the packaging/IAM changes required by its new Python modules. It is the sole writer of stats-related sections in the deployment workflow until its changes merge.
- E owns edge routing, log configuration, transport/cache verification, general CI, and documentation integration. E4 adjusts upload metadata and E5 integrates CI after D3’s packaging changes merge.
- A1 alone owns initial additions to `package.json`, `yarn.lock`, browser configuration, and shared test setup. Later workstreams add their own tests without reinitializing tooling.

## Dependency and execution order

1. Execute **A1** first. It repairs the highest-reach bug and introduces production-export browser testing with a blocked-by-default external network.
2. After A1, **A2**, **B1**, **C1**, and **D1** can proceed independently. Separate worktrees or carefully assigned files are required for parallel execution.
3. Follow each task’s explicit dependencies. A3/A4 require factual records before publishing new claims; other work continues while those records are gathered. A5 needs only A1 and can proceed while A3 gathers facts.
4. Complete A5 before B2 consumes the shared reduced-motion hook. B1 does not depend on it.
5. Build D1’s reader before D2’s producer; prepare and review D3’s packaging/IAM before deploying its ledger. D4 controls analytics rollout, not the generic frontend release sequence.
6. E1 and E2 can be prepared independently of frontend work, but verify E1 against the generated export. E3 requires live read-only account inspection before choosing its documented branch.
7. E4 integrates after E3 and D3’s workflow changes; E5 follows E4. E6 runs last and records actual results, remaining external dependencies, and closure evidence.

**Recommended first implementation batch:** A1 → B1 → A2 → C1. This addresses phone clipping, invisible focus, malformed graph links, broken project navigation, and contact error direction before lower-severity polish.

## Finding-to-task coverage

| Finding | Owning task(s) | Closure evidence |
|---|---|---|
| F01 | A1 | 320/390/430-pixel overflow checks and screenshots |
| F02 | B1 | Keyboard traversal with no clipped focus; visible text mode |
| F03 | B2 | Portrait/landscape help, legend, detail and exit checks |
| F04 | A2 | Architecture destination returns readable image |
| F05 | A3 | Agreed facts match homepage, graph, metadata and PDF |
| F06 | C1 | Error announcement and first-invalid-field focus |
| F07 | C2 | Delayed/error/timeout tests preserve input and prevent duplicates |
| F08 | B3, B2 | Search-to-evidence journey, complete headings, overview recovery |
| F09 | B1 | Malformed/unknown/valid node links remain usable |
| F10 | D1, D2 | Units, periods, source scope and returning-visitor fixture |
| F11 | D1, D2 | No current-day point, visible provisional/missing observations |
| F12 | D1, D2 | Missing/stale/current-zero states and frozen-payload aging |
| F13 | D3, D4 | Interruption, uncertain-response and replay tests; migration record |
| F14 | D1, E2 | Accurate public operational-log explanation |
| F15 | E1 | Production slash variants and purposeful 404 responses |
| F16 | A4 | Two fact-checked project narratives and revised ordering |
| F17 | A1, B2, C1 | Measured supporting-text contrast on actual backgrounds |
| F18 | E2 | No self-logging destination; observed post-change volume |
| F19 | E3 | Live transport verification and no redirect loop |
| F20 | A3 | Owner-agreed skill wording and clear depth definitions |
| F21 | A4 | Readable, deliberate project previews |
| F22 | A1, A3 | Stable mobile reading edge and distinct section content |
| F23 | A2 | Unambiguous document/download/navigation labels |
| F24 | A3 | Verified or explicitly historical credential presentation |
| F25 | A2 | Named footer control with page-appropriate destination |
| F26 | A2 | Stable canonical and social URL under query/hash variants |
| F27 | A5, B2 | Initial and dynamically changed motion preferences |
| F28 | E4 | Recorded cache behavior, freshness and release checks |
| F29 | A1, E5 | Nonmutating checks, PR checks and built-artifact journeys |
| F30 | E6 | Accurate README, MIT attribution and current review status |

## Decisions and factual dependencies

| Item | Current evidence | Execution rule |
|---|---|---|
| Residence | Website says Arizona; PDF says San Diego. A clarification was requested during planning. | Use the owner’s reply when received. If absent, A3 gathers confirmation before changing residence; do not infer a city or street address. |
| Project contribution | Product descriptions exist; ownership, decisions and measured outcomes are incomplete. | A4 records two approved narratives. Publish only substantiated facts; leave unverified claims out. |
| Credentials and skill meanings | Names, years and self-ratings exist; public verification and current validity are not established. | A3 requests evidence and keeps unverified validity unstated. |
| Cloudflare mode, host coverage and cache rules | Repository describes Flexible TLS; the account was not inspected. | E3 records actual state and chooses the applicable branch. D2 labels zone metrics as zone metrics unless a verified narrower query is implemented. |
| Historical statistics | Existing totals may include permanent inconsistencies; logs expire. | D4 retains the historical baseline, discloses limitations, and does not promise exact recovery of expired input. |

These are specified input-gathering steps, not instructions to invent missing content. Record any unresolved item against its owning task while completing independent work.

## Reasons for the main design decisions

- **Repair access first.** A1 and B1 address the two High findings: visitors cannot reliably use content they cannot see or reach. The first batch also includes broken destinations and validation guidance because those changes restore explicit user promises.
- **Keep 3D optional and add direct search.** The graph already provides expressive exploration. Visible text mode and search serve readers who want quick evidence while preserving that distinguishing feature.
- **Use a short read-only sending state.** C2 prevents the draft-loss condition by disallowing edits during the bounded request and explaining why. This is simpler than maintaining submitted and newer drafts simultaneously. Its acceptance check therefore verifies that attempted edits are prevented and failure restores editing; no accepted text is discarded. If continued editing during sending becomes a product requirement, revise this decision and its tests before implementation.
- **Describe measurements honestly before changing collection.** D1 can improve trust immediately with the current payload. Compatible fields and a reader-first rollout prevent a coordinated backend change from temporarily breaking the page.
- **Make new ingestion recoverable; preserve uncertain history.** D3 addresses future interruptions. D4 keeps historical discrepancies visible because expired source logs cannot be recreated reliably.
- **Retain the existing visual identity and architecture.** The audit found useful foundations. Contrast, hierarchy and responsive behavior have stronger evidence than a theme redesign, and each workstream can be evaluated independently.

## Completion and handoff

- [ ] Every F01–F30 row has a passing acceptance record or a precisely described remaining external/owner dependency.
- [ ] Browser checks use generated static output, not only the development server.
- [ ] TypeScript, nonmutating lint, production build, focused browser tests and backend tests pass on the reviewed commit.
- [ ] Data and delivery changes have verified staged rollout and rollback records.
- [ ] Existing strengths remain: direct email, one-page PDF, conventional résumé, graph fallback, privacy filters, paused offscreen particles and separately loaded 3D code.
- [ ] Review status distinguishes code complete from publicly deployed and verified.

For execution, choose **Subagent-Driven** for a fresh implementer and review per task, or **Inline Execution** for ordered batches with checkpoints. No implementation has started as part of preparing these documents.

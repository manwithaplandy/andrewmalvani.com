# Career Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the career graph accessible by keyboard, usable on small screens, and efficient for finding a specific skill or achievement.

**Architecture:** Preserve the existing graph data and shared selection reducer. Render an explicitly selected text or 3D experience, give page navigation and controls normal layout space, and add a small direct-search surface plus an overview action. Keep the expensive canvas dynamically imported.

**Tech Stack:** Existing React, TypeScript, Headless UI, react-force-graph-3d/Three.js and Tailwind; A1’s Playwright fixture.

**Spec:** [Quality report](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07.md), F02, F03, F08, F09 and graph portions of F17/F27. [Master plan](/Users/andrew/Scripts/react-resume/docs/superpowers/plans/2026-09-07-design-ux-remediation.md).

## Global Constraints

- “Preserve access to the graph’s complete information.”
- Retain all existing node IDs, connections, valid deep links, PDF and conventional résumé access, reduced-motion behavior and graphics fallback.
- Never keep a visually clipped interactive list in the tab order. Do not remove the text alternative to hide the accessibility problem.
- Treat search, text view and orientation recovery as local functions; no search service or new graph library.
- Use A1’s test fixture and A5’s motion hook. Do not reinitialize dependencies or create a second shared motion hook.
- This plan specifies behaviors and contracts without fix-code snippets.

---

## File map

| Responsibility | Files |
|---|---|
| Page frame and graph introduction | Modify [graph page](/Users/andrew/Scripts/react-resume/src/pages/graph.tsx:24); A3 owns factual sentence changes |
| Mode, hash, controls and announcements | Modify [GraphExplorer](/Users/andrew/Scripts/react-resume/src/components/Graph/GraphExplorer.tsx:1) |
| Visible text rendering | Modify [GraphListFallback](/Users/andrew/Scripts/react-resume/src/components/Graph/GraphListFallback.tsx:1) |
| Selected information | Modify [FocusPanel](/Users/andrew/Scripts/react-resume/src/components/Graph/FocusPanel.tsx:1) |
| Drawing and camera | Modify [ResumeGraphCanvas](/Users/andrew/Scripts/react-resume/src/components/Graph/ResumeGraphCanvas.tsx:397) |
| Selection reset | Modify [graphReducer](/Users/andrew/Scripts/react-resume/src/components/Graph/graphReducer.ts:1) |
| Focused search component | Create `/Users/andrew/Scripts/react-resume/src/components/Graph/GraphSearch.tsx` |
| Regression cases | Create `/Users/andrew/Scripts/react-resume/tests/e2e/graph-access.spec.ts`, `graph-layout.spec.ts`, and `graph-discovery.spec.ts` under that same test directory |


## Execution context

Work only in /Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation. Paths in the source plan point to the original checkout; map them into this worktree. The user has now authorized implementation. Do not deploy/push or change cloud settings in a task; prepare reviewable changes and record exact external dependencies. Do not invent missing factual evidence.

## Verified execution tools

Use Node 22 at /Users/andrew/.nvm/versions/node/v22.16.0/bin/node (prepend that bin directory to PATH for Yarn commands). Default PATH selected Node 26 during setup. Python 3.12.14 is available at /Users/andrew/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3. Network-bound calls may require require_escalated; AWS and GitHub credentials were verified by read-only calls outside the sandbox. See environment-notes.md for already performed live checks; do not repeat them without a new reason.

For clean subsequent validation output, use `env -u NO_COLOR` with the Node 22 PATH; B1 reported conflicting color environment warnings. If Yarn reports unwritable cache/global directories in the sandbox, select task-scoped writable temporary paths or use the already authorized escalation, rather than changing application behavior or suppressing test failures.

Verification efficiency: after focused and relevant combined checks pass on the final source, do not repeat the same unchanged suite merely to label it fresh. Rebuild/rerun only when an actual change, failure, or unresolved concern warrants it; record exactly what source/results were verified.

Runner follow-up: Yarn 1 still warned with YARN_GLOBAL_FOLDER alone in C1. A2 produced clean output using PREFIX=/private/tmp/react-resume-prefix and YARN_CACHE_FOLDER=/private/tmp/react-resume-yarn-cache plus env -u NO_COLOR. Prefer that known-working environment for subsequent checks; do not rerun completed tasks solely for this cosmetic runner warning.

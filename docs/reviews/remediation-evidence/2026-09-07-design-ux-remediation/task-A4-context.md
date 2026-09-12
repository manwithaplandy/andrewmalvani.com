# Homepage and Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the résumé readable on phones, its actions predictable, and its professional evidence consistent and persuasive.

**Architecture:** Improve the existing homepage components and shared data without replacing the design system. Introduce browser verification with the first substantive fix, keep public assets correctly typed, and use native project disclosures rather than adding another application or CMS. A shared motion-preference hook serves the homepage and graph.

**Tech Stack:** Next.js Pages Router static export, React 18, TypeScript, Tailwind, existing image assets; Playwright Test and `serve` as development-only dependencies.

**Spec:** [Quality report](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07.md), F01, F04, F05, F16, F17, F20–F27, F29. [Master plan](/Users/andrew/Scripts/react-resume/docs/superpowers/plans/2026-09-07-design-ux-remediation.md).

## Global Constraints

- “No architectural rewrite is warranted by the reviewed evidence.”
- “Each section contributes something distinct.”
- Preserve dark/orange identity, current primary actions, direct email and the printable one-page résumé.
- Use existing facts until owner evidence permits changes. Do not invent accomplishments, certification status, residence or project ownership.
- Keep all application changes within the existing major framework versions. Pin added development dependencies in the lockfile.
- Test code and commands below are verification material, not fix implementations. Pure editorial/style changes receive visual/content checks instead of artificial unit tests.

---

## File map

| Responsibility | Files |
|---|---|
| Build and browser verification | Modify `/Users/andrew/Scripts/react-resume/package.json`, `yarn.lock`, `.gitignore`; create `/Users/andrew/Scripts/react-resume/playwright.config.ts`, `tsconfig.tests.json`, and `/Users/andrew/Scripts/react-resume/tests/e2e/fixtures.ts` |
| Responsive homepage and reading | Modify [Hero](/Users/andrew/Scripts/react-resume/src/components/Sections/Hero.tsx:24), [TimelineItem](/Users/andrew/Scripts/react-resume/src/components/Sections/Resume/TimelineItem.tsx:12), [CertificationItem](/Users/andrew/Scripts/react-resume/src/components/Sections/Resume/CertificationItem.tsx:33) |
| Actions, assets and metadata | Modify [data](/Users/andrew/Scripts/react-resume/src/data/data.tsx:65), [dataDef](/Users/andrew/Scripts/react-resume/src/data/dataDef.ts:1), [image declarations](/Users/andrew/Scripts/react-resume/src/types.d.ts:1), [Footer](/Users/andrew/Scripts/react-resume/src/components/Sections/Footer.tsx:1), [Page](/Users/andrew/Scripts/react-resume/src/components/Layout/Page.tsx:36), [graph page](/Users/andrew/Scripts/react-resume/src/pages/graph.tsx:49) |
| Fact record and document source | Create `/Users/andrew/Scripts/react-resume/docs/content/professional-facts.md` and `/Users/andrew/Scripts/react-resume/docs/content/resume-source.md`; modify [siteConfig](/Users/andrew/Scripts/react-resume/src/data/siteConfig.ts:1), [PDF](/Users/andrew/Scripts/react-resume/public/assets/resume.pdf), [Skills](/Users/andrew/Scripts/react-resume/src/components/Sections/Resume/Skills.tsx:29) |
| Project evidence | Create `/Users/andrew/Scripts/react-resume/docs/content/project-evidence.md`; modify [Portfolio](/Users/andrew/Scripts/react-resume/src/components/Sections/Portfolio.tsx:1), shared project data and existing selected project images |
| Shared motion | Create `/Users/andrew/Scripts/react-resume/src/hooks/useReducedMotion.ts`; modify [Header](/Users/andrew/Scripts/react-resume/src/components/Sections/Header.tsx:1), [ParticleField](/Users/andrew/Scripts/react-resume/src/components/ParticleField.tsx:1), [Reveal](/Users/andrew/Scripts/react-resume/src/components/Reveal.tsx:1) |

Paths named without a full prefix in the first table row are in `/Users/andrew/Scripts/react-resume/`. All commands run from the execution checkout’s repository root, not the original checkout when using a worktree.


## Execution context

Work only in /Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation. Paths in the source plan point to the original checkout; map them into this worktree. The user has now authorized implementation. Do not deploy/push or change cloud settings in a task; prepare reviewable changes and record exact external dependencies. Do not invent missing factual evidence.

## Verified execution tools

Use Node 22 at /Users/andrew/.nvm/versions/node/v22.16.0/bin/node (prepend that bin directory to PATH for Yarn commands). Default PATH selected Node 26 during setup. Python 3.12.14 is available at /Users/andrew/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3. Network-bound calls may require require_escalated; AWS and GitHub credentials were verified by read-only calls outside the sandbox. See environment-notes.md for already performed live checks; do not repeat them without a new reason.

## Owner and release dependencies

The controller requested residence, metric reconciliation, credential evidence and two project narratives asynchronously. No answer has arrived as of setup. Check with the controller at task start for new input. Complete all code/design/verification work independent of these answers; preserve original factual contexts and record exact unresolved rows. External releases, shared pushes and security-setting changes require the controller’s final reviewable handoff; prepare code and read-only evidence without performing those actions. Local completion and production verification are different statuses.

For clean subsequent validation output, use `env -u NO_COLOR` with the Node 22 PATH; B1 reported conflicting color environment warnings. If Yarn reports unwritable cache/global directories in the sandbox, select task-scoped writable temporary paths or use the already authorized escalation, rather than changing application behavior or suppressing test failures.

Verification efficiency: after focused and relevant combined checks pass on the final source, do not repeat the same unchanged suite merely to label it fresh. Rebuild/rerun only when an actual change, failure, or unresolved concern warrants it; record exactly what source/results were verified.

Runner follow-up: Yarn 1 still warned with YARN_GLOBAL_FOLDER alone in C1. A2 produced clean output using PREFIX=/private/tmp/react-resume-prefix and YARN_CACHE_FOLDER=/private/tmp/react-resume-yarn-cache plus env -u NO_COLOR. Prefer that known-working environment for subsequent checks; do not rerun completed tasks solely for this cosmetic runner warning.

Read-only public-project preflight: controller opened https://jobs.andrewmalvani.com/ with web on execution date. Public Rolefit page shows a roles/search/filter interface, sign-in/up links, 500-of-500 displayed roles and a best-match sort. This supports describing the visible interface only; it does NOT establish Andrew's personal responsibility, design decisions, adoption or business results. Web returned a tool-level “not safe to open (non-retryable error)” for https://polyscannr.com/ and https://retire.andrewmalvani.com/; this is not evidence either site is broken. No sign-in or write action was attempted. Owner narratives remain pending.

Ruling: Extract PortfolioCard.tsx in A4 for the card’s link, framing and optional disclosure — importing the whole section also loads raw image data in Node, preventing the planned isolated synthetic test from exercising the actual production component — cost if wrong: one small component boundary must be maintained or folded back; no new runtime dependency or public factual claim is introduced.

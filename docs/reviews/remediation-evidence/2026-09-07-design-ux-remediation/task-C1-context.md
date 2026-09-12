# Contact Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make form errors easy to correct and make every send attempt bounded, predictable and safe for the visitor’s draft.

**Architecture:** Keep the existing controlled React form and API Gateway/SNS endpoint. Improve validation focus, announce errors, capture one submitted snapshot, temporarily make fields read-only during sending, and provide an explicit uncertain-delivery state after a timeout. Do not add storage of contact drafts or automatic resubmission.

**Tech Stack:** Existing React/TypeScript, Axios, Tailwind, A1’s Playwright browser fixture.

**Spec:** [Quality report](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07.md), F06, F07 and contact portion of F17. [Master plan](/Users/andrew/Scripts/react-resume/docs/superpowers/plans/2026-09-07-design-ux-remediation.md).

## Global Constraints

- Preserve the visible direct-email alternative and existing server-side validation.
- Keep server limits: name 100 characters, email 254 characters, message 2000 characters. Do not silently raise only the client limit.
- Tests must intercept all contact traffic. No real message or notification is part of the test plan.
- Do not store draft personal information in localStorage, analytics, logs or test artifacts.
- Network uncertainty does not prove that a message failed to reach the recipient. No automatic retry.
- Fix implementations are intentionally omitted; the plan provides precise behavior and verification code.

---

## File map

- Modify [ContactForm](/Users/andrew/Scripts/react-resume/src/components/Sections/Contact/ContactForm.tsx:1): field validation, focus, state, request lifecycle and readable counter.
- Read [contact Lambda](/Users/andrew/Scripts/react-resume/sns_publish_lambda/lambda_function.py:1): authoritative bounds and response behavior; no backend changes are required by these findings.
- Create `/Users/andrew/Scripts/react-resume/tests/e2e/contact-validation.spec.ts`: invalid-submit behavior and input bounds.
- Create `/Users/andrew/Scripts/react-resume/tests/e2e/contact-submission.spec.ts`: isolated request/response behavior.


## Execution context

Work only in /Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation. Paths in the source plan point to the original checkout; map them into this worktree. The user has now authorized implementation. Do not deploy/push or change cloud settings in a task; prepare reviewable changes and record exact external dependencies. Do not invent missing factual evidence.

## Verified execution tools

Use Node 22 at /Users/andrew/.nvm/versions/node/v22.16.0/bin/node (prepend that bin directory to PATH for Yarn commands). Default PATH selected Node 26 during setup. Python 3.12.14 is available at /Users/andrew/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3. Network-bound calls may require require_escalated; AWS and GitHub credentials were verified by read-only calls outside the sandbox. See environment-notes.md for already performed live checks; do not repeat them without a new reason.

For clean subsequent validation output, use `env -u NO_COLOR` with the Node 22 PATH; B1 reported conflicting color environment warnings. If Yarn reports unwritable cache/global directories in the sandbox, select task-scoped writable temporary paths or use the already authorized escalation, rather than changing application behavior or suppressing test failures.

Verification efficiency: after focused and relevant combined checks pass on the final source, do not repeat the same unchanged suite merely to label it fresh. Rebuild/rerun only when an actual change, failure, or unresolved concern warrants it; record exactly what source/results were verified.

Runner follow-up: Yarn 1 still warned with YARN_GLOBAL_FOLDER alone in C1. A2 produced clean output using PREFIX=/private/tmp/react-resume-prefix and YARN_CACHE_FOLDER=/private/tmp/react-resume-yarn-cache plus env -u NO_COLOR. Prefer that known-working environment for subsequent checks; do not rerun completed tasks solely for this cosmetic runner warning.

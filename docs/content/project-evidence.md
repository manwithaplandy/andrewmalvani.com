# Project evidence record

Evidence reviewed 2026-09-08. This record distinguishes visible product evidence from evidence of Andrew Malvani's personal responsibility, decisions, or results. No owner-confirmed project narratives were supplied for Task A4.

## Publication record

| Project | Evidence reviewed | What the evidence supports | What remains unsubstantiated | Publication decision |
|---|---|---|---|---|
| Rolefit | Existing `src/images/portfolio/rolefit.webp`; existing project copy in `src/data/data.tsx` at commit `249c4fc`; read-only public-page preflight recorded in `.superpowers/sdd/2026-09-07-design-ux-remediation/task-A4-context.md`. | The supplied screenshot shows ranked roles, a fit review and a tailored-résumé action. The public preflight showed a roles/search/filter interface, sign-in/up links and best-match sorting. | Andrew's responsibility, a consequential decision or constraint, and an observable result. The visible interface does not establish ownership, adoption or business impact. | Use the concise title `Rolefit` and retain purpose-oriented product copy. Do not add a `caseStudy` or move the project to the lead position until all four narrative fields are approved. |
| Polyscannr | Existing `src/images/portfolio/polyscannr.webp`; existing project copy in `src/data/data.tsx` at commit `249c4fc`. The public destination was not verified because the read-only web preflight returned a tool-level safety refusal. | The supplied screenshot shows a prediction-market dashboard with track-record and active-signal regions. The existing copy is preserved in its prior context. | Independent confirmation of the product claims, Andrew's responsibility, a consequential decision or constraint, and an observable result. The failed tool preflight is not evidence that the site is unavailable. | Retain the existing title, copy, destination and order. Do not add a `caseStudy` or move the project to the lead position until all four narrative fields are approved. |
| Retirement Simulations | Existing `src/images/portfolio/retirement_site.webp`; existing project copy in `src/data/data.tsx` at commit `249c4fc`. The public destination was not verified because the read-only web preflight returned a tool-level safety refusal. | The supplied screenshot shows a retirement success probability and percentile projection chart. The existing copy is preserved in its prior context. | Independent confirmation of Andrew's responsibility, implementation decisions, usage and outcomes. The failed tool preflight is not evidence that the site is unavailable. | Retain the existing title, copy, destination and order; do not infer a case study from the screenshot. |
| Site architecture | Existing `src/images/portfolio/website-diagram.webp`; this repository's Terraform source; the read-only AWS snapshot recorded in `.superpowers/sdd/2026-09-07-design-ux-remediation/environment-notes.md`. | The supplied diagram visibly connects WAF and CloudFront to S3, DynamoDB and SNS. Repository infrastructure includes CloudFront, S3, DynamoDB and SNS resources. | The diagram is not treated as proof that every depicted service is currently enabled; repository comments say the CloudFront WAF configuration is disabled, and the live Cloudflare mode remains unverified. | Label the destination `Site architecture`, describe it explicitly as a diagram, and contain the full image rather than cropping it. |
| Source for this site | Existing GitHub destination and project copy in `src/data/data.tsx` at commit `249c4fc`; the current repository source. | The destination is presented as source for this React and Next.js résumé site. | No additional ownership, adoption or outcome claim is inferred from repository access. | Replace the generic `GitHub` card title with `Source for this site`; retain the existing destination and order. |

## Narrative publication gate

`PortfolioItem.caseStudy` accepts exactly four approved strings: `problem`, `contribution`, `decision`, and `outcome`. The portfolio renders those fields in a native `details`/`summary` disclosure named `Project details`, beside the ordinary project link.

No current item supplies `caseStudy`. A project narrative may be added only when every factual claim has a cited source or explicit owner confirmation. Partial evidence about a visible interface is insufficient for the contribution, decision and outcome fields.

## Open acceptance items

- F16 remains open. Two approved project narratives are unavailable, so the page cannot yet explain Andrew's contribution to two leading projects.
- The planned Rolefit, Polyscannr, Retirement Simulations, Site architecture, Source for this site ordering remains contingent on approved Rolefit and Polyscannr narratives. The existing order is preserved.
- A reviewer cannot yet explain Andrew's contribution to Rolefit or Polyscannr from the page without inventing information. This is the correct result while the evidence gate is unmet.
- F21's image-presentation work uses the supplied screenshots without bitmap edits: product screenshots remain cropped to their centered card-size interface views, while the architecture diagram uses `object-contain` so its complete structure remains visible.

## Verification boundary

The disclosure's positive path was checked with temporary synthetic `caseStudy` values during local browser testing. That fixture was isolated to the test cycle and removed before the final build; it is not approved narrative content and is not published. The permanent browser test verifies that the real project destinations remain ordinary links and that no unapproved disclosures render.

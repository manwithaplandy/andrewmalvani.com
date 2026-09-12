## Task 6: A4 — Present relevant, substantiated project evidence

**Findings:** F16, F21. **Dependency:** A3 shared data edits complete; unconfirmed residence does not block project work.

**Files:** Modify Portfolio, `PortfolioItem`, project data and the relevant existing images. Create `/Users/andrew/Scripts/react-resume/docs/content/project-evidence.md`. Extend `/Users/andrew/Scripts/react-resume/tests/e2e/navigation.spec.ts` only for disclosure/navigation behavior.

**Interfaces:**

- Consumes: existing five project destinations and screenshots; A2’s correctly typed image URLs.
- Extends `PortfolioItem` with optional `caseStudy` containing four strings: `problem`, `contribution`, `decision`, `outcome`. These are approved factual prose, not automatically generated claims.
- Produces: a native `details/summary` disclosure named `Project details` for projects with approved narratives. The demo/repository link and disclosure are separate controls; never nest an interactive disclosure inside a card-wide link.

- [ ] **Step 1: Collect two project narratives.** For Rolefit and Polyscannr, record the user problem, Andrew’s actual responsibility, one consequential decision/constraint, and an observable result. Attach a source or owner confirmation to every factual claim. If either cannot be substantiated, use another project with available evidence; do not publish invented adoption or business impact.
- [ ] **Step 2: Set evidence-oriented ordering and labels.** Lead with Rolefit and Polyscannr once their narratives are approved, then Retirement Simulations, architecture, and source. Name the current GitHub destination `Source for this site` so it accurately describes the repository. Use `Rolefit` as the concise project title and its purpose in supporting copy.
- [ ] **Step 3: Add the narrative disclosures.** Show the four labeled parts under their project without requiring an external visit. Keep demo/source links usable as ordinary links, preserve focus styles, and make card hover effects consistent with the actual interactive areas.
- [ ] **Step 4: Refresh image presentation.** Choose useful crops of the supplied product screenshots that communicate the key interface at card size; show the complete architecture diagram with containment where it carries structural meaning. Preserve source screenshots and aspect ratios. At execution time use the image-editing skill/tool if altering bitmap contents; CSS framing does not require image generation.
- [ ] **Step 5: Verify the actual reading journey.** On phone and desktop, open each disclosure by keyboard, follow its separate link, and return. Ask a reviewer to explain Andrew’s contribution to the two leading projects using only this page. Check thumbnails at their rendered size, not zoomed full-resolution images.
- [ ] **Step 6: Build, typecheck, lint and commit** as `content: surface project ownership and engineering decisions`. Include evidence notes with the factual changes; F16 remains open if two approved narratives are unavailable.




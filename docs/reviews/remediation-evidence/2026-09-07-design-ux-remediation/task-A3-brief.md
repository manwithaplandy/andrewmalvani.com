## Task 5: A3 — Reconcile professional facts, credentials and skill language

**Findings:** F05, F20, F24; editorial portion of F22. **Dependency:** A2. Coordinate graph introduction edits before B2 modifies its layout.

**Files:** Modify shared content, siteConfig, graph introduction, Skills, CertificationItem and PDF. Create the two fact/document source files in the map. No automated test is required merely to assert chosen prose.

**Interfaces:**

- Consumes: current role date `June 2024 - Present`, employer tenure from the existing timeline, Georgia Tech `Expected 2028`, and the owner’s location clarification.
- Produces: `docs/content/professional-facts.md` containing approved residence wording, job/employer dates, education status, metric interpretations, and credential evidence with verification date. `docs/content/resume-source.md` contains the complete editable résumé text used for the PDF.
- Extends `Certification` with `verificationUrl?: string` and `status?: 'current' | 'historical'`; populate them only with evidence. Existing `date` is labeled according to its confirmed meaning. No fabricated credential IDs or expiry dates.

- [ ] **Step 1: Build the fact record.** Copy each conflicting assertion and its source into a table with columns fact, approved wording, evidence, and confirmed date. Resolve residence from the owner’s reply; if none has arrived, request it at this task and keep only this fact-dependent work open. Ask for credential URLs/status and the meaning of years; record unavailable evidence as “not supplied,” not as a current credential claim.
- [ ] **Step 2: Reconcile metrics without inventing equivalence.** Have the owner resolve the PDF’s `$50m ROI` versus the website’s spend avoidance, and `90%` deployment improvement versus days-to-minutes. Preserve each verified metric’s unit and scope. Where no clarification is available, retain the existing fact in its original context rather than combine it into a stronger claim.
- [ ] **Step 3: Correct role and education presentation.** Label the graph sentence with current-role start June 2024, or explicitly separate “Career since 2018” from the current role. Keep the degree’s expected completion visible; represent in-progress education as study rather than completed alumni status in machine-readable metadata. Apply the approved residence consistently.
- [ ] **Step 4: Make sections contribute distinct information.** Keep the hero’s concise role/scale pitch; make About focus on the psychology-to-engineering progression and current focus. Keep quantified work outcomes in the timeline. Do not remove a quantified achievement merely to shorten the page.
- [ ] **Step 5: Define skill depth and credential meaning.** Present Familiar as limited hands-on exposure, Proficient as independent delivery, and Expert as repeated delivery plus design/debugging responsibility. Ask the owner to confirm these meanings against the current tiers; adjust only with that agreement. Provide the definition once per skills context. Link credentials with supplied verification evidence; otherwise retain historical year information without asserting current validity.
- [ ] **Step 6: Regenerate the PDF from the editable source.** Use the PDF skill at execution time. Preserve one-page readability, text selection, working email/LinkedIn links and existing accomplishments. Use its render-and-inspect workflow; do not overwrite the PDF with an unreviewed visual result.
- [ ] **Step 7: Perform a cross-format fact check.** Compare homepage, graph introduction, metadata, editable résumé source, and rendered PDF against each approved fact row. Check the longest credential and skill labels at 320 pixels. Record unresolved factual dependencies explicitly and do not mark F05/F24 closed until their affected assertions are reconciled.
- [ ] **Step 8: Run build/typechecks/lint and commit** as `content: reconcile professional facts across resume views`, including the updated source document and PDF together.




# Professional fact record

Source comparison performed 2026-09-07. "Confirmed date" distinguishes facts supported by the existing source set from owner confirmations. No owner confirmation or credential verification evidence had been supplied at the comparison date.

| Fact | Approved wording | Evidence | Confirmed date |
|---|---|---|---|
| Residence | No approved wording yet. Publication rule: retain "Arizona" in existing website contexts and "San Diego, CA 92131" in the PDF context until the owner resolves the conflict. | `src/data/data.tsx` homepage metadata, hero, and About location; `public/assets/resume.pdf` at commit `e68ab16`, page 1, contact line. | Not confirmed |
| Current role | "Lead AI/ML Engineer, General Atomics - June 2024 - Present." | `src/data/data.tsx` current experience row. | Source-checked 2026-09-07 |
| General Atomics tenure | "General Atomics - February 2023 - Present," separated into Systems Administrator (February 2023 - June 2024) and Lead AI/ML Engineer (June 2024 - Present). | `src/data/data.tsx` two General Atomics rows; prior PDF combines the employer tenure beginning February 2023. | Source-checked 2026-09-07 |
| Career start | "Career history begins in 2018." This must not be attached to the current General Atomics role. | Earliest `src/data/data.tsx` experience row starts April 2018. | Source-checked 2026-09-07 |
| Georgia Tech education | "M.S. in Computer Science, Georgia Tech - in progress, expected 2028." Metadata treats Georgia Tech as current study, not completed alumni status. | `src/data/data.tsx` education row says "Expected 2028"; `public/assets/resume.pdf` at commit `e68ab16`, page 1, says "In Progress." | Source-checked 2026-09-07 |
| Enterprise AI chatbot metric | "Avoided $15M in annual spend by developing an in-house, DoD-compliant enterprise AI chatbot." | Website current-role timeline and `public/assets/resume.pdf` at commit `e68ab16`, page 1, use the same chatbot scope and annual spend-avoidance unit. | Source-checked 2026-09-07 |
| Self-service agent platform metric | "Achieved $50M ROI from labor-efficiency gains by developing a self-service agent platform." Keep separate from chatbot spend avoidance. | `public/assets/resume.pdf` at commit `e68ab16`, page 1, self-service-agent bullet. This claim does not currently appear in the website timeline. | Source-checked 2026-09-07; scope not owner-confirmed |
| Deployment improvement | No unified wording approved. Retain "from days to minutes" in the website timeline and "reduced deployment time by 90%" in the PDF context; do not equate them without owner confirmation. | `src/data/data.tsx` current-role deployment bullet; `public/assets/resume.pdf` at commit `e68ab16`, page 1, deployment bullet. | Not confirmed |
| Multi-agent workflow improvement | "Reduced manual processing time by 90% across key business workflows with autonomous multi-agent systems." This is a processing-time metric, not the deployment metric. | Website current-role timeline and `public/assets/resume.pdf` at commit `e68ab16`, page 1, multi-agent bullet. | Source-checked 2026-09-07 |
| AWS Solutions Architect Associate | Credential listed with Amazon Web Services; year listed: 2024. Verification URL, status, and meaning of the year were not supplied. | `src/data/data.tsx` certification row. | Not confirmed |
| HashiCorp Terraform Associate | Credential listed with HashiCorp; year listed: 2023. Verification URL, status, and meaning of the year were not supplied. | `src/data/data.tsx` certification row. | Not confirmed |
| Azure credential name | No unified title approved. Preserve "Azure AI Engineer" with year listed 2025 on the website and "Azure AI Engineer Associate" without a year in the PDF; verification URL, status, the correct title, and meaning of the website year were not supplied. | `src/data/data.tsx` certification row; `public/assets/resume.pdf` at commit `e68ab16`, page 1, certification column. | Not confirmed |
| Skill tiers and ratings | Proposed definitions awaiting owner approval: Familiar = limited hands-on exposure; Proficient = independent delivery; Expert = repeated delivery plus design/debugging responsibility. Existing tiers and ratings remain unchanged; the proposed definitions are not published. | `src/components/Sections/Resume/Skills.tsx` maps existing numeric values to tiers. No owner confirmation was supplied. | Not confirmed |

## Cross-format publication check

| Surface | Role and dates | Residence | Education | Metrics | Credentials and skills |
|---|---|---|---|---|---|
| Homepage | Current role begins June 2024; General Atomics tenure begins February 2023. | Existing Arizona wording retained pending confirmation. | Expected 2028 remains visible. | Quantified achievements remain in their original timeline contexts. | Years are labeled "Year listed"; verification and status render only when evidence is supplied. Existing skill tiers remain unchanged and undefined pending owner approval. |
| Career graph | Introduction says the current role began June 2024, rather than implying General Atomics tenure since 2018. | Inherits website metadata; existing Arizona wording retained. | Georgia Tech description remains expected 2028. | Existing graph metrics retain their original scopes. | Credential nodes use neutral "year listed" language and state that verification/status evidence is not supplied. |
| Machine-readable metadata | Current job title derives from the June 2024 role. | Existing Arizona value retained pending confirmation. | UCSB remains alumni history; Georgia Tech is represented as current study with expected completion. | No metric claims are added. | No current credential status is asserted. |
| Editable resume and PDF | General Atomics roles are separated at June 2024. | Existing San Diego PDF context retained pending confirmation. | Georgia Tech is explicitly in progress, expected 2028. | Both $15M chatbot spend avoidance and $50M self-service-agent ROI remain distinct; the PDF retains its original 90% deployment wording. | The PDF retains its original two credential names without dates, status, or verification claims. Skill tiers do not appear in the PDF. |

## Open owner rows

- F05 remains open for residence and for reconciliation of deployment wording across formats.
- The exact organizational scope and measurement basis for the $50M self-service-agent ROI remain unconfirmed; it is retained only in the PDF context where it already appeared.
- F20 remains open until the tier definitions and each current rating are confirmed.
- F24 remains open until credential verification URLs, current/historical status, each website year's meaning, and the exact Azure credential title are supplied.

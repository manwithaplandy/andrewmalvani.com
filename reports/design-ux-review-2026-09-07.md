# Design and UX quality report

**Repository:** react-resume · **Reviewed revision:** a1121a1 · **Date:** September 7, 2026, America/Phoenix

**Scope:** Current homepage, career graph, analytics page, downloadable résumé, shared design, accessibility, content, frontend architecture, data processing, delivery configuration, and repository presentation. Three subagents independently reviewed content and visitor journeys, accessibility and graph interaction, and engineering and data reliability. The primary reviewer verified layouts, navigation, public responses, and build health, then consolidated and ranked the findings.

## Overall assessment

The site has a convincing desktop presentation: a recognizable orange accent, restrained dark surfaces, readable primary typography, and an opening that immediately communicates role, employer, and enterprise scale. The conventional résumé, direct email, and downloadable PDF give visitors useful ways to act. The underlying structure is appropriate for a personal portfolio; a wholesale redesign or framework rewrite is not justified by this review.

The largest weaknesses are **mobile layout, keyboard access, and consistency between what the interface promises and what it delivers**. The homepage clips at narrow widths. The graph sends keyboard focus into invisible controls and crowds its navigation. A featured project destination is broken. Professional facts and analytics labels need reconciliation. These deserve attention before further visual embellishment.

There are **30 consolidated findings: 2 High, 17 Medium, and 11 Low**. No Critical issue was substantiated in the reviewed scope. This is not a comprehensive security certification or a claim that untested environments are defect-free.

The assessment assumes the main audiences are recruiters, hiring managers, and technically curious visitors. Subjective recommendations are reasoned judgments, not results from interviews, conversion experiments, or visitor recordings.

## How to read the ranking

| Severity | Meaning in this report |
|---|---|
| Critical | Broad failure of the primary experience or similarly severe demonstrated harm. None established. |
| High | A repeatable barrier to reading or operating the site for an important audience or common viewport. |
| Medium | Meaningful task friction, misleading information, broken recovery, or a concrete reliability risk; alternatives usually remain available. |
| Low | Local polish, clarity, persuasive strength, maintenance, or an optimization whose real-world impact has not been measured. |

Findings are ordered by severity, then practical impact, reach, and strength of evidence. A serious effect with a narrow trigger can rank Medium; an optional visual preference does not become High simply because it is prominent. Each entry states the observation, why its rank is justified, a desired outcome, an acceptance check, and evidence. Acceptance checks are future verification criteria, not claims that changes were made.

**Evidence labels:** “Confirmed” means reproduced in a browser, directly established in source, or demonstrated in an isolated test, as specified. “Evaluation” identifies a design judgment. “Configuration risk” means the repository establishes the arrangement but its current operational consequences were not independently measured.

## Ranked findings

| ID | Severity | Finding | Basis |
|---|---|---|---|
| F01 | High | Homepage overflows and clips on phones | Browser + source |
| F02 | High | Keyboard focus enters an invisible graph list | Browser + source |
| F03 | Medium | Graph overlays obscure help, navigation, and content | Browser + source |
| F04 | Medium | Architecture portfolio card has a broken destination | Browser + source |
| F05 | Medium | Professional facts disagree across résumé views | Browser + PDF + source |
| F06 | Medium | Invalid contact submissions do not direct users to errors | Keyboard + source |
| F07 | Medium | Pending contact requests can stall or discard later edits | Source-confirmed conditional behavior |
| F08 | Medium | Graph makes specific evidence difficult to find | Browser + evaluation |
| F09 | Medium | A malformed graph link causes an uncaught failure | Browser + source |
| F10 | Medium | Analytics labels combine incompatible measurements | Live page + isolated test + source |
| F11 | Medium | Incomplete days appear as a traffic decline | Live page + isolated test + source |
| F12 | Medium | Missing or stale analytics can look valid and current | Source-confirmed conditional behavior |
| F13 | Medium | Interrupted aggregation can permanently lose counts | Isolated failure test + source |
| F14 | Medium | Privacy wording overstates the absence of collected data | Public copy + configuration |
| F15 | Medium | Trailing slashes and missing pages return raw access errors | Public HTTP responses + source |
| F16 | Medium | Portfolio order and content understate the strongest work | Content + evaluation |
| F17 | Medium | Some small informational text has insufficient contrast | Calculated contrast + source |
| F18 | Medium | Log storage is configured to generate logs about itself | Configuration + AWS guidance |
| F19 | Medium | Documented delivery path includes an unencrypted connection | Configuration risk |
| F20 | Low | Skill self-ratings lack a clear meaning | Content + evaluation |
| F21 | Low | Portfolio previews are inconsistent and hard to inspect | Browser + evaluation |
| F22 | Low | Long mobile reading sections are difficult to scan | Browser + evaluation |
| F23 | Low | “Resume” labels imply two different actions | Browser + source |
| F24 | Low | Certification cards do not support verification | Content + source |
| F25 | Low | Footer’s upward link has no accessible name | Browser + source |
| F26 | Low | Canonical page addresses retain tracking and section details | Browser + source |
| F27 | Low | Reduced-motion behavior is incomplete | Source |
| F28 | Low | Static delivery bypasses CloudFront caching | Configuration; performance unmeasured |
| F29 | Low | Quality checks miss important behavior and alter checked files | Workflow + source |
| F30 | Low | Repository documentation leaves an unfinished impression | Documentation |

### F01 — High: Homepage overflows and clips on phones

**Observed:** At a 390-pixel viewport, the document measured 427 pixels wide. At 320 pixels, it measured 392 pixels. The hero’s content and action row extend beyond the available width; at 320 pixels, opening copy and outer buttons are visibly cut off. This is present at ordinary text sizing.

**Why High:** The first screen is a primary reading and conversion surface. Phone users should not have to pan horizontally to read the introduction or reach actions. This also affects people using narrow windows or enlarged desktop content. W3C’s [reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) uses a 320 CSS-pixel width for ordinary vertically read content.

**Desired outcome:** The entire introduction and every action remain readable and operable within the viewport.

**Acceptance check:** At 320, 390, and 430 pixels, and with enlarged text, no ordinary homepage content requires horizontal scrolling or loses text at either edge.

**Evidence:** [Hero layout](/Users/andrew/Scripts/react-resume/src/components/Sections/Hero.tsx:24), [action row](/Users/andrew/Scripts/react-resume/src/components/Sections/Hero.tsx:36), [320-pixel screenshot](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07/homepage-mobile-320.png), [390-pixel screenshot](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07/homepage-mobile-390.png). **Confidence: high; browser-confirmed.**

### F02 — High: Keyboard focus enters an invisible graph list

**Observed:** The initial 3D graph contains 82 normally focusable buttons inside a visually hidden list. Tabbing from the visible “Next connection” control lands on an invisible “Lead AI/ML Engineer” button. Further tabs continue through invisible entries. The hidden container measures one pixel square, and focusing its children does not reveal it.

**Why High:** Sighted keyboard users lose their place and cannot see what Enter will activate. The text alternative is valuable, but its current presentation creates an access barrier. The list’s tree semantics also imply an interaction model that its buttons do not fully provide. This conflicts with the purpose of [visible keyboard focus](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html).

**Desired outcome:** A visitor can deliberately choose a visible text experience, and every keyboard stop has an understandable visible location. Preserve access to the graph’s complete information.

**Acceptance check:** Traverse the graph using only the keyboard; no focus disappears into clipped content, and the text alternative’s announced interaction matches its behavior.

**Evidence:** [Hidden list](/Users/andrew/Scripts/react-resume/src/components/Graph/GraphListFallback.tsx:28), [focusable entries](/Users/andrew/Scripts/react-resume/src/components/Graph/GraphListFallback.tsx:76), [keyboard evidence](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07/graph-keyboard-evidence.json), [focused screenshot](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07/graph-invisible-focus.png). **Confidence: high; browser-confirmed.**

### F03 — Medium: Graph overlays obscure help, navigation, and content

**Observed:** At 390×844, the onboarding hint overlaps the introductory explanation and Legend control. Dismissing it leaves other controls overlapping the introduction; opening the legend covers the résumé/PDF links. At 844×390, expanding the role details creates a roughly 370-pixel card whose top extends above the viewport and covers those exit links.

**Why Medium:** Learning the graph and returning to the résumé become unnecessarily difficult at common phone orientations. This is more than visual crowding, but the conventional résumé remains available as a separate page and overlays can sometimes be dismissed.

**Desired outcome:** Navigation, help, and selected details occupy readable areas and remain independently operable in portrait, landscape, and enlarged-text views.

**Acceptance check:** Open and close each overlay in both orientations; none hides essential controls or requires guessing what sits behind it.

**Evidence:** [Graph introduction](/Users/andrew/Scripts/react-resume/src/pages/graph.tsx:41), [controls](/Users/andrew/Scripts/react-resume/src/components/Graph/GraphExplorer.tsx:271), [detail panel](/Users/andrew/Scripts/react-resume/src/components/Graph/FocusPanel.tsx:68), [portrait evidence](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07/graph-mobile-overlap.png), [landscape evidence](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07/graph-short-expanded.png). **Confidence: high; browser-confirmed.**

### F04 — Medium: Architecture portfolio card has a broken destination

**Observed:** The “andrewmalvani.com” card promises an architecture diagram, but its rendered destination is `[object Object]`, rather than an image address. The image is visible as a thumbnail, so the card looks legitimate before it is activated.

**Why Medium:** This breaks an explicit promise in the portfolio and prevents inspection of a featured artifact. It is a localized failure, with other projects and contact paths still available. Passing compilation does not establish that a displayed link leads somewhere useful.

**Desired outcome:** Activating the card opens a readable architecture artifact whose destination agrees with the label.

**Acceptance check:** Activate the card from a built site on desktop and mobile; the full diagram opens successfully with useful context.

**Evidence:** [Project destination](/Users/andrew/Scripts/react-resume/src/data/data.tsx:255), [card link](/Users/andrew/Scripts/react-resume/src/components/Sections/Portfolio.tsx:27), [portfolio screenshot](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07/portfolio-desktop.png). **Confidence: high; rendered destination confirmed in browser.**

### F05 — Medium: Professional facts disagree across résumé views

**Observed:** The homepage describes Andrew as Arizona-based; the downloadable résumé’s contact header says San Diego, CA 92131. The graph introduces “Lead AI/ML Engineer, General Atomics · since 2018,” although the listed General Atomics employment begins in 2023 and the current role in June 2024. The graph’s year is actually the start of the earliest listed job.

**Why Medium:** Location and tenure affect recruiter screening. Conflicting answers can make a current profile appear outdated or overstated. The review does not establish which residence is correct or challenge the underlying achievements.

**Desired outcome:** Residence, employer location, career start, and current-role start are distinct and consistent across the website, graph, PDF, and metadata.

**Acceptance check:** Compare these facts across all representations; a reader should not infer employment at General Atomics in 2018. Reconcile other differing résumé metrics during the same editorial pass without assuming that different wording is false.

**Evidence:** [Homepage location](/Users/andrew/Scripts/react-resume/src/data/data.tsx:75), [graph heading](/Users/andrew/Scripts/react-resume/src/pages/graph.tsx:45), [role timeline](/Users/andrew/Scripts/react-resume/src/data/data.tsx:307), [PDF, page 1](/Users/andrew/Scripts/react-resume/public/assets/resume.pdf), [PDF rendering](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07/resume-pdf.png). **Confidence: high.**

### F06 — Medium: Invalid contact submissions do not direct users to errors

**Observed:** With the fully loaded form, pressing Enter on “Send Message” while fields are empty produces three inline errors. Focus remains on Send, and no error summary is announced through the existing live regions. The field associations help once the visitor reaches each field again.

**Why Medium:** Contact is a primary task. A screen-reader user may receive little explanation of why submission stopped and must navigate backward to discover what needs attention. Actual screen-reader speech was not tested; the focus and announcement behavior was verified.

**Desired outcome:** Failed validation immediately communicates the problem and provides an obvious path to correction.

**Acceptance check:** Submit incomplete and invalid forms using a keyboard and a screen reader; the reason for failure is clear without searching backward through the whole form.

**Evidence:** [Validation response](/Users/andrew/Scripts/react-resume/src/components/Sections/Contact/ContactForm.tsx:95), [inline error output](/Users/andrew/Scripts/react-resume/src/components/Sections/Contact/ContactForm.tsx:156). **Confidence: high for browser/source behavior; assistive-technology speech remains to be verified.**

### F07 — Medium: Pending contact requests can stall or discard later edits

**Observed:** There is no application-defined end to a stalled send request. The Send button stays disabled while it is pending, but fields remain editable. If a visitor changes their message during that time, a successful response clears the current fields, including edits made after the original message was sent.

**Why Medium:** These conditions can leave a visitor uncertain whether a message was delivered or cause unsent text to disappear. Direct email is a useful fallback, and the normal failure path preserves input, so this is a conditional reliability problem rather than evidence that ordinary submissions fail.

**Desired outcome:** Sending reaches an actionable result within a defined interval; edits made after submission are never silently discarded.

**Acceptance check:** Use a simulated delayed response and a stalled connection. Edit text while waiting, then resolve the original request; verify the visitor can distinguish submitted text from any remaining draft.

**Evidence:** [Send and reset behavior](/Users/andrew/Scripts/react-resume/src/components/Sections/Contact/ContactForm.tsx:106), [message field](/Users/andrew/Scripts/react-resume/src/components/Sections/Contact/ContactForm.tsx:189), [sending state](/Users/andrew/Scripts/react-resume/src/components/Sections/Contact/ContactForm.tsx:221). **Confidence: high from source; delayed submission was not exercised against the live service.**

### F08 — Medium: The graph makes specific evidence difficult to find

**Observed:** The initially selected role has 29 connections. Labels overlap and distant labels become small or leave the viewport. On phones, the current role dominates the canvas. Connections can be scanned individually, but there is no visible search, category selection, text-view choice, or overview reset. Long detail headings remain truncated even after “Show more.”

**Why Medium:** The graph can delight an exploratory visitor, but someone verifying one skill or achievement has to learn navigation and inspect many nodes. The density and missing direct path are observed; the effect on recruiter preference is an evaluation.

**Desired outcome:** Preserve optional exploration while offering a clear route to a named item and a dependable way to regain orientation. Selected details should expose the complete name.

**Acceptance check:** Ask a first-time reader to find one skill and its associated achievement, then return to an overview, without prior instruction or repeated trial and error.

**Evidence:** [Graph controls](/Users/andrew/Scripts/react-resume/src/components/Graph/GraphExplorer.tsx:270), [connection navigation](/Users/andrew/Scripts/react-resume/src/components/Graph/FocusPanel.tsx:118), [truncated title](/Users/andrew/Scripts/react-resume/src/components/Graph/FocusPanel.tsx:86), [desktop graph](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07/graph-desktop.png). **Confidence: high on observations; moderate on audience impact.**

### F09 — Medium: A malformed graph link causes an uncaught failure

**Observed:** Loading `/graph#node=%` produces an uncaught “URI malformed” error. The local development error screen replaces the graph. The same decoding is used when entering the page and changing its location fragment.

**Why Medium:** A damaged or manually edited shared link can make the page unusable instead of falling back gracefully. The trigger is narrow, which limits severity despite the complete failure when it occurs. The development overlay itself is not presented as the production appearance.

**Desired outcome:** Invalid node addresses resolve to a usable default or a clear recovery state, with résumé navigation available.

**Acceptance check:** Open malformed, unknown, empty, and valid node links in a production build; the page remains usable in every case.

**Evidence:** [Node address parsing](/Users/andrew/Scripts/react-resume/src/components/Graph/GraphExplorer.tsx:42), [initial handling](/Users/andrew/Scripts/react-resume/src/components/Graph/GraphExplorer.tsx:67), [failure screenshot](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07/graph-malformed-link.png). **Confidence: high; reproduced locally.**

### F10 — Medium: Analytics labels combine incompatible measurements

**Observed:** “Unique visitors” is a sum of daily unique counts, so a returning visitor can count again on each day. Countries count requests, not people or filtered page views. The collection periods differ as well. The live page showed 57,535 page views, 37,253 “unique visitors,” and 121,434 requests for the US alone, without explaining why those figures differ so much. A local test confirmed that one unique visitor on each of two days produces a total of two.

**Why Medium:** The dashboard invites comparisons its measurements cannot support. “Approximate” does not explain the unit mismatch. This weakens the credibility of a page intended to demonstrate engineering judgment. Document-request logs also do not measure every client-side page transition.

**Desired outcome:** Each metric clearly states its unit, time period, and coverage. A reader can reconcile apparent discrepancies without reading the backend.

**Acceptance check:** Explain returning visitors, country requests, page transitions, and differing historical coverage using only the visible dashboard and its methodology text.

**Evidence:** [Daily measurement](/Users/andrew/Scripts/react-resume/stats_aggregator/lambda_function.py:113), [totals](/Users/andrew/Scripts/react-resume/stats_aggregator/lambda_function.py:413), [labels](/Users/andrew/Scripts/react-resume/src/pages/stats.tsx:125), [live analytics screenshot](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07/analytics-live.png). **Confidence: high. Live values are a snapshot, not permanent totals.**

### F11 — Medium: Incomplete days appear as a traffic decline

**Observed:** The daily job runs at midnight UTC, but the displayed series includes the day that has just begun. Missing observations become zero. A local test with ten views yesterday produced yesterday=10 and today=0; the live chart also dropped at its right edge. The chart provides no visible dates or values to help distinguish the final point from a complete day.

**Why Medium:** The visual suggests a fall in audience that may simply represent time that has not elapsed or logs that have not arrived. The small freshness caption mentions delays but does not correct the visual meaning.

**Desired outcome:** Complete days, incomplete days, and missing observations are distinguishable, and the trend has enough context to interpret.

**Acceptance check:** Review the chart immediately after midnight and with delayed logs; it should not communicate an unexplained drop to zero.

**Evidence:** [Schedule](/Users/andrew/Scripts/react-resume/terraform/statsLambda.tf:147), [series construction](/Users/andrew/Scripts/react-resume/stats_aggregator/lambda_function.py:423), [chart display](/Users/andrew/Scripts/react-resume/src/pages/stats.tsx:138). **Confidence: high; source, isolated test, and live visual evidence.**

### F12 — Medium: Missing or stale analytics can look valid and current

**Observed:** If Cloudflare metrics are unavailable, absent counts can display as zero. If an update fails, previous Cloudflare totals can be republished under a newly updated overall date. The page cannot communicate source-specific freshness. A failure retrieving the source credential can also prevent the intended partial refresh.

**Why Medium:** A valid zero, a missing measurement, and an old measurement answer different questions. Presenting them similarly makes the dashboard look more certain and current than its data supports. No outage was induced in production.

**Desired outcome:** Data absence and staleness remain visible; successful updates from one source do not imply that all sources are current.

**Acceptance check:** Simulate an unavailable source with and without previous data. Verify that the visitor can distinguish unavailable, stale, and current zero values.

**Evidence:** [Missing-source handling](/Users/andrew/Scripts/react-resume/stats_aggregator/lambda_function.py:309), [publication date](/Users/andrew/Scripts/react-resume/stats_aggregator/lambda_function.py:431), [frontend count handling](/Users/andrew/Scripts/react-resume/src/hooks/useStats.ts:25). **Confidence: high from source; conditional behavior.**

### F13 — Medium: Interrupted aggregation can permanently lose counts

**Observed:** An input log is considered processed before all of its totals and breakdowns are stored. An isolated test using the current functions injected one transient write failure: the overall total became one while its daily and page counts were missing. Retrying skipped the input and left the inconsistency intact. No AWS service was contacted for this test.

**Why Medium:** Ordinary interruptions can become permanent, silent inaccuracies. The impact is limited to public statistics, but it undermines both the data and the claim that reprocessing safely recovers work.

**Desired outcome:** Interrupted processing can resume without either losing observations or counting them twice, and totals remain consistent with their breakdowns.

**Acceptance check:** Interrupt processing before, during, and after persistence, then retry. Confirm that the eventual result equals one uninterrupted successful run.

**Evidence:** [Processing record](/Users/andrew/Scripts/react-resume/stats_aggregator/lambda_function.py:127), [counter persistence](/Users/andrew/Scripts/react-resume/stats_aggregator/lambda_function.py:247), [processing sequence](/Users/andrew/Scripts/react-resume/stats_aggregator/lambda_function.py:280). **Confidence: high; isolated failure reproduced.**

### F14 — Medium: Privacy wording overstates the absence of collected data

**Observed:** The analytics page repeatedly says “No personal data.” Its published aggregates are carefully sanitized, but the infrastructure retains operational access logs, with current log objects configured for 90-day expiration and separate version retention. Standard CloudFront logs can contain network addresses, browser information, referrers, and requested URLs or queries, as described in [AWS’s log-field reference](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logs-reference.html). Actual raw log contents were not inspected.

**Why Medium:** Readers can reasonably interpret the wording as no such information being collected anywhere. The implemented promise is narrower: no client tracking script and anonymous public aggregates. This is a trust and precision finding, not evidence of public personal-data exposure or a legal conclusion.

**Desired outcome:** The explanation distinguishes client-side tracking, published statistics, and retained operational records.

**Acceptance check:** Compare the privacy description with configured collection and retention; it should remain accurate without relying on an unstated meaning of “here.”

**Evidence:** [Public wording](/Users/andrew/Scripts/react-resume/src/pages/stats.tsx:60), [logging](/Users/andrew/Scripts/react-resume/terraform/main.tf:326), [retention](/Users/andrew/Scripts/react-resume/terraform/main.tf:181). **Confidence: high for wording and configuration.**

### F15 — Medium: Trailing slashes and missing pages return raw access errors

**Observed:** Public requests to `/stats/`, `/graph/`, and a nonexistent test address returned HTTP 403 with an XML “Access Denied” response. The valid versions without trailing slashes work. The production build generates a 404 page, but the observed delivery path does not present it for these requests.

**Why Medium:** A harmless address variation or a broken shared link looks like a permissions problem and offers no site navigation or recovery. This is narrower than failure of the linked primary routes, but it is a real production visitor experience.

**Desired outcome:** Equivalent page addresses resolve consistently, and genuinely missing pages explain the problem with clear routes back to useful content.

**Acceptance check:** Directly open both slash variants of each page and an unknown address in production; confirm useful content or a purposeful missing-page response.

**Evidence:** [Address handling](/Users/andrew/Scripts/react-resume/terraform/main.tf:349), [export configuration](/Users/andrew/Scripts/react-resume/next.config.js:37). **Confidence: high; public HTTP responses verified during review.**

### F16 — Medium: Portfolio order and content understate the strongest work

**Observed:** The first two of five cards feature this résumé repository and this website’s architecture. AI products come later. All cards offer short descriptions and outgoing destinations, without an on-site account of Andrew’s contribution, a difficult decision, or an observable outcome. The strongest enterprise achievements are elsewhere in the work history.

**Why Medium:** A portfolio should help a reviewer understand engineering ownership and judgment. The current ordering spends the first impressions on two views of the résumé site, while the opening positions Andrew as a lead AI engineer. Working demos provide value but do not explain personal contribution. This is an evaluation, not a challenge to confidential work or published accomplishments.

**Desired outcome:** Lead with the work most relevant to the intended audience and provide a concise problem, role, decision, and outcome for the strongest examples. Confidential work can be described at an appropriate level.

**Acceptance check:** A visitor can explain Andrew’s contribution to two projects before leaving the site, and the first visible choices support the stated professional positioning.

**Evidence:** [Project inventory and order](/Users/andrew/Scripts/react-resume/src/data/data.tsx:244), [project presentation](/Users/andrew/Scripts/react-resume/src/components/Sections/Portfolio.tsx:20). **Confidence: high on content; moderate on persuasive impact.**

### F17 — Medium: Some small informational text has insufficient contrast

**Observed:** Certification dates use #737373 text on #171717, approximately 3.78:1 contrast. This is below the 4.5:1 reference for ordinary-sized text in [W3C’s minimum contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). The graph introduction and message counter use a similarly subdued tier, although graph contrast varies with its translucent background.

**Why Medium:** Dates and instructions convey information. Reduced contrast sensitivity or bright surroundings make them harder to read. This is a localized accessibility issue, not a reason to discard the otherwise readable dark palette.

**Desired outcome:** Supporting information remains legible while preserving a clear hierarchy between headings, body text, and metadata.

**Acceptance check:** Measure all small informational text against its actual rendered background, including translucent states, and verify that the visual hierarchy survives the adjustment.

**Evidence:** [Certification date](/Users/andrew/Scripts/react-resume/src/components/Sections/Resume/CertificationItem.tsx:36), [graph explanation](/Users/andrew/Scripts/react-resume/src/pages/graph.tsx:47), [message counter](/Users/andrew/Scripts/react-resume/src/components/Sections/Contact/ContactForm.tsx:213). **Confidence: high for the measured date pair; conditional for changing backgrounds.**

### F18 — Medium: Log storage is configured to generate logs about itself

**Observed:** The access-log bucket is also the destination of its own access logs. AWS explicitly warns that this can create an ongoing loop of logs. Expiration limits old storage but does not stop new log generation. See [AWS’s logging-destination guidance](https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-server-access-logging.html).

**Why Medium:** The arrangement can create recurring operational waste and noisy records without improving the portfolio experience. No storage bill or rate of log growth was inspected, so the report does not assign a dollar impact.

**Desired outcome:** Logging produces useful, finite records without recording its own deliveries indefinitely.

**Acceptance check:** Verify that no logging destination generates another chain of deliveries to itself; review subsequent volume for the expected workload.

**Evidence:** [Log destination](/Users/andrew/Scripts/react-resume/terraform/main.tf:117), [self-log expiration](/Users/andrew/Scripts/react-resume/terraform/main.tf:208). **Confidence: high for repository configuration; operational magnitude unmeasured.**

### F19 — Medium: Documented delivery path includes an unencrypted connection

**Observed:** Repository comments describe Cloudflare Flexible mode and an HTTP connection from Cloudflare to CloudFront. The delivery policy explicitly permits HTTP to support that arrangement. [Cloudflare’s documentation](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/flexible/) confirms that Flexible mode does not encrypt the connection to the origin. The current Cloudflare account setting was not independently inspected.

**Why Medium:** If the documented arrangement is still active, the browser’s secure connection does not extend across the entire site-delivery path. This is a configuration risk relevant to a portfolio emphasizing secure infrastructure, not an observed interception or a claim about the separately hosted contact API.

**Desired outcome:** The deployed delivery path is documented and verified to use authenticated encryption throughout. Changes must account for both services because the repository documents a redirect-loop dependency.

**Acceptance check:** Verify the live mode and each connection, including redirects, before considering the finding resolved.

**Evidence:** [Documented mode and dependency](/Users/andrew/Scripts/react-resume/terraform/main.tf:290). **Confidence: high about repository intent; medium about current external configuration.**

### F20 — Low: Skill self-ratings lack a clear meaning

**Observed:** Twenty-three skills receive Familiar, Proficient, or Expert labels; twelve are Expert. The classic résumé does not explain these terms or directly connect each label to an example. The graph provides some additional context.

**Why Low:** Some readers appreciate the fast summary; others discount self-ratings with undefined criteria. The labels work as an interface and do not prevent assessment, but many Expert labels reduce their ability to distinguish strengths.

**Desired outcome:** Skill depth has a consistent meaning and is easy to relate to delivered work.

**Acceptance check:** A reviewer can explain what an Expert label means and identify an example of its use.

**Evidence:** [Skill presentation](/Users/andrew/Scripts/react-resume/src/components/Sections/Resume/Skills.tsx:29), [skill inventory](/Users/andrew/Scripts/react-resume/src/data/data.tsx:126). **Confidence: high on content; moderate on subjective reception.**

### F21 — Low: Portfolio previews are inconsistent and hard to inspect

**Observed:** The portfolio mixes a decorative GitHub logo image, a cropped architecture diagram, and miniature product screenshots. The product interfaces contain text and charts too small to interpret at card size. The architecture thumbnail crops a document that needs its complete structure to be meaningful.

**Why Low:** The cards remain recognizable and their descriptions carry the basic meaning. However, the imagery contributes unevenly: some previews communicate a product, while others mainly add visual texture. This is a presentation judgment, independent of the broken destination in F04.

**Desired outcome:** Each preview communicates the most relevant aspect of its project at thumbnail size, with a consistent degree of visual polish.

**Acceptance check:** View the cards without zooming or reading body descriptions; their images should convey a useful project distinction.

**Evidence:** [Image treatment](/Users/andrew/Scripts/react-resume/src/components/Sections/Portfolio.tsx:30), [portfolio screenshot](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07/portfolio-desktop.png). **Confidence: moderate; visual evaluation.**

### F22 — Low: Long mobile reading sections are difficult to scan

**Observed:** Work entries are center-aligned on narrow screens, including multi-line narrative and bullet content. Several paragraphs and detailed achievement lists precede the project section. The homepage’s role description, About section, and current-role introduction also repeat parts of the positioning.

**Why Low:** The information is useful, and navigation provides shortcuts. The concern is reading effort: changing line starts make long passages slower to scan, and similar introductory language uses attention that could go to evidence. This is a readability judgment rather than a broken flow.

**Desired outcome:** Long-form content has a stable reading edge and a clear hierarchy between essential claims and supporting detail. Each section contributes something distinct.

**Acceptance check:** On a phone, quickly locate role, dates, and two strongest outcomes without reading every paragraph; verify that any shortened content preserves important evidence.

**Evidence:** [Timeline presentation](/Users/andrew/Scripts/react-resume/src/components/Sections/Resume/TimelineItem.tsx:12), [mobile reading screenshot](/Users/andrew/Scripts/react-resume/reports/design-ux-review-2026-09-07/mobile-reading.png), [About copy](/Users/andrew/Scripts/react-resume/src/data/data.tsx:112). **Confidence: high on presentation; moderate on reading impact.**

### F23 — Low: “Resume” labels imply two different actions

**Observed:** The header’s “resume” link scrolls to the on-page timeline. The hero’s “Resume” button downloads a PDF. Its download icon helps, but the text does not state the distinction. The graph’s PDF link opens the document rather than carrying the homepage download behavior.

**Why Low:** Both actions are useful and easy to recover from, but visitors should be able to predict when a file will download versus when they will continue reading.

**Desired outcome:** Reading, opening, and downloading the résumé are unambiguous wherever offered.

**Acceptance check:** A first-time visitor can identify the download action before activating it.

**Evidence:** [Hero action](/Users/andrew/Scripts/react-resume/src/components/Sections/Hero.tsx:45), [navigation destination](/Users/andrew/Scripts/react-resume/src/components/Sections/Header.tsx:40), [graph document link](/Users/andrew/Scripts/react-resume/src/pages/graph.tsx:59). **Confidence: high on behavior.**

### F24 — Low: Certification cards do not support verification

**Observed:** Three cards show credential, issuer, and year, but provide no verification destination or explanation of whether the date represents issuance or current validity.

**Why Low:** Credentials supplement the experience narrative, so this is avoidable review effort rather than a core blocker. The review does not establish that any credential is expired or invalid.

**Desired outcome:** Where available, visitors can verify a credential and understand what its date and status represent.

**Acceptance check:** A reviewer can distinguish a current credential from a historical achievement without guessing from the year alone.

**Evidence:** [Certification content](/Users/andrew/Scripts/react-resume/src/data/data.tsx:413), [card presentation](/Users/andrew/Scripts/react-resume/src/components/Sections/Resume/CertificationItem.tsx:33). **Confidence: high.**

### F25 — Low: Footer’s upward link has no accessible name

**Observed:** The footer displays an upward chevron as a link, but provides neither visible text nor an accessible label. The browser accessibility snapshot reports it as an unnamed link. On the analytics page, it also leads to the homepage hero rather than the top of the current page.

**Why Low:** Assistive-technology users cannot reliably infer its purpose, and sighted users may expect a different destination. The control is supplementary and other navigation remains available.

**Desired outcome:** The control has a meaningful name and a destination that matches its stated purpose on each page.

**Acceptance check:** Inspect the control with a screen reader on the homepage and analytics page; the announced purpose predicts the result.

**Evidence:** [Footer link](/Users/andrew/Scripts/react-resume/src/components/Sections/Footer.tsx:14). **Confidence: high; source and browser-confirmed.**

### F26 — Low: Canonical page addresses retain tracking and section details

**Observed:** Opening the homepage with `?utm_source=review#portfolio` made its declared canonical address include that exact query and fragment. The social page URL uses the same value.

**Why Low:** Tracking and selection state should not create different declared identities for the same page. This is metadata hygiene; no search-ranking loss or indexing defect was measured.

**Desired outcome:** Each content page has a stable preferred address, distinct from campaign tracking and in-page selection state.

**Acceptance check:** Visit the same page through tracking links and section links; its preferred page identity stays consistent while navigation still works.

**Evidence:** [Canonical construction](/Users/andrew/Scripts/react-resume/src/components/Layout/Page.tsx:37), [social URL](/Users/andrew/Scripts/react-resume/src/components/Layout/Page.tsx:61). **Confidence: high; browser-confirmed.**

### F27 — Low: Reduced-motion behavior is incomplete

**Observed:** The graph reacts to system motion-preference changes, and homepage particles honor the preference when first mounted. However, mobile-menu and graph-panel slides continue under reduced motion, and changing the preference during a homepage visit does not stop already-running particles.

**Why Low:** The most prominent animation already has meaningful protection. The remaining inconsistency can still be uncomfortable for motion-sensitive visitors, but is more limited than an entirely unprotected animated experience.

**Desired outcome:** Motion preferences consistently affect decorative and panel movement, including changes made during a visit.

**Acceptance check:** Enable reduced motion before loading and while the page is open; inspect the hero, menu, graph, and details in both cases.

**Evidence:** [Menu movement](/Users/andrew/Scripts/react-resume/src/components/Sections/Header.tsx:110), [detail movement](/Users/andrew/Scripts/react-resume/src/components/Graph/FocusPanel.tsx:71), [particle preference](/Users/andrew/Scripts/react-resume/src/components/ParticleField.tsx:28). **Confidence: high from source; operating-system preference changes were not exercised.**

### F28 — Low: Static delivery bypasses CloudFront caching

**Observed:** The site’s default CloudFront policy is AWS’s CachingDisabled policy. Cloudflare may cache responses in front of it, but those rules were not inspected. AWS defines the configured policy in its [managed cache-policy reference](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html).

**Why Low:** A static portfolio is a good candidate for effective caching, and uncached traffic adds avoidable work. However, real visitor latency, cache-hit rates, and costs were not measured, and an outer cache may mitigate the impact. This is an optimization opportunity, not a claim that the site is slow.

**Desired outcome:** Delivery caching is deliberate, documented, and compatible with reliable updates.

**Acceptance check:** Measure actual cache behavior and repeat-visit performance, then verify that published changes become visible as intended.

**Evidence:** [Delivery policy](/Users/andrew/Scripts/react-resume/terraform/main.tf:281). **Confidence: high on CloudFront configuration; actual performance impact unknown.**

### F29 — Low: Quality checks miss important behavior and alter checked files

**Observed:** The repository workflow runs on pushes to main and checks lint, build, and infrastructure. No repository browser or backend behavior tests cover the graph’s keyboard flow, metric arithmetic, or public route recovery. The lint command automatically changes source before the workflow builds it.

**Why Low:** The current build and nonmutating checks pass, yet several user-visible defects remain. The validation process cannot establish the correctness of those behaviors, and automatic edits mean the built source can differ from the reviewed commit. External branch protections or additional checks may exist; they were not inspected.

**Desired outcome:** A small set of meaningful checks protects important journeys and failure cases before release, and checks assess the same source that reviewers evaluated.

**Acceptance check:** Demonstrate that validation catches the mobile overflow, broken project destination, invisible graph focus, and interrupted aggregation without silently changing source. Avoid a large test suite whose assertions merely repeat the implementation.

**Evidence:** [Workflow trigger](/Users/andrew/Scripts/react-resume/.github/workflows/main.yml:3), [checks](/Users/andrew/Scripts/react-resume/.github/workflows/main.yml:43), [lint script](/Users/andrew/Scripts/react-resume/package.json:10). **Confidence: high for repository scope.**

### F30 — Low: Repository documentation leaves an unfinished impression

**Observed:** The README explains hosting but omits a normal local-start workflow and still contains the instruction to “Specify your project's license here.” The previous design review is organized as implementation workstreams, and many of its findings are already addressed in the current source without an explicit completion record.

**Why Low:** The portfolio actively sends people to this repository. Placeholder prose and unresolved-looking historical recommendations create unnecessary uncertainty for both human reviewers and future agents. This does not impair ordinary page use.

**Desired outcome:** The repository explains how to run and assess the project, identifies its actual license, and clearly separates historical review items from current work.

**Acceptance check:** A new contributor or agent can determine how to start the site, what is deployed separately, and which review findings still apply without reconstructing the history.

**Evidence:** [README](/Users/andrew/Scripts/react-resume/README.md:1), [license placeholder](/Users/andrew/Scripts/react-resume/README.md:42), [historical review](/Users/andrew/Scripts/react-resume/DESIGN_REVIEW.md:1). **Confidence: high.**

## Visual direction and subjective tradeoffs

These observations guide design decisions; they are not additional defects or claims about universal preferences.

| Choice | What visitors may like | What visitors may dislike | Judgment |
|---|---|---|---|
| Dark background with orange highlights | Cohesive, recognizable, technically oriented; primary actions stand out | Long reading in bright surroundings can feel demanding; small muted text is particularly vulnerable | Retain the identity. Address measured legibility problems first. A light option is an optional audience decision, not an automatic requirement. |
| Photo, translucent hero, gradient title, and particles | A personal, atmospheric introduction with a sense of craft | Multiple decorative effects can feel familiar or busy to readers who want evidence immediately | The desktop balance is successful. Reassess decoration only if audience feedback or measurements show a problem; fixing the mobile fit is more valuable. |
| Full-screen introductory hero | Gives role and personal identity a confident opening | Delays work samples for a visitor scanning quickly | Keep the opening purposeful and preserve fast résumé/contact access. Test whether project evidence should become visible sooner. |
| Career graph and public analytics | Memorable demonstrations of technical curiosity and implementation ability | Optional experiences demand time and can distract from hiring evidence | Their value depends on clarity and correctness. Keep conventional reading easy and make exploration a deliberate choice. |
| Personal interests and citizenship information | Adds warmth; citizenship may matter to the defense-sector audience | Other audiences may see it as lower priority than work outcomes | Decide using the target roles. Do not remove personal context merely to make the site look more generic. |
| Light, conventional résumé PDF | Familiar, printable, easy to forward | Dense compared with the website | The visual difference is appropriate for the medium. Fact consistency matters more than matching the website’s dark theme. |

## Strengths to preserve

- **Clear professional positioning.** The opening names the role, employer, location, and enterprise scale; the current role leads the work history and contains specific outcomes.
- **Useful primary actions.** The homepage offers immediate résumé and contact access. A visible email address gives visitors an alternative to the form.
- **Coherent desktop design.** Orange, neutral surfaces, spacing, rounded cards, and typography generally work together. The lighter project screenshots can be justified as product evidence rather than forced into a dark recoloring.
- **Appropriate architecture.** Static export suits the content. The substantial 3D experience is loaded separately, and conventional reading remains the landing experience. No architectural rewrite is warranted by the reviewed evidence.
- **Shared information and graph state.** Common content and graph consistency checks reduce duplicated facts and broken relationships, although the remaining PDF/heading disagreements show where reconciliation is still needed.
- **Good performance foundations.** Current images use WebP where appropriate; the hero has loading priority. Particles cap density and rendering resolution and pause offscreen or in hidden tabs. The old review’s claim that they always run no longer applies.
- **Accessibility foundations.** A homepage skip link, document language, sensible primary headings, persistent form labels, textual quantity labels, and many visible focus styles are present. The graph’s announcements and fallback show useful intent that should be retained while repairing interaction.
- **Thoughtful contact states.** Server/network error messages preserve input, and success offers a response-time expectation. These are meaningful improvements over the historical review.
- **Defensive public statistics.** The payload restricts labels, bounds quantities, filters raw IP-style referrers, and groups small categories. The concern is truthful measurement and recovery, not a need to discard those safeguards.
- **Operational care.** Short-lived deployment credentials, scoped service permissions, and bounded log retention are sound choices. The identified logging, transport, and caching details can be addressed within that foundation.

## Verification record and limits

| Check | Result and practical limit |
|---|---|
| TypeScript check | Passed with no emitted source changes. |
| Nonmutating ESLint check | Passed with zero warnings. The repository’s autofixing lint script was deliberately not used for this read-only assessment. |
| Optimized production build | Passed; generated homepage, graph, stats, and 404 output. No deployment was performed. |
| Build-reported first-load JavaScript | Homepage 138 kB; graph 113 kB; stats 96.7 kB. These build figures are not measured transfer times and do not include all later asynchronous graph downloads. |
| Local browser inspection | Homepage and supporting routes inspected; desktop around 1280 pixels, phones at 320 and 390 pixels; graph additionally at 844×390. Screenshots and DOM checks confirmed the principal layout findings. |
| Keyboard behavior | Invisible graph focus reproduced; empty contact submission verified after page load. Mobile menu opens, exposes all six destinations, and closes with Escape. |
| Link and metadata checks | Architecture destination and tracking-bearing canonical confirmed from rendered DOM. |
| Public-site checks | Analytics success state inspected. `/stats/`, `/graph/`, and an unknown address returned 403 XML. Live analytics values and update date are snapshots from the review session. |
| Stats local unavailable state | Retry/error presentation renders. Missing local `stats.json` is expected because production publishes it separately; it is not listed as a defect. |
| Isolated backend exercises | Demonstrated daily-unique summation, incomplete-day zero, and permanent inconsistency after a simulated partial write. No live services were mutated. |
| Downloadable résumé | Extracted and visually inspected its single page. Layout is readable; location discrepancy confirmed. |
| Historical review | Checked against current code. Previously noted missing icons, absent homepage skip link, 250-character form cap, missing stats retry, progress-bar skill display, and always-running particles were not carried forward as current defects. |

Browser testing primarily used the local development build, with separate read-only checks against the public deployment. The production build was validated but not subjected to a second full browser pass. Viewport resizing does not establish behavior on real iOS/Android hardware. No VoiceOver/NVDA session, complete accessibility conformance audit, CPU/GPU throttling, Lighthouse performance score, field Core Web Vitals analysis, or user study was performed. WebGL fallback and reduced-motion paths were inspected in source but not exhaustively simulated.

No real contact message was sent. Live AWS/Cloudflare account settings, raw logs, bills, all external portfolio products, and external branch protections were not comprehensively inspected. Security observations are limited to evidenced design/configuration concerns; dependency vulnerability scanning and penetration testing were outside this review.

Application source and infrastructure were left unchanged. The deliverables are this report and its supporting evidence files; local build output was generated for verification.

## Suggested order of work

1. **Restore dependable access:** F01–F04, F06, F09, and F15. Address phone fit, keyboard visibility, graph overlays, broken destinations, validation direction, and link recovery.
2. **Reconcile claims and protect submissions:** F05 and F07, then F10–F14. Align résumé facts, preserve drafts, define metrics, distinguish missing data, and verify recovery and privacy wording.
3. **Make the portfolio easier to assess:** F08, F16, and F17, followed by F20–F25. Improve direct evidence retrieval, project presentation, reading, and supporting labels.
4. **Validate operational details and prevent recurrence:** F18–F19 and F26–F30. Confirm external delivery settings before changing them, remove avoidable logging/caching waste, and add focused checks and current documentation.

The severity of each individual finding remains the priority reference. These groups describe related work that can be reviewed together.

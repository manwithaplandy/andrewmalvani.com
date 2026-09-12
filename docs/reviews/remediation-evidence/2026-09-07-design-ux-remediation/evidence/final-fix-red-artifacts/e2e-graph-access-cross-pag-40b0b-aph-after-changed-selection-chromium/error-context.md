# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/graph-access.spec.ts >> cross-page history restores graph after changed selection
- Location: tests/e2e/graph-access.spec.ts:305:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('navigation', { name: 'Career graph, list view' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('navigation', { name: 'Career graph, list view' }) with timeout 5000ms
  - waiting for getByRole('navigation', { name: 'Career graph, list view' })

```

```yaml
- link "Skip to content":
  - /url: /#main
- banner:
  - navigation:
    - link "about":
      - /url: /#about
    - link "Experience":
      - /url: /#resume
    - link "portfolio":
      - /url: /#portfolio
    - link "contact":
      - /url: /#contact
    - link "career graph":
      - /url: /graph
    - link "analytics":
      - /url: /stats
- main:
  - text: Lead AI/ML Engineer
  - heading "I'm Andrew." [level=1]
  - paragraph:
    - text: I'm an
    - strong: Arizona based Lead AI/ML Engineer
    - text: at
    - strong: General Atomics
    - text: ", where I lead the enterprise AI program — building secure LLM and agent platforms used by 10,000+ employees."
  - paragraph:
    - text: In my free time, you can catch me playing with my
    - strong: cats
    - text: ", exploring nature, or"
    - strong: golfing
    - text: .
  - link "Github":
    - /url: https://github.com/manwithaplandy
    - img
  - link "LinkedIn":
    - /url: https://www.linkedin.com/in/andrewmalvani
    - img
  - link "Download résumé PDF":
    - /url: /assets/resume.pdf
  - link "Career Graph":
    - /url: /graph
  - link "Contact":
    - /url: "#contact"
  - link "Scroll to About section":
    - /url: /#about
  - paragraph: About
  - img "Andrew Malvani"
  - heading "About me" [level=2]
  - paragraph: My route into engineering started with psychology at UC Santa Barbara and moved through compliance, IT operations, automation, and enterprise AI. I now focus on secure, cost-effective LLM agent platforms while pursuing a Master's in Computer Science at Georgia Tech, expected in 2028.
  - list:
    - listitem: "Location: Arizona"
    - listitem: "Nationality: American (US Citizen)"
    - listitem: "Interests: Camping, Motorsports, Golf"
    - listitem: "Study: Georgia Tech & University of California, Santa Barbara"
    - listitem: "Employment: General Atomics"
  - heading "Resume" [level=2]
  - paragraph: Work
  - heading "Lead AI/ML Engineer" [level=3]
  - text: General Atomics June 2024 - Present
  - paragraph: As the Lead AI/ML Engineer at General Atomics, I lead the enterprise AI program and serve as the organization's subject-matter expert on LLMs — designing, building, and shipping secure generative-AI platforms that transform company operations.
  - list:
    - listitem:
      - text: Avoided
      - strong: $15M/yr
      - text: in spend with an in-house, DoD-compliant enterprise AI chatbot (AWS Bedrock, Azure AI Foundry, LiteLLM) — now serving
      - strong: 5,000+ monthly and 1,000+ daily active users
      - text: .
    - listitem:
      - text: Achieved
      - strong: 4x workflow efficiency
      - text: for 10,000+ users with a self-service RAG platform built on Azure AI Search, AWS RDS PostgreSQL, and Python.
    - listitem:
      - text: Cut technical order development time by
      - strong: 40%
      - text: with agentic search and generation powered by GraphRAG on Amazon OpenSearch, Amazon Neptune, and AWS Bedrock.
    - listitem:
      - text: Cut deployment time
      - strong: from days to minutes
      - text: through infrastructure-as-code with Terraform/Terragrunt and GitHub Actions CI/CD.
    - listitem:
      - text: Eliminated
      - strong: 90%
      - text: of manual processing across key workflows with autonomous multi-agent systems built on Azure Durable Functions, Python, LangGraph, Semantic Kernel, and the Claude SDK.
    - listitem:
      - text: Boosted developer productivity by
      - strong: 30%
      - text: by rolling out AI development tools and integrating them into the SDLC while maintaining security and trustworthiness.
  - heading "Systems Administrator" [level=3]
  - text: General Atomics February 2023 - June 2024
  - paragraph: As a Systems Administrator, I modernized the company's IT infrastructure — bringing DevOps and Agile practices to automate, innovate, and quickly generate value for 15,000+ end users.
  - list:
    - listitem: Automated software request and deployment processes for endpoints using JFrog Artifactory.
    - listitem:
      - text: Replaced a manual iOS app build and signing process with GitLab CI/CD, cutting build and signing time
      - strong: from hours to minutes
      - text: .
  - heading "IT Strategic Analyst" [level=3]
  - text: Tillster, Inc. October 2021 - February 2023
  - paragraph: As an IT Strategic Analyst, I wore three hats — helpdesk, systems administrator, and automation engineer — anticipating end-user needs and shipping durable solutions that automated the IT function from the inside.
  - list:
    - listitem:
      - text: Reduced onboarding and offboarding time by
      - strong: 90%
      - text: by automating account provisioning across all company applications.
    - listitem: Implemented a centralized MuleSoft API management system, improving API discoverability, security, and auditability.
    - listitem: Developed internal tools using Python and JavaScript that significantly improved team efficiency.
  - heading "Compliance & Marketing Consultant" [level=3]
  - text: Reynolds & Reynolds April 2018 - October 2021
  - paragraph: At Reynolds & Reynolds, our clients were car dealerships across the country. I audited dealership compliance across local, state, federal, and corporate authorities and advised clients on marketing strategy.
  - list:
    - listitem:
      - text: Managed a territory of
      - strong: 100+ clients
      - text: generating
      - strong: $1M+
      - text: in annual sales.
    - listitem: Resolved compliance failures quickly and advised clients on preventing future violations.
    - listitem: Supported client marketing strategy and content creation alongside the compliance practice.
  - paragraph: Education
  - heading "Master's - Computer Science" [level=3]
  - text: Georgia Tech Expected 2028
  - heading "Bachelor's - Psychology" [level=3]
  - text: UC Santa Barbara September 2017
  - paragraph: Skills
  - text: "DevOps Tools Docker Expert Docker: Expert Terraform Expert Terraform: Expert Kubernetes Familiar Kubernetes: Familiar CI/CD Expert CI/CD: Expert Terragrunt Proficient Terragrunt: Proficient Coding Languages Python Expert Python: Expert Javascript & Typescript (Node, React) Proficient Javascript & Typescript (Node, React): Proficient Bash Proficient Bash: Proficient Powershell Familiar Powershell: Familiar Generative AI Skills RAG Expert RAG: Expert Agents Expert Agents: Expert LangChain & LangGraph Proficient LangChain & LangGraph: Proficient MCP Expert MCP: Expert GraphRAG Proficient GraphRAG: Proficient Semantic Kernel Proficient Semantic Kernel: Proficient LiteLLM Expert LiteLLM: Expert Claude Code & SDK Expert Claude Code & SDK: Expert Cloud Services AWS Proficient AWS: Proficient Azure Expert Azure: Expert AWS Bedrock Expert AWS Bedrock: Expert Azure AI Foundry Expert Azure AI Foundry: Expert GCP Familiar GCP: Familiar Cloudflare Familiar Cloudflare: Familiar"
  - paragraph: Certifications
  - img "AWS Solutions Architect Associate certification badge"
  - heading "AWS Solutions Architect Associate" [level=3]
  - paragraph: Amazon Web Services
  - paragraph: "Year listed: 2024"
  - img "HashiCorp Terraform Associate certification badge"
  - heading "HashiCorp Terraform Associate" [level=3]
  - paragraph: HashiCorp
  - paragraph: "Year listed: 2023"
  - img "Azure AI Engineer certification badge"
  - heading "Azure AI Engineer" [level=3]
  - paragraph: Microsoft
  - paragraph: "Year listed: 2025"
  - text: Portfolio
  - heading "Check out some of my work" [level=2]
  - article:
    - link "GitHub mark on a blue and purple space background Source for this site Browse the React and Next.js source that powers this résumé site.":
      - /url: https://github.com/manwithaplandy/react-resume
      - img "GitHub mark on a blue and purple space background"
      - heading "Source for this site" [level=3]
      - paragraph: Browse the React and Next.js source that powers this résumé site.
  - article:
    - link "AWS architecture diagram showing WAF and CloudFront connected to S3, DynamoDB, and SNS Site architecture An AWS architecture diagram for this site, showing WAF, CloudFront, S3, DynamoDB, and SNS.":
      - /url: /_next/static/media/website-diagram.8738b5b9.webp
      - img "AWS architecture diagram showing WAF and CloudFront connected to S3, DynamoDB, and SNS"
      - heading "Site architecture" [level=3]
      - paragraph: An AWS architecture diagram for this site, showing WAF, CloudFront, S3, DynamoDB, and SNS.
  - article:
    - link "Retirement simulation results with a success probability and percentile projection chart Retirement Simulations A retirement planner that runs Monte Carlo simulations so people can stress-test their savings — React, Node.js, and Cloudflare.":
      - /url: https://retire.andrewmalvani.com
      - img "Retirement simulation results with a success probability and percentile projection chart"
      - heading "Retirement Simulations" [level=3]
      - paragraph: A retirement planner that runs Monte Carlo simulations so people can stress-test their savings — React, Node.js, and Cloudflare.
  - article:
    - link "Polyscannr dashboard showing a track record and active prediction market signals Polyscannr An AI-powered analysis platform for Polymarket prediction markets, with real-time monitoring, sentiment analysis, and trading signals backed by a transparent track record.":
      - /url: https://polyscannr.com
      - img "Polyscannr dashboard showing a track record and active prediction market signals"
      - heading "Polyscannr" [level=3]
      - paragraph: An AI-powered analysis platform for Polymarket prediction markets, with real-time monitoring, sentiment analysis, and trading signals backed by a transparent track record.
  - article:
    - link "Rolefit job matching dashboard with ranked roles, fit analysis, and a tailored résumé action Rolefit An AI-powered job search that scores every role against your background, explains the fit, and generates a résumé tailored to each posting.":
      - /url: https://jobs.andrewmalvani.com
      - img "Rolefit job matching dashboard with ranked roles, fit analysis, and a tailored résumé action"
      - heading "Rolefit" [level=3]
      - paragraph: An AI-powered job search that scores every role against your background, explains the fit, and generates a résumé tailored to each posting.
  - link "Curious how many people visit this page? I built the analytics pipeline myself →":
    - /url: /stats
  - text: Contact
  - heading "Get in touch." [level=2]
  - text: Name
  - textbox "Name":
    - /placeholder: Your name
  - text: Email
  - textbox "Email":
    - /placeholder: you@example.com
  - text: Message
  - textbox "Message":
    - /placeholder: What can I help you with?
  - text: 0/2000
  - status
  - button "Send Message"
  - paragraph: Open to interesting problems in AI and infrastructure — reach out through the form or directly by email.
  - term: Email
  - definition:
    - link "andrewrmalvani@gmail.com":
      - /url: mailto:andrewrmalvani@gmail.com
  - term: Github
  - definition:
    - link "manwithaplandy":
      - /url: https://github.com/manwithaplandy
- contentinfo:
  - link "Back to top":
    - /url: "#top"
  - link "Github":
    - /url: https://github.com/manwithaplandy
    - img
  - link "LinkedIn":
    - /url: https://www.linkedin.com/in/andrewmalvani
    - img
  - text: Designed & built by Andrew Malvani — Next.js · AWS · Terraform
  - link "Site analytics":
    - /url: /stats
  - text: © 2026 Andrew Malvani
- alert: Andrew Malvani — Lead AI/ML Engineer
```

# Test source

```ts
  225 |     );
  226 |     await expect(page.locator('canvas')).toHaveCount(0);
  227 |     await expect(threeView(page)).toBeFocused();
  228 |     await expectResumeLinks(page);
  229 |   });
  230 | });
  231 | 
  232 | test('unescaped valid deep links do not add a history entry during mount', async ({page}) => {
  233 |   await page.goto('/');
  234 |   await page.goto('/graph?view=list#node=skill:python');
  235 |   await expect(list(page).getByRole('button', {name: 'Python', exact: true})).toHaveAttribute('aria-expanded', 'true');
  236 |   await page.goBack();
  237 |   await expect(page).toHaveURL('/');
  238 | });
  239 | 
  240 | for (const {id, detail} of [
  241 |   {id: 'skill:python', detail: 'Hands-on depth: Expert'},
  242 |   {id: 'job:tillster-it-strategic-analyst', detail: 'Tillster, Inc. · October 2021 - February 2023'},
  243 | ]) {
  244 |   test(`text view preserves selected detail: ${id}`, async ({page}) => {
  245 |     await page.goto(`/graph?view=list#node=${encodeURIComponent(id)}`);
  246 |     await expect(list(page)).toContainText(detail);
  247 |   });
  248 | }
  249 | 
  250 | test('selection-only history recovers focus from disappearing text connections', async ({page}) => {
  251 |   await page.goto('/graph?view=list#node=skill%3Apython');
  252 |   const python = list(page).getByRole('button', {name: 'Python', exact: true});
  253 |   const bash = list(page).getByRole('button', {name: 'Bash', exact: true});
  254 |   await bash.click();
  255 |   await page.keyboard.press('Tab');
  256 |   await expect(page.locator(':focus')).toContainText('connection 1 of');
  257 |   await page.goBack();
  258 |   await expect(python).toHaveAttribute('aria-expanded', 'true');
  259 |   await expect(textView(page)).toBeFocused();
  260 |   await expectVisibleFocus(page);
  261 | 
  262 |   await python.focus();
  263 |   await page.keyboard.press('Tab');
  264 |   await expect(page.locator(':focus')).toContainText('connection 1 of');
  265 |   await page.goForward();
  266 |   await expect(bash).toHaveAttribute('aria-expanded', 'true');
  267 |   await expect(textView(page)).toBeFocused();
  268 |   await expectVisibleFocus(page);
  269 | });
  270 | 
  271 | test('selection-only history recovers text connection focus when deselecting', async ({page}) => {
  272 |   await page.goto('/graph?view=3d#node=skill%3Apython');
  273 |   await expectThreeDimensionalView(page);
  274 |   await page.getByRole('button', {name: 'Deselect node', exact: true}).click();
  275 |   await textView(page).click();
  276 |   await expect(page).toHaveURL(/view=list$/);
  277 |   const python = list(page).getByRole('button', {name: 'Python', exact: true});
  278 |   await python.click();
  279 |   await page.keyboard.press('Tab');
  280 |   await expect(page.locator(':focus')).toContainText('connection 1 of');
  281 |   await page.goBack();
  282 |   await expect(list(page).locator('button[aria-current="true"]')).toHaveCount(0);
  283 |   await expect(textView(page)).toBeFocused();
  284 |   await expectVisibleFocus(page);
  285 | });
  286 | 
  287 | for (const control of ['entry', 'mode']) {
  288 |   test(`selection-only history keeps focus on a persistent ${control} control`, async ({page}) => {
  289 |     await page.goto('/graph?view=list#node=skill%3Apython');
  290 |     const python = list(page).getByRole('button', {name: 'Python', exact: true});
  291 |     const bash = list(page).getByRole('button', {name: 'Bash', exact: true});
  292 |     await bash.click();
  293 |     const persistentControl = control === 'entry' ? python : textView(page);
  294 |     await persistentControl.focus();
  295 |     await page.goBack();
  296 |     await expect(python).toHaveAttribute('aria-expanded', 'true');
  297 |     await expect(persistentControl).toBeFocused();
  298 |     await page.goForward();
  299 |     await expect(bash).toHaveAttribute('aria-expanded', 'true');
  300 |     await expect(persistentControl).toBeFocused();
  301 |   });
  302 | }
  303 | 
  304 | for (const entry of ['initial selection', 'changed selection', 'changed view'] as const) {
  305 |   test(`cross-page history restores graph after ${entry}`, async ({page}, testInfo) => {
  306 |     const errors: string[] = [];
  307 |     page.on('pageerror', error => errors.push(error.message));
  308 |     const initial = '/graph?view=list#node=job%3Aga-lead-ai-ml-engineer';
  309 |     const python = '/graph?view=list#node=skill%3Apython';
  310 |     const threePython = '/graph?view=3d#node=skill%3Apython';
  311 |     await page.goto(entry === 'changed view' ? threePython : '/graph?view=list');
  312 |     if (entry === 'changed view') {
  313 |       await expectThreeDimensionalView(page);
  314 |       await textView(page).click();
  315 |     } else {
  316 |       await expect(list(page)).toBeVisible();
  317 |       if (entry === 'changed selection') {
  318 |         await list(page).getByRole('button', {name: 'Python', exact: true}).click();
  319 |       }
  320 |     }
  321 |     const graphUrl = entry === 'initial selection' ? initial : python;
  322 |     const selectedName = entry === 'initial selection' ? 'Lead AI/ML Engineer' : 'Python';
  323 |     const expectRestoredGraph = async () => {
  324 |       await expect(page).toHaveURL(graphUrl);
> 325 |       await expect(list(page)).toBeVisible();
      |                                ^ Error: expect(locator).toBeVisible() failed
  326 |       await expect(textView(page)).toHaveAttribute('aria-pressed', 'true');
  327 |       await expect(list(page).getByRole('button', {name: selectedName, exact: true})).toHaveAttribute(
  328 |         'aria-expanded',
  329 |         'true',
  330 |       );
  331 |       await expect(page.locator('#contact')).toHaveCount(0);
  332 |     };
  333 |     await expectRestoredGraph();
  334 |     // A marker proves Classic resume and history exercise the same document's
  335 |     // actual page router, rather than passing through full-page reloads.
  336 |     await page.evaluate(() => (document.documentElement.dataset.historyJourney = 'graph-resume'));
  337 |     await page.getByRole('link', {name: 'Classic resume', exact: true}).click();
  338 |     await expect(page).toHaveURL('/');
  339 |     await expect(page.locator('#contact')).toBeVisible();
  340 |     await expect(list(page)).toHaveCount(0);
  341 |     await page.goBack();
  342 |     await expectRestoredGraph();
  343 |     await page.screenshot({path: testInfo.outputPath('graph-restored-after-resume.png')});
  344 | 
  345 |     if (entry !== 'initial selection') {
  346 |       await page.goBack();
  347 |       if (entry === 'changed view') {
  348 |         await expect(page).toHaveURL(threePython);
  349 |         await expectThreeDimensionalView(page);
  350 |         await expect(threeView(page)).toHaveAttribute('aria-pressed', 'true');
  351 |         await expect(page.getByRole('heading', {name: 'Python', exact: true})).toBeVisible();
  352 |         await expect(list(page)).toHaveCount(0);
  353 |       } else {
  354 |         await expect(page).toHaveURL(initial);
  355 |         await expect(list(page).getByRole('button', {name: 'Lead AI/ML Engineer', exact: true})).toHaveAttribute(
  356 |           'aria-expanded',
  357 |           'true',
  358 |         );
  359 |       }
  360 |       await page.goForward();
  361 |       await expectRestoredGraph();
  362 |     }
  363 |     await page.goForward();
  364 |     await expect(page).toHaveURL('/');
  365 |     await expect(page.locator('#contact')).toBeVisible();
  366 |     await expect(list(page)).toHaveCount(0);
  367 |     await page.goBack();
  368 |     await expectRestoredGraph();
  369 |     await expect(page.locator('html')).toHaveAttribute('data-history-journey', 'graph-resume');
  370 |     expect(errors).toEqual([]);
  371 |   });
  372 | }
  373 | 
```
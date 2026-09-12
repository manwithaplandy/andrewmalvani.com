# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/graph-access.spec.ts >> cross-page history restores graph after changed selection
- Location: tests/e2e/graph-access.spec.ts:305:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected: "http://127.0.0.1:3100/graph?view=list#node=job%3Aga-lead-ai-ml-engineer"
Received: "http://127.0.0.1:3100/graph?view=list"
Timeout:  5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × locator resolved to <html lang="en" data-history-journey="graph-resume">…</html>
       - unexpected value "http://127.0.0.1:3100/graph?view=list"

```

```yaml
- main:
  - link "Skip 3D graph — go to resume content":
    - /url: /
  - heading "Andrew Malvani" [level=1]
  - paragraph: Lead AI/ML Engineer, General Atomics · since June 2024
  - paragraph: Each node is a role, skill, or certification — explore how they connect.
  - link "Classic resume":
    - /url: /
  - link "Download résumé PDF":
    - /url: /assets/resume.pdf
  - status: Nothing selected. Overview of the full career graph.
  - search "Career search":
    - text: Find a role, skill, or achievement
    - textbox "Find a role, skill, or achievement"
    - paragraph: 53 career items. Enter a role, skill, or achievement to find a match.
    - list
  - toolbar "Career graph controls":
    - button "Text view" [pressed]
    - button "3D view"
    - button "Show overview"
    - group:
      - text: How to explore
      - paragraph: Click or tap a node to select it. Drag the graph to orbit.
      - paragraph: Use ←/→ to scan connections, ↑ to dive in, and ↓ to go back.
      - button "Dismiss hint": Close help
    - group: Legend
    - button "Reduce motion"
  - navigation "Career graph, list view":
    - paragraph: Text view shows the complete career graph. Pick any entry to see its details and connections.
    - list:
      - listitem:
        - heading "Roles" [level=2]
        - list:
          - listitem:
            - button "Lead AI/ML Engineer"
          - listitem:
            - button "Systems Administrator"
          - listitem:
            - button "IT Strategic Analyst"
          - listitem:
            - button "Compliance & Marketing Consultant"
      - listitem:
        - heading "Educations" [level=2]
        - list:
          - listitem:
            - button "M.S. Computer Science, Georgia Tech"
          - listitem:
            - button "B.A. Psychology, UCSB"
      - listitem:
        - heading "Certifications" [level=2]
        - list:
          - listitem:
            - button "AWS Solutions Architect Associate"
          - listitem:
            - button "HashiCorp Terraform Associate"
          - listitem:
            - button "Azure AI Engineer"
      - listitem:
        - heading "Skill areas" [level=2]
        - list:
          - listitem:
            - button "DevOps Tools"
          - listitem:
            - button "Coding Languages"
          - listitem:
            - button "Generative AI"
          - listitem:
            - button "Cloud Services"
      - listitem:
        - heading "Skills" [level=2]
        - list:
          - listitem:
            - button "Python"
          - listitem:
            - button "JavaScript / TypeScript"
          - listitem:
            - button "Bash"
          - listitem:
            - button "PowerShell"
          - listitem:
            - button "RAG"
          - listitem:
            - button "AI Agents"
          - listitem:
            - button "LangChain & LangGraph"
          - listitem:
            - button "MCP"
          - listitem:
            - button "GraphRAG"
          - listitem:
            - button "Semantic Kernel"
          - listitem:
            - button "LiteLLM"
          - listitem:
            - button "Claude Code & SDK"
          - listitem:
            - button "AWS"
          - listitem:
            - button "Azure"
          - listitem:
            - button "AWS Bedrock"
          - listitem:
            - button "Azure AI Foundry"
          - listitem:
            - button "GCP"
          - listitem:
            - button "Cloudflare"
      - listitem:
        - heading "Tools" [level=2]
        - list:
          - listitem:
            - button "Docker"
          - listitem:
            - button "Terraform"
          - listitem:
            - button "Kubernetes"
          - listitem:
            - button "CI/CD"
          - listitem:
            - button "Terragrunt"
      - listitem:
        - heading "Highlights" [level=2]
        - list:
          - listitem:
            - button "Enterprise AI chatbot (−$15M/yr)"
          - listitem:
            - button "Self-service RAG platform (4x, 10k+ users)"
          - listitem:
            - button "Self-service agent platform (MCP)"
          - listitem:
            - button "TO-authoring agent (−40% time)"
          - listitem:
            - button "IaC + CI/CD (days→minutes)"
          - listitem:
            - button "Multi-agent automation (−90% manual work)"
          - listitem:
            - button "AI dev assistants (+30% productivity)"
          - listitem:
            - button "LLM subject-matter expert"
          - listitem:
            - button "IT modernization for 15,000+ users"
          - listitem:
            - button "Endpoint software deployment automation"
          - listitem:
            - button "iOS build/sign CI/CD (hours→minutes)"
          - listitem:
            - button "Onboarding automation (−90% time)"
          - listitem:
            - button "MuleSoft API management"
          - listitem:
            - button "Internal tooling in Python & JS"
          - listitem:
            - button "Frontline IT & automation"
          - listitem:
            - button "Compliance audits (100+ clients, $1M+ sales)"
          - listitem:
            - button "Marketing strategy & content"
- alert: Career Graph | Andrew Malvani
```

# Test source

```ts
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
  325 |       await expect(list(page)).toBeVisible();
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
> 354 |         await expect(page).toHaveURL(initial);
      |                            ^ Error: expect(page).toHaveURL(expected) failed
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
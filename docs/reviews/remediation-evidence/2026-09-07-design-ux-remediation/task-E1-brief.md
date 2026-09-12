## Task 15: E1 — Normalize public page URLs and provide purposeful missing-page recovery

**Finding:** F15. **Dependency:** A1 for browser tests; does not depend on the analytics producer.

**Files:** Modify main Terraform; create the extracted edge function, 404 page and two route test files from the map. Record staging and public checks in `docs/operations/delivery.md`.

**Interfaces:**

- Extract the existing CloudFront Function source into the named JavaScript file, still defining the CloudFront-required `handler(event)` entry point. Terraform loads that file as the function’s code. Node tests execute that exact file in an isolated VM context.
- `/` maps to `/index.html`; extensionless `/stats` and `/graph` map to `.html`; non-root trailing-slash paths redirect to their no-slash equivalent. Preserve the original query fields and repeated values in redirects using the CloudFront event representation.
- Static asset paths keep their extensions. Unknown paths produce a site-styled 404 with links to the résumé and contact. Origin 403/404 missing-object responses use `/404.html` with response status 404 and a short 10-second error-cache TTL.

- [ ] **Step 1: Add a route matrix against the actual edge function.** Test `/`, `/stats`, `/stats/`, `/graph`, `/graph/`, `/assets/resume.pdf`, `/_next/static/example.js`, and `/does-not-exist`. Add trailing-slash query cases with multiple values, spaces, encoded plus signs and encoded ampersands; following the redirect must preserve their meaning, not double-encode or drop them.

```js
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../../terraform/functions/rewrite-extensionless.js', import.meta.url), 'utf8');

test('the slash redirect preserves repeated query values', () => {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  const result = context.handler({request: {
    method: 'GET', uri: '/graph/', headers: {}, cookies: {},
    querystring: {view: {value: 'list'}, tag: {
      value: 'skills', multiValue: [{value: 'skills'}, {value: 'roles'}],
    }},
  }});
  assert.ok([301, 308].includes(result.statusCode));
  const target = new URL(result.headers.location.value, 'https://andrewmalvani.com');
  assert.equal(target.pathname, '/graph');
  assert.equal(target.searchParams.get('view'), 'list');
  assert.deepEqual(target.searchParams.getAll('tag'), ['skills', 'roles']);
});
```

Use AWS's [event structure](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html) for the encoded-value cases and validate those event fixtures against an actual CloudFront test invocation before production rollout. VM tests do not establish the deployed runtime's capabilities by themselves.

- [ ] **Step 2: Add the missing-page browser check.** In the static-export preview, an unknown page must return 404, show `Page not found`, and expose ordinary links to the homepage and contact. The page must fit 320 pixels and have a clear page title and non-indexing metadata. No screenshots are needed to test exact prose beyond its navigational purpose.
- [ ] **Step 3: Run the current failures.** Run `node --test tests/infra/edge-routing.test.mjs` and, after `yarn build`, `yarn test:e2e tests/e2e/not-found.spec.ts --project=chromium`. The edge behavior must be tested separately because the local preview server cannot prove CloudFront configuration.
- [ ] **Step 4: Implement the routing contract.** Preserve static file addresses, normalize non-root trailing slashes consistently and maintain safe query serialization. Build the 404 with the existing Page/typography patterns and useful navigation. Configure the distribution’s 403 and 404 response mappings without changing successful-route behavior.
- [ ] **Step 5: Validate the export and infrastructure.** Rebuild; confirm `out/404.html`, `out/stats.html` and `out/graph.html` exist. Run tests, typechecks/lint, `terraform -chdir=terraform fmt -check`, then isolated `terraform -chdir=terraform init -backend=false -lockfile=readonly` and `terraform -chdir=terraform validate`.
- [ ] **Step 6: Review and stage delivery.** Inspect the real Terraform plan using existing authorized variables; require only the function/error-response changes for this task. Make the new `404.html` available before enabling its error response. Do not introduce a window in which the recovery document itself is absent.
- [ ] **Step 7: Verify public responses after rollout.** Use `curl -I`/browser navigation on both slash variants and a unique nonexistent path. Require working pages or one purposeful redirect, a true 404 for unknown content, and no XML access-denied screen. Check a known asset as a guard against a broader origin-permission problem being disguised as a 404.
- [ ] **Step 8: Commit code and record results** as `fix: normalize public routes and serve useful 404 pages`.




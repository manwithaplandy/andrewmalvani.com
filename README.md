# Andrew Malvani’s résumé

A Next.js static site with three complementary views:

- `/` is the conventional résumé, project portfolio, PDF download and contact form.
- `/graph` explores the complete career data as either a keyboard-accessible text list or a separately loaded 3D graph. Search and “Show overview” provide direct navigation and recovery.
- `/stats` explains anonymous aggregate traffic observations, each source’s units, coverage and freshness. Its separately published `stats.json` is not part of the frontend export.

The site keeps its dark/orange design and AWS/Cloudflare hosting. See the [remediation status](docs/reviews/design-ux-remediation-status.md) for evidence and unfinished criteria; the [September review](reports/design-ux-review-2026-09-07.md) is the original finding record.

## Local development

Use Node.js 22 and Yarn Classic 1.22.22. Python 3.12 is needed for analytics tests, packaging and optional PDF generation. Browser checks need Playwright’s Chromium and a working WebGL implementation. Terraform checks use the committed provider lock; the consolidated infrastructure review used Terraform 1.14.7.

```sh
yarn install --frozen-lockfile
yarn dev
```

Open `http://localhost:3000`. For the actual static export:

```sh
yarn build
yarn preview
```

The preview serves `out/` at `http://127.0.0.1:3100`. Use this instead of `yarn start`: Next’s server start command does not serve this project’s `output: 'export'` deployment. The build runs TypeScript, Next’s export and sitemap generation; it does not publish anything. Missing local statistics are expected because the producer owns `stats.json`. Browser tests supply synthetic fixtures; do not copy private analytics exports into `public/`.

The lock retains an existing `autoprefixer` resolution warning (10.4.5 overrides the requested range). It is documented, not silently upgraded as part of this remediation.

## Checks

```sh
yarn typecheck
yarn typecheck:tests
yarn lint
yarn playwright install chromium
yarn build
yarn test:e2e --project=chromium
```

`lint` and both type checks are nonmutating. `yarn lint:fix` and `yarn format` **edit files** and are explicit maintenance commands, not CI checks. The browser suite starts the static preview automatically; build once before it. On Linux, use Playwright’s documented `install --with-deps chromium` when system browser dependencies are missing. Tests require real WebGL rather than skipping the 3D cases.

Browser fixtures intercept external traffic, including synthetic contact submissions. Do not send a real contact message as a test or retain a visitor’s draft in logs, analytics or browser storage. The production form uses a separate API Gateway → Lambda → SNS service, with server-side validation retained.

For isolated backend and release checks:

```sh
python3.12 -m venv .venv-stats
. .venv-stats/bin/activate
python -m pip install -r tests/requirements.txt
python -m pip check
export AWS_ACCESS_KEY_ID=testing AWS_SECRET_ACCESS_KEY=testing AWS_DEFAULT_REGION=us-west-1
export AWS_EC2_METADATA_DISABLED=true AWS_CONFIG_FILE=/dev/null AWS_SHARED_CREDENTIALS_FILE=/dev/null
export STATS_TEST_PYTHON="$PWD/.venv-stats/bin/python"
python scripts/package_release_artifacts.py build --output-dir release-artifacts
python -m unittest discover -s tests/stats -p 'test_*.py' -v
node --test scripts/tests/analytics-release.test.mjs scripts/tests/static-publication.test.mjs \
  scripts/tests/workflow-pipelines.test.mjs tests/infra/edge-routing.test.mjs
```

The services in these tests are fakes; the extracted stats ZIP runs the recovery matrix with dummy clients. The Node reader tests launch an isolated local browser/server. Do not point test commands at production credentials or endpoints. `package_release_artifacts.py verify --output-dir release-artifacts` checks the exact archives and manifest without deploying them.

Terraform syntax/provider validation is separate from a real plan:

```sh
terraform -chdir=terraform fmt -check
terraform -chdir=terraform init -backend=false -input=false -lockfile=readonly
terraform -chdir=terraform validate
```

Run these in an isolated checkout without private state or variable files. Backend-disabled validation is not a live plan. The reviewed real plan remains a time-bounded observation; a release requires fresh authorized planning with preserved inputs. Never commit state, plan output, credentials, raw logs or private aggregate/marker exports.

## Content and PDF

Website content lives in `src/data/`; graph data and relationships are assembled there. Keep [professional facts](docs/content/professional-facts.md) and [project evidence](docs/content/project-evidence.md) as the source of unresolved owner questions. Do not infer credential validity from a listed year or combine metrics with different scopes.

The editable PDF source is [resume-source.md](docs/content/resume-source.md). Its portable setup, one-page review and exact link checks are documented in [PDF maintenance](docs/content/pdf-maintenance.md). The current PDF is a source artifact; a normal website build copies it and does not regenerate it.

## Operations and release

The [analytics runbook](docs/operations/analytics.md) explains source-aware payloads, accepted Cloudflare checkpoints, the durable input ledger and active-input guard, historical limits, alarms, no-writer backup prerequisites and ledger-aware rollback. An old marker-first handler is investigation material, **not a safe rollback** after ledger writes. Never reset totals or blindly replay retained logs to repair unknown historical gaps.

The [delivery runbook](docs/operations/delivery.md) explains the observed transport path, unchanged working origin, true-404 recovery, cache ownership, checked-artifact publication and public verification. Stable files use prepared browser 60/shared 300-second metadata; hashed assets use one-year immutable metadata; `stats.json` remains Lambda-owned. Cloudflare SSL/proxy/cache settings are still an explicit account gate; compiled AWS settings do not prove end-to-end freshness.

The reusable [checks workflow](.github/workflows/checks.yml) is called by the [release workflow](.github/workflows/main.yml). Release reuses the same checked web, manifest and Lambda archives instead of rebuilding. Hashed dependencies and `404.html` are staged before apply; analytics bootstrap/ordinary installation retain their public compatible-reader prerequisites. Analytics infrastructure or code changes require a manual cutover attestation and a nonsecret release record backed by actual quiescence and durable-backup evidence. That input is not automatic proof that queues have drained.

A successful local run does not establish GitHub execution or merge enforcement. The preflight found no required status checks/rulesets. After an approved PR run, confirm the emitted **Verify release candidate** check context and configure it as required through the separately authorized repository-settings process. No deployment, invocation, settings change or GitHub enforcement change is implied by this README.

## License and attribution

This project uses the [MIT License](LICENSE), including the existing **Copyright (c) 2021 Tim Baker** notice. It is derived from Tim Baker’s résumé template; that notice and permission text remain intact. Andrew Malvani’s site-specific content and subsequent implementation are maintained in this repository. The earlier [June design review](DESIGN_REVIEW.md) remains historical evidence rather than a current completion claim.

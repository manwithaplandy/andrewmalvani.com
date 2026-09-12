# E1 validation transcript excerpts

Source: Codex command transcript from the E1 implementation on 2026-09-08. These excerpts were preserved after completion without rerunning commands. Sections explicitly labeled “transcript summary” retain the available result rather than reconstructing stdout that was no longer present verbatim.

## Build/export — transcript summary

`yarn build` passed using the documented clean Node 22 environment. TypeScript compilation and the static export completed for all five pages; the route table included `/404`, `/stats`, and `/graph`. `out/404.html`, `out/stats.html`, and `out/graph.html` existed. The exact full stdout was not retained after transcript compaction. The later handler-only trailing-slash correction is not a Next build input.

## Candidate recovery references — exact captured stdout

The local check used the same direct-reference matching logic committed in the workflow against `out/404.html`:

```text
{"references":13,"uniqueReferences":12,"missing":0}
```

The workflow uploads the complete candidate `_next/static` tree recursively, so page chunks, CSS, and transitive font/media files under that tree are staged before `404.html`.

## Lint and type checks — exact captured stdout

```text
yarn run v1.22.22
$ eslint './src/**/*.{js,jsx,ts,tsx}' --max-warnings=0
Done in 2.09s.
```

```text
yarn run v1.22.22
$ tsc --noEmit --incremental false
Done in 2.99s.
```

```text
yarn run v1.22.22
$ tsc -p tsconfig.tests.json --noEmit --incremental false
Done in 1.90s.
```

## Workflow/static checks — exact captured results

Actionlint command:

```sh
/private/tmp/react-resume-actionlint-1.7.12/actionlint .github/workflows/main.yml
```

Exit 0 with no findings/output. Version output captured immediately before the check:

```text
1.7.12
installed by downloading from release page
built with go1.26.1 compiler for darwin/arm64
```

`terraform -chdir=terraform fmt -check -no-color` and `git diff --check` both exited 0 with no output.

## Commit/source closure — exact captured result

```text
fe1a239 (HEAD -> codex/design-ux-remediation) fix: normalize public routes and serve useful 404 pages
 .github/workflows/main.yml                   | 40 ++++++++++++---
 docs/operations/delivery.md                  | 54 +++++++++++++++++++
 src/pages/404.tsx                            | 49 ++++++++++++++++++
 terraform/functions/rewrite-extensionless.js | 45 ++++++++++++++++
 terraform/main.tf                            | 31 ++++++-----
 tests/e2e/not-found.spec.ts                  | 21 ++++++++
 tests/infra/edge-routing.test.mjs            | 77 ++++++++++++++++++++++++++++
 7 files changed, 295 insertions(+), 22 deletions(-)
```

Tracked `git status --short` and `git diff e22ea71..HEAD -- terraform/.terraform.lock.hcl` both produced no output after commit.

# E3 validation transcript

Captured during E3 implementation on 2026-09-08. No cloud/public query, account sign-in, application test, browser test, or deployment was run. E3 changes a Terraform comment and the delivery operations record while deliberately retaining runtime configuration.

## Terraform formatting, validation, and lock preservation

Commands:

```sh
terraform -chdir=terraform fmt -check -no-color
terraform -chdir=terraform validate -no-color
git diff --exit-code -- terraform/.terraform.lock.hcl
```

Formatting and the provider-lock check exited 0 with no output. Validation used the existing backend-disabled initialized cached-provider environment and returned exactly:

```text
Success! The configuration is valid.
```

No init, backend/state access, plan, or apply occurred.

## Focused configuration and documentation check

The final source search retained `viewer_protocol_policy = "allow-all"` and found no Terraform assertion that Cloudflare is currently Flexible. Relevant exact output from the review search:

```text
terraform/main.tf:302:    viewer_protocol_policy = "allow-all"
docs/operations/delivery.md:63:| Cloudflare to CloudFront | CloudFront distribution `EDHU4C51HW4BG` is reachable at `d2v6o77xftr5if.cloudfront.net`; direct HTTPS connections retaining apex or `www` Host/SNI returned 200 with certificate verification enabled. | The Cloudflare account is unauthenticated here. Its actual origin scheme is unknown, so this hop is not claimed encrypted. |
docs/operations/delivery.md:65:| CloudFront routing | The selected default origin is `mostly-upward-lion-website-bucket.s3.us-west-1.amazonaws.com` through OAC `E3Q6QZXOS9AMQ8`. The two custom apex/`www` origins exist but are not selected by the default behavior. | Preserve these origin/resource identities; do not mistake the unused custom origins for the live default hop. |
docs/operations/delivery.md:67:| Current CloudFront viewer policy | `allow-all`, retained in E3. | The old Terraform comment asserted Flexible mode without authenticated evidence. Public behavior cannot prove that setting, so a one-sided policy change is unsafe. |
docs/operations/delivery.md:74:Before any change, authenticated account access must record the nonsecret previous values for Cloudflare SSL/TLS mode, apex and `www` proxy state, Always Use HTTPS or equivalent redirect behavior, matching HTML/`stats.json` cache rules, and Browser Cache TTL. Record the current CloudFront viewer policy and checked distribution/configuration revision with them. The current Cloudflare values are unknown; do not fill them from public-response inference.
docs/operations/delivery.md:78:1. **Full (strict) is active and origin validation succeeds.** Confirm both proxied hostnames use the expected CloudFront origin and repeat normal-certificate HTTPS origin checks for apex and `www`. Retain Full (strict). A separately reviewed coordinated plan may then change CloudFront's viewer policy to `redirect-to-https`; verify the complete entry-path matrix before accepting it.
docs/operations/delivery.md:79:2. **Flexible is active.** First revalidate the issued certificate's hostname coverage/expiry and direct HTTPS origin reachability. Save the complete previous settings. Change Cloudflare to Full (strict) first, then verify apex/`www` homepage, `/graph`, `/stats`, PDF, `stats.json`, and an actual current chunk over HTTPS with no loop or certificate error. Only after that succeeds may the reviewed CloudFront viewer-policy change proceed. Cloudflare's [Full (strict) requirements](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/) are the acceptance boundary.
```

The same review confirmed the OAC signed-HTTPS record, certificate/alias facts, explicit origin-validation-failure branch, complete coordinated rollback, E4 cache-rule/Browser Cache TTL dependency, and corrected 100-page self-log measurement boundary.

Final `git diff --check` and provider-lock diff both exited 0 with no output. Before commit, exact `git diff --numstat` output was:

```text
45	3	docs/operations/delivery.md
5	9	terraform/main.tf
```

## Commit closure

`git status --short` and `git diff 70e48d7..HEAD -- terraform/.terraform.lock.hcl` produced no output. Exact `git show --stat` output:

```text
796e7de (HEAD -> codex/design-ux-remediation) fix: verify encrypted site delivery end to end
 docs/operations/delivery.md | 48 ++++++++++++++++++++++++++++++++++++++++++---
 terraform/main.tf           | 14 +++++--------
 2 files changed, 50 insertions(+), 12 deletions(-)
```

`git show --check --oneline HEAD` printed only the commit heading and no whitespace findings.

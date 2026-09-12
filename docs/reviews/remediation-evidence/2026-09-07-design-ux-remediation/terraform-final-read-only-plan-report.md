# Consolidated read-only infrastructure review

The controller ran a real, refresh-inclusive Terraform plan against the existing S3 backend on September8,2026,13:51:18–13:51:42UTC. Source: `c9a2a6fe4891e5cdc0775604848298c0ca2f1b7e`. The command succeeded with detailed exit code2 (changes present). **The seven managed actions match the intended work; there are no replacements or unrelated managed changes.** This is a scope review, not deployment approval. E5 independent review is still pending; the result remains applicable only if its infrastructure and package inputs remain unchanged.

| Planned action | Owning work | Reason and scope |
| --- | --- | --- |
| Create immutable asset cache policy | E4 | Content-hashed assets receive the prepared long shared-cache policy; minimum TTL remains0. |
| Create stable-path cache policy | E4 | Stable files use the prepared short shared-cache policy; minimum TTL remains0. |
| Update existing distribution in place | E1/E4 | Add403/404 recovery mapping, cache-policy selection, hash behavior and compression. |
| Update existing edge function in place | E1 | Apply tested safe canonical routing and query-preserving redirects. |
| Update existing analytics alarm description | D2 | Explain source/storage/publication failures accurately; a cleared alarm does not prove complete recovery. |
| Update existing stats Lambda concurrency | D3 | Change unreserved(-1) to1, enforcing the reviewed single-writer assumption. Actual cutover still requires the D4 no-writer window. |
| Remove the log bucket's self-logging relationship | E2 | Disable only the association that writes access logs back into the same logging bucket. This is not bucket or object deletion. |

The controller checked every non-no-op action, then verified these preservation conditions against the actual before/after plan values:

- Both S3 buckets, the DynamoDB table, existing website logging and all existing lifecycle rules are no-op. Existing current90/noncurrent30 retention remains.
- Distribution identity, origins, aliases, certificate and normal CloudFront logging are unchanged. The working viewer policy remains `allow-all`; unknown Cloudflare settings were not guessed.
- Both Lambda identities, runtime, role, environment and existing bootstrap filename values are unchanged. The contact Lambda is no-op; the stats Lambda changes only concurrency.
- The actual Lambda environment key `CF_ZONE_ID` is nonempty and unchanged. Email subscription configuration is no-op. No private input values were printed.
- Both cache policies have minimum0. The stable policy has default/max300seconds; immutable has31,536,000seconds. Both configured error mappings return404 through `/404.html` with error minimum10seconds; relevant compression flags are enabled.
- Strict provider initialization left the reviewed lock unchanged. Both tested ZIP files remained byte-identical through initialization and the real plan. Removed archive generators did not overwrite checked packages.

The refresh reported four drift entries: only the distribution/OAI ETags and the two Lambdas' last-modified/code-hash metadata. No other drift fields were present. Those observations did not introduce another managed action. The refreshed stats code hash still matches the previously downloaded old production ZIP; the new producer has not been installed. Existing separate CLI code updates are consistent with this kind of Lambda state metadata difference, but the plan does not prove the historical cause of each difference.

The two removed `archive_file` data declarations are absent from the desired configuration and produce no managed cloud action in this plan. The transitional archive2.4.2 declaration/lock remains for state compatibility; cleanup still belongs to a later reviewed post-apply change.

The review used Terraform1.14.7 in a separate0700private directory, the exact committed module, original private email/actual repository-zone inputs, copied locked providers and read-only copies of the tested archives. It ran strict `init -lockfile=readonly`, then `plan -lock=false -detailed-exitcode`, then local `show -json`. No apply, standalone refresh, import, state edit, production upload, invocation or settings mutation ran. The private runner's emitted evidence excludes full state, plan values and input values. Full binary/JSON plans and logs remain private.

This nonlocking observation is not an atomic snapshot or a permanently current apply artifact. Recreate and review the plan for any later approved release. Authenticated Cloudflare transport/cache settings, actual no-admission/queue/in-flight settlement, a durable quiesced backup with recovery validation, reader-first cutover, actual publication/invalidation and post-release route/cache/analytics checks remain required.

[Sanitized action and preservation evidence](evidence/terraform-final-read-only-plan-summary.json) records the plan digest, timings, actions, checks and exact archive identities. [Checked archive inputs](evidence/final-terraform-checked-archive-inputs.json) identifies the frozen copies from the successful3408657run. A presence-only diagnostic initially used the GitHub label instead of the actual Lambda key; the evidence explicitly records its correction to `CF_ZONE_ID`. The complete environment equality check was true throughout.

E5 review completion: fix1 `7eb35b4` independently approved. An actual-path comparison confirms Terraform, Lambda source and packager inputs are unchanged from the c9 plan, so the controller accepts this consolidated scope review for the current branch. The corrected classifier ran against this actual private plan and returned `requires_reader=false`, `analytics_change=true`; manual cutover remains required. See [classifier output](evidence/e5-real-plan-classification.txt). This does not authorize an apply or remove later revalidation requirements.

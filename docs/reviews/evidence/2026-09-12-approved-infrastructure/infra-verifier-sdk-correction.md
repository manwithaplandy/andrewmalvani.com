# Partial verifier: observed AWS response-shape correction

Ready for A3 scoped re-review. No cloud calls, production change, repository edit or receipt rewrite by this worker. Root's first real run at 16:09:57 UTC remains a failed run with `EDGE_RUNTIME_OR_STATUS_MISMATCH` and `API_CONTACT_INTEGRATION_MISMATCH`. Corrected acceptance requires a new controller-owned run after review.

Read the root's saved `private/approved-infra-20260912/validator-response-shapes.json`. It records the LIVE function runtime `cloudfront-js-2.0`, actual status `DEPLOYED`, and OPTIONS/POST integrations with type `AWS_PROXY`, returned `httpMethod: POST`, no `integrationHttpMethod`, and the exact checked contact invocation URI. These are recorded root observations, not new live reads by this worker.

## Narrow corrections

- The original pure edge rule incorrectly required `ASSOCIATED`. The partial validator explicitly replaces only that combined runtime/status rule with runtime `cloudfront-js-2.0` AND exact observed `DEPLOYED`. It does not fabricate or normalize the observed status. Original LIVE/name/ARN/comment/code digest and both distribution function-association checks remain mandatory. The correction is tracked separately as `CORRECTED_SDK_CHECKS`, not as a deferred analytics requirement.
- The partial wrapper's proxy selector now reads the actual GetIntegration response field `httpMethod`. An absent or wrong field remains a failure even when the incorrect legacy `integrationHttpMethod: POST` field is supplied. The full expected invocation URI, including API service, Lambda service, region, account, unqualified function and invocation path, must match exactly. Previous suffix-only URI acceptance is tightened.
- All earlier source/quota/reservation/schedule/target/alarm-description preservation rules, status/body/404/cache/logging/contact checks and explicit approved-apply latch are preserved. Successful output separately describes the corrected SDK fields and continues to state `analyticsMigrationComplete: false`.

The original standalone `verify_infra_after.py` remains byte-identical SHA256 `c135a022e9866e51dad923b0d1f084892f1481d6175acb8765aab67cb2b6cd78`. Before future standalone analytics use, it needs its missing hash helpers, CloudFront ResponseCode canonicalization, actual DEPLOYED expectation and GetIntegration field/URI correction separately applied/reviewed. Its earlier pure fixture passes were not proof of AWS collector correctness.

## Exact local evidence

All paths are under `/private/tmp/react-resume-release-20260911`.

- `partial-infra-sdk-red.log`: updated observed-shape fixture/new negative tests run against pre-correction code: 11 tests, six pass, three failures and two errors. Positive DEPLOYED/httpMethod cases fail; old ASSOCIATED state was wrongly accepted.
- `partial-infra-sdk-green.log`: first corrected 11/11 pass.
- `partial-infra-sdk-final-green.log`: 11/11 pass after adding explicit absent-field coverage (distinct from present-null); no skips. Both method endpoints exercise wrong/absent method, wrong integration type, account/region/qualified URI rejection. Wrong/unpublished/absent edge status, runtime, stage, ARN and association remain blocked.
- `partial-infra-sdk-validation.log`: syntax passes; installed botocore GetIntegration output shape confirms `httpMethod` exists and `integrationHttpMethod` does not, entirely offline. Original file hash preserved. No production clients created.
- `partial-infra-sdk-correction.diff`: only the private helper/tests/fake fixture changes, relative to byte copies `*.before-sdk-correction`.
- `partial-infra-sdk-correction-identity.json`: final helper/test/diff/log and observed-shape receipt hashes.

Commands, working directory private workspace:

```sh
/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation/.venv-stats/bin/python -m unittest -v test_verify_partial_infra_after
```

Syntax used `py_compile.compile(path, doraise=True)` on the helper, test and fake fixture. SDK field verification used `botocore.session.Session().get_service_model('apigateway').operation_model('GetIntegration').output_shape` without clients or network.

Final helper SHA256: `0c6259b2560f1fe0539bb5248f282fce23d32659b88755c85a4ce2dc43cefb94`.

The exact root execution command in `partial-infra-validator-preparation.md` is unchanged. That preparation report's earlier assertion-coverage prose is superseded only by the explicit SDK corrections here; archived logs are historical and not relabeled. Root owns independent acceptance, new read-only execution and release closure.

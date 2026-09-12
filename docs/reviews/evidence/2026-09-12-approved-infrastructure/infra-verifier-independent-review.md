# Partial infrastructure validator SDK-shape correction — independent review

**APPROVED.** No Critical, Important, or Minor finding remains in the scoped correction.

The correction preserves the observed SDK response instead of rewriting it. It removes only the original combined `EDGE_RUNTIME_OR_STATUS_MISMATCH` result, then independently requires runtime `cloudfront-js-2.0` and actual LIVE status `DEPLOYED`. Existing strict checks still require LIVE stage, exact function identity/ARN/comment/code digest, and both distribution associations. Values such as `ASSOCIATED`, `UNPUBLISHED`, `UNASSOCIATED`, missing status, wrong runtime/stage/ARN, and wrong associations remain failures.

The API correction reads GetIntegration's actual `httpMethod` field, requires `POST`, retains exact `AWS_PROXY`, and accepts the Lambda selector only when the full invocation URI exactly matches the known `us-west-1`, account `870140981796`, unqualified `formSubmission` URI. Both OPTIONS and POST integrations pass through the same strict selector. A missing or wrong method, MOCK type, other account/region, or qualified URI remains `API_CONTACT_INTEGRATION_MISMATCH`.

The correction is limited to the partial wrapper and its synthetic raw-SDK fixture/tests. The original final validator remains byte-unchanged and is still not standalone runnable evidence. No cloud mutation, invocation, log read, table read, environment output, or observation rewriting was introduced.

Reviewed identities:

- `verify_partial_infra_after.py`: `0c6259b2560f1fe0539bb5248f282fce23d32659b88755c85a4ce2dc43cefb94`
- `test_verify_partial_infra_after.py`: `71357dcb8a1023a6cbc62441cac03c1ec69055cf7e3d4bd8f92743ce91ccf32b`
- `partial_fake_aws.py`: `91361f549d605a9046f8eb8f5b10caf21833ad5bd0869303bc9f152b4dc58645`

The retained RED shows the prior helper failing against the true response shapes. The final correction log reports 11/11 passing. Independent focused verification reran only the accepted-state, edge-status, and exact-integration boundaries: 3/3 passed. Production state has not been re-collected by this review; root must run the corrected read-only validator and preserve the initial failed run separately.

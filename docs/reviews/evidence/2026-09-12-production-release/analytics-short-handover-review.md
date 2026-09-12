# Short analytics handover design — read-only review

Reviewed 2026-09-12 against source `04facf5`, the September 12 read-only AWS preflight, and AWS primary documentation. No cloud or repository mutation occurred.

## Verdict

**A short stop/test/start handover is sound with two corrections.** It can replace the blanket 31-hour wait because the actual schedule is daily, its last eight deliveries were successful with no retry/failed-delivery metrics, and the stop can be performed far from the next schedule boundary. The cutover must not rely on already queued events being rebound to the new `$LATEST` code, and every paused-state Terraform plan must prove its actual schedule and concurrency behavior under the pinned provider.

The practical short path is:

1. Freeze manual/deployment invokers.
2. Disable the schedule far from 00:00 UTC, wait for its documented propagation period, and prove no EventBridge retry/late delivery is present.
3. Set reserved concurrency to 0, then wait until both (a) the full 300-second function timeout has passed and (b) the last accepted Lambda asynchronous event is older than the current six-hour retention maximum, plus a small observation margin.
4. Take and validate the quiesced backup.
5. Publish/verify the compatible reader.
6. Install and verify the checked producer while concurrency remains 0.
7. Set concurrency to 1 **directly while the rule remains disabled**, run controlled/repeated checks, then enable the rule.
8. Refresh/review/apply Terraform only after the live schedule and concurrency again match desired state. If Terraform must run earlier, install and verify the checked producer first while concurrency remains 0, then require a fresh reviewed plan that keeps the rule disabled and changes no unapproved admission/code boundary.

If a late EventBridge retry, Lambda async receipt, invocation, or unaccounted table write appears after the freeze, the short path stops. Investigate or fall back to the full age bound; do not assume that queued work will execute the new code.

## Two missing conditions in the proposed sequence

### 1. Queued asynchronous work is not documented to rebind to updated `$LATEST`

Actual qualification is favorable:

- `list-versions-by-function` returned only `$LATEST`; there are no published numbered versions.
- `list-aliases` returned none.
- The only EventBridge target and Lambda permission use the unqualified function ARN. There is no alias/version target that deliberately pins old code.

AWS states that asynchronous invocation places an event in Lambda's internal queue, and Lambda later sends it to the function. AWS also states that invocations continue using the previous code/configuration while an update is in progress, and running executions keep the version they started with. It does **not** state that an event accepted into the async queue before `UpdateFunctionCode` is guaranteed to resolve `$LATEST` again after the update completes. See [asynchronous invocation](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html), [function states during updates](https://docs.aws.amazon.com/lambda/latest/dg/functions-states.html), and [alias qualification](https://docs.aws.amazon.com/lambda/latest/dg/using-aliases.html).

Therefore “remaining queued events may run, but must execute new code” is an inference, not an authoritative AWS guarantee. The short gate should remove that dependency: proceed only after the schedule freeze and recent retry metrics support no outstanding delivery, then use concurrency 0 to drain already running executions before backup/update.

The new producer's concurrency-1 durable ledger is designed to tolerate repeated trigger events and duplicate log inputs. That is defense in depth after the new code is proven active; it does not make an old-code invocation safe after ledger-era writes begin, nor does it turn an uncontrolled queued invocation into the requested controlled test.

### 2. Omitted rule state must be decided by the pinned-provider plan

`terraform/statsLambda.tf:145-149` defines the scheduled rule without `state` or `is_enabled`. The latest registry page describes an `ENABLED` default, but the pinned AWS provider 5.50 schema makes both fields optional and suppresses a removed `state` diff when refreshed state is nonempty. Its `is_enabled` diff suppression likewise preserves an omitted planned value. See the exact [`v5.50.0` rule schema](https://github.com/hashicorp/terraform-provider-aws/blob/v5.50.0/internal/service/events/rule.go#L83-L136) and the reported [existing-resource behavior](https://github.com/hashicorp/terraform-provider-aws/issues/40857).

The September 12 refreshed paused-state plan is the controlling evidence here: `aws_cloudwatch_event_rule.stats_aggregator_daily` is a no-op with `is_enabled=false` and `state=DISABLED` before and after. My earlier claim that Terraform would automatically enable this existing rule was incorrect.

The conservative route still leaves Terraform out of the stopped interval: the same actual paused-state plan changes `statsAggregator` reserved concurrency from 0 to 1. Applied before the checked package is installed, that reopens execution of the old producer. Set concurrency to 1 directly after code verification, test while the rule is disabled, enable the rule only after tests pass, then produce a fresh plan when live schedule/concurrency again equal desired state. The actual execution role already has the checked producer's required S3/DynamoDB/SSM/KMS permissions, so the new code does not depend on an earlier Terraform apply.

If the consolidated Terraform apply must occur before controlled testing, install and verify the checked producer first while concurrency remains 0, then create and independently review a fresh plan. It must show the rule remaining disabled, preserve the checked code boundary and contain only approved actions before concurrency is reopened. Do not infer schedule behavior from a documented default, use `-target`, ignore drift, or race an immediate re-disable after apply.

## Why the shorter drain can be evidence-based here

AWS's general maximums remain 24 hours/185 attempts for an EventBridge delivery with no target override and 6 hours/two function-error retries for Lambda async processing. Those maximums matter when delivery is known or potentially queued. See [EventBridge retry policy](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html) and [Lambda async error handling](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html).

This function has a narrower observed situation:

- One daily rule at exactly 00:00 UTC; one unqualified target; no other rule, function URL, event-source mapping, alias, or version.
- September 5–12: eight scheduled attempts, all eight reported successful; no EventBridge retry-attempt or failed-invocation datapoints.
- Lambda received/invoked eight events; no error, throttle or dropped-event datapoints. Latest run was September 12 00:00 UTC, duration 13.774 seconds; observed maximum was 16.783 seconds.
- The next normal trigger after the preflight is September 13 00:00 UTC (September 12 17:00 Arizona), leaving many hours to stop far from a schedule tick.

These observations do not prove an empty internal queue forever. They support a short, conditional gate if refreshed immediately before and after disabling: no failed/retry delivery exists within more than the maximum EventBridge age, the last scheduled delivery succeeded, and no new schedule tick occurs during propagation.

Lambda also warns that an asynchronous event can occasionally be delivered more than once even when the function did not return an error. Because AWS provides no queue-depth read, the 300-second in-flight timeout alone is insufficient while the last accepted event remains within Lambda's six-hour retention window. The short gate must wait until the latest `AsyncEventsReceived` timestamp plus six hours as well as the in-flight timeout. On September 12 the last admission was 00:00 UTC, so this bound ends at 06:00 UTC; a small metric margin makes about 06:05 UTC the earliest defensible backup point if disable/concurrency checks are already complete and no new activity appears.

AWS says a disabled rule may continue matching briefly and instructs operators to allow a short period for the change to take effect; it publishes no exact propagation SLA. See [DisableRule](https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_DisableRule.html). Use repeated `DescribeRule=DISABLED`, a deliberate observation margin, and no new EventBridge/Lambda metrics as the operational proof. A five-minute margin is reasonable here because the change is many hours from the next scheduled tick; it is a chosen safety margin, not an AWS guarantee.

Once reserved concurrency 0 is observed, Lambda throttles future invocation attempts. AWS explicitly describes concurrency 0 as stopping future invocations. See [Lambda invocation troubleshooting](https://docs.aws.amazon.com/lambda/latest/dg/troubleshooting-invocation.html). It does not cancel an execution already running, so wait the configured 300-second timeout from the observed zero setting. Continue waiting until the last `AsyncEventsReceived` is at least six hours old, then add at least one minute for the 1-minute concurrency metric and verify no active/invocation/write evidence. See [Lambda concurrency metrics](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-concurrency.html).

For the observed September 12 timing, this yields backup readiness around 06:05 UTC—less than an hour after the review—plus the time needed for the backup to become `AVAILABLE`, reader publication, code update and controlled checks. In general, schedule this handover shortly before the six-hour anniversary of the last successful daily admission. It is not a generic five-minute replacement for async retention limits; it is conditional on the actual successful daily-delivery evidence and stopping between schedule ticks.

## Exact short handover gate

### A. Stop admission without creating a retry

1. Record exact release ID, checked web/producer digests, current Lambda revision/code digest, and rollback operator. Freeze GitHub deployment and obtain an explicit hold from every manual/identity-policy invoker.
2. Immediately refresh the last >24 hours of EventBridge `InvocationAttempts`, `SuccessfulInvocationAttempts`, `RetryInvocationAttempts`, `FailedInvocations`, and Lambda `AsyncEventsReceived`, `Invocations`, `Errors`, `Throttles`, `AsyncEventsDropped`, `ConcurrentExecutions`. Require the expected single successful 00:00 run and no retry/failure/unexplained invocation. If not true, stop.
3. Disable `stats-aggregator-daily` well away from 00:00 UTC. Poll until `DescribeRule` repeatedly reports `DISABLED`. Wait five minutes, then require no new EventBridge attempt/retry or Lambda async receipt/invocation. This ordering matters: setting concurrency 0 before EventBridge propagation could return throttles to EventBridge and create the very 24-hour retry backlog the short path is trying to exclude.
4. Set reserved concurrency to 0 and poll until `GetFunctionConcurrency` reports 0. Define backup-ready time as the later of (a) that observation plus 300 seconds and (b) the latest `AsyncEventsReceived` timestamp plus six hours, then add at least one minute for metric publication. Require no new invocation/concurrency/error/throttle datapoint and no unaccounted DynamoDB write-capacity activity. Keep operator holds active. For the observed 00:00 UTC admission, do not back up before approximately 06:05 UTC.

The table is now quiescent for backup if all checks pass. The disable-propagation and one-minute metric margins are operational choices; the six-hour last-admission bound is the configured/default queue-age ceiling. Any ambiguous or delayed metric fails closed.

### B. Back up before changing reader or producer

5. Create the on-demand DynamoDB backup; wait for `AVAILABLE` and record its ARN. Preserve/read back the current public legacy `stats.json`, its metadata/version, current legacy code package, exact checked new package, and the strongly consistent record-family export required by `docs/operations/analytics.md`. Hash and verify all copies in the accepted private versioned prefix. Do not continue on backup/readback inconsistency.

### C. Install new code with execution still impossible

6. Publish the exact checked reader, invalidate through the reviewed path, and pass the public reader verifier on apex and `www` against the existing legacy payload plus synthetic v1/v2 contracts.
7. With concurrency still 0 and schedule disabled, call `UpdateFunctionCode` using the previously recorded `RevisionId` and exact checked ZIP. Wait with `function-updated` until `State=Active` and `LastUpdateStatus=Successful`; require the deployed CodeSha256 and code size to match the checked archive and re-read runtime/handler/environment-key names/role/concurrency.

AWS authoritatively guarantees only that invocations use the previous code until the update completes. After successful completion, newly initiated unqualified `$LATEST` invocations use the updated code. The gate depends on the controlled invocation being new, after completion; it does not depend on pre-update queued work being rebound.

### D. Test while scheduled admission remains off

8. Set reserved concurrency directly to 1 and confirm it. Keep the EventBridge rule disabled. Watch the first several minutes for an unexpected async invocation before sending the controlled request. If one appears, stop and inspect; the short queue assumption was false.
9. Run the approved synchronous controlled invocation. Confirm transport and handler success, deployed digest, source/checkpoint/active-completion consistency, truthful public v2 shape, and no current-day false zero. Run the approved repeat only after the first settles; require no duplicate input effects. Re-run the public reader verifier against the actual v2 payload.

### E. Start schedule and reconcile Terraform

10. Enable `stats-aggregator-daily`; poll until `ENABLED`, record target and next 00:00 UTC expectation. Keep monitoring for unexpected retry bursts.
11. Create a fresh state-backed Terraform plan only after concurrency=1 and rule=ENABLED again. The plan must not propose schedule/concurrency rollback or any unreviewed analytics action. Apply the accepted consolidated changes, then confirm rule/target/concurrency/code digest remain correct. If the broader release requires Terraform before step 8, install and verify the checked producer at concurrency 0 first, then require a fresh reviewed plan whose actual values keep the rule disabled.
12. Observe the next real scheduled run and public reader before declaring handover complete.

## Stop conditions

Fall back to investigation or the full retention bound if any of these occur:

- EventBridge retry/failed-delivery activity in the preceding 24 hours or after disable.
- A new Lambda async receipt/invocation after the rule/operator freeze.
- Concurrency cannot be confirmed at 0, the last async admission is not yet six hours old, or an invocation/table write appears after the stop.
- Another rule, alias/version, event source, URL, or manual invoker is found.
- Backup fails to reach `AVAILABLE`, readback/hash/record-family checks disagree, or private destination controls change.
- Lambda update does not finish successfully or its code digest/runtime/handler/config differs.
- Any invocation starts before the verified update, or an uncontrolled invocation appears when concurrency returns to 1.
- Fresh Terraform plan would enable the rule earlier than intended, overwrite checked code/configuration, or change unreviewed analytics resources.

## Evidence classification

**Authoritative AWS guarantees:** disabled rules stop self-triggering after propagation; concurrency 0 throttles future invocations; already running work is not canceled; invocations use previous code/configuration until an update completes; async queues can retry/age; aliases/versions can qualify an invocation.

**Observed account facts:** only `$LATEST`, no aliases/numbered versions, one unqualified daily target, clean eight-day scheduled metrics, current five-minute timeout, current rule enabled, no async overrides/destinations.

**Operational inference:** with no retry evidence over longer than EventBridge's maximum age, a successful last daily delivery, a disable performed many hours from the next tick, repeated disabled state, no post-disable delivery metrics, concurrency 0, the full invocation timeout elapsed, and the last async admission older than its six-hour retention ceiling, there is no remaining writer. This is the basis of the short gate. It fails closed on any contrary evidence.

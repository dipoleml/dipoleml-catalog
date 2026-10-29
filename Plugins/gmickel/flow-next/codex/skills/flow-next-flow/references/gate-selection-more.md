# Review, completion-review and receipt selection (gated reference)

> Read from [gate-selection.md](gate-selection.md) only when a route skips the stage that owns
> one of these reviews, or for the receipt line.

## Implementation review

Runs per `review.backend` or the invocation's `--review=<backend>` flag on every route, including direct and defect routes, for the changes [working-rules.md](../../../references/working-rules.md) names by risk; `/flow-next:impl-review` resolves the backend itself. It is never deferred to a pull request; timing and the risk rule follow working-rules.md. `none` skips with `skipped(config: review=none)`. A qualifying `flowctl triage-skip --base <ref>` receipt (docs-only, lockfile-only, release-chore, generated-only) records `mode: triage_skip` and satisfies the gate. Flow never lowers the gate and never fabricates a verdict.

## Design review

`$flow-next-plan-review <spec-id>` runs on an explicit request or when the route names design risk. It reviews a spec with zero tasks; task decomposition is never a prerequisite.

## Completion review

Unchanged single-task policy: with one minted task whose acceptance is the whole spec, the per-task implementation review (or the risk rule's skip of it) is the integration check and completion review records `skipped(policy: single-task, per-task SHIP covers spec surface)`. Multi-task plans run `$flow-next-spec-completion-review` as configured.

## Receipts

Every stage flow routes or skips records one line in the receipt surface that stage already writes - the task's done summary for task-scoped stages, the run's final report for run-scoped ones:

```
stage: <name> - ran [<start>..<end>] | skipped(<policy|config|empty|error|reach|signal absent|despite unresolved risk>: <detail>) | failed(<reason>: <detail>)
```

`flowctl usage --stages <spec-id>` summarizes the task-scoped lines. A skipped stage is an event with a reason, never an absence.

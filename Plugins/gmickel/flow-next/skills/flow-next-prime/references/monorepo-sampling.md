# Monorepo sampling (gated reference)

> Read from workflow.md only when `flowctl prime classify --json` reports a monorepo topology (workspace members).

For a monorepo (the emitter's topology + workspace members from
`flowctl prime classify --json`, see [classification.md](../classification.md)), verification is
**SAMPLED, not exhaustive**:

- **Sampling order:** deployable members first (web service/app, CLI, desktop), then default /
  entry members. **Max ~5 member executions** and a **~10 min global wall-clock cap** per run.
- **Graph-native `affected` commands may substitute** for per-member runs where the toolchain
  provides them (`turbo run … --affected`, `nx affected`) - one bounded affected run can stand in
  for many member runs.
- **Unsampled members are listed NOT ASSESSED** - never silently skipped.

**Progress observability - a ~10-minute silent run is not acceptable UX.** Emit a
concise line per surface/member as the loop runs, with elapsed vs the global budget, and print the
NOT ASSESSED list as the budget exhausts:

```
[2.4] api (web)        build … ok (12s)          | elapsed 0:12 / 10:00
[2.4] cli (CLI)        --help … ok (1s)           | elapsed 0:13 / 10:00
[2.4] worker (web)     boot probe … ready (28s)   | elapsed 0:41 / 10:00
[2.4] budget: 5/5 member executions used - NOT ASSESSED: web-admin, docs-site, packages/ui
```

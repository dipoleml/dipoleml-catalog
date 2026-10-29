# Operation Control

Operation Control is Citadel's optional Level 4 runtime for work that needs an
explicit quality target, privacy boundary, tool allowlist, time ceiling, model
fallback, or economic ceiling. Ordinary repository work still starts with
`/do <outcome>`.

It does not replace Claude Code, Codex, a local model, ROMA, or another harness.
It chooses among declared execution plans, invokes the selected adapter, runs an
independent verifier, and either stops, performs a targeted retry, or moves to a
declared fallback.

## Fast path

Create request and catalog files for an installed Codex or Claude CLI:

```sh
citadel operation init \
  --objective "Fix the parser regression and leave tests passing" \
  --runtime codex \
  --model gpt-5.6-sol \
  --verifier-executable npm \
  --verifier-arg test \
  --required-changed-path src/parser.js \
  --out-dir .citadel/operations/parser-regression
```

No cash budget is required. Subscription-backed users can leave all three
budget fields `null`; Citadel will report cost as unknown unless the runtime or
catalog supplies attributable evidence.

Preview the complete fallback path without invoking a model:

```sh
citadel operation plan \
  --request .citadel/operations/parser-regression/request.json \
  --catalog .citadel/operations/parser-regression/catalog.json
```

After reviewing the plan, run it in the repository and save its report and new
outcome history:

```sh
citadel operation run \
  --request .citadel/operations/parser-regression/request.json \
  --catalog .citadel/operations/parser-regression/catalog.json \
  --workspace . \
  --out .citadel/operations/parser-regression/report.json \
  --history-out .citadel/operations/parser-regression/history.jsonl

citadel operation verify \
  --input .citadel/operations/parser-regression/report.json
```

Pass the history back to later `plan` or `run` commands with `--history`. The
controller uses verified pass/fail outcomes for the matching workload feature;
unknown outcomes remain unknown and do not count as failures or successes.
The conservative estimate is a 90% one-sided Wilson lower bound over the
declared prior pseudocounts plus verified historical outcomes.

## What the controller optimizes

Each catalog plan declares a model or non-model executor, topology, tools,
privacy level, conservative prior, expected duration, economic estimates,
repairable failures, and a fallback.

For every possible starting plan, Citadel estimates the complete path:

```text
expected path cost = cost(first attempt)
                   + P(first attempt fails) * cost(fallback)
                   + ...
```

It selects the lowest-cost eligible path whose conservative probability of a
verified outcome meets the request's target. If no path meets the target, it
returns `best-available` instead of pretending the target is satisfied.

Selection ranks expected path cost. Admission enforces the declared maximum:
every fallback plus every permitted targeted retry. A budget or duration limit
therefore cannot be approved using an optimistic one-attempt estimate.

This changes the unit of optimization from one prompt to the whole operation.
A cheap call that predictably triggers an expensive recursive fallback may cost
more than a direct strong attempt. A deterministic tool may be a better first
plan than any model. ROMA can be a declared fallback instead of an unconditional
topology.

## Admission and control

Before execution, Citadel rejects a path when it violates any declared:

- local-only privacy requirement;
- allowed or required tool boundary;
- maximum expected duration;
- actual-cash, marginal, or market-equivalent budget;
- unknown-cost policy.

Adapters run as literal argument arrays with `shell: false` and receive one JSON
request on standard input. Only a small base environment plus the adapter's
explicit environment allowlist is inherited.

After execution, Citadel reconciles the observed model, topology, configured
tools, and tool calls against the selected plan. A mismatch fails control. A
missing required observation is `unknown`. A result passes only when independent
verification passes and control reconciliation passes.
For change-producing work, repeat `--required-changed-path` during `init` so an
already-green test suite cannot pass an adapter that made no required change.

## Failure-directed escalation

A plan may retry only the failure codes named in `retry_on`, up to
`max_retries`. Output truncation or malformed structured output can therefore
receive one focused repair without automatically paying for a larger topology.
Other failures move to the frozen fallback. A control mismatch stops rather than
escalating an execution that violated its plan.

## Economic lenses

Operation Control never combines these into one ambiguous number:

| Lens | Meaning |
|---|---|
| `actual_cash` | Attributable invoice or cash charged for this operation |
| `marginal` | Additional cash caused by one more operation under the current access arrangement |
| `market_equivalent` | A sourced list-price normalization for comparison |

`0` is valid only when evidence establishes zero. Subscription access by itself
does not prove market-equivalent cost is zero, and missing telemetry remains
`unknown`. An explicit budget rejects unknown cost by default; set
`unknown_cost_policy` to `allow` only when accepting that uncertainty is
intentional.

## Runtime adapters

`operation init` generates a catalog for the installed Codex or Claude CLI. The
public adapter protocol can also wrap local models, deterministic tools, ROMA,
or another harness. An adapter returns:

- completion or failure plus a reason code;
- output for digesting;
- observed model and topology;
- configured tools and observed tool calls;
- available usage;
- all three cost lenses, including explicit unknowns.

OpenTelemetry-compatible GenAI attributes are projected into each report for
operation name, requested and observed model, plan, topology, verification, and
control status. Citadel does not require an observability backend.

## Trust boundary

Every report is digest-bound and can be checked offline. That establishes file
integrity only. The built-in report is unsigned, so signer trust remains
unknown. Even a future valid signature would identify a signer; it would not by
itself prove that the result is semantically correct. The independent verifier
is the outcome evidence.

Report outcomes are `passed`, `failed`, or `unknown`. A self-reported adapter
completion is not enough for a pass when the request declares a command
verifier.

## Evidence

The checked-in [real-workload evidence](../benchmarks/operation-control-v2/REPORT.md)
reimports the frozen 120-cell optimizer run:

- 10 pinned real-repository scenarios across Citadel, nanoid, and p-limit;
- 120 signed cells and 87 real model attempts;
- 33 verified completions, 51 failures, and 36 unknown outcomes;
- zero adversarial false passes;
- separately preserved actual-cash, marginal, and market-equivalent semantics.

Run `npm run operation:evidence` to verify source attestations, the raw evidence
digest, the imported history, and every retrospective controller decision.

This demonstrates real-workload outcome ingestion and reproducible selection.
It is not a prospective savings result. The original performance gate remains
open until a frozen prospective comparison meets it.

### Prospective runtime integration

The checked-in [prospective result](../benchmarks/operation-control-v2/prospective/RESULTS.md)
adds a preregistered real-runtime cell against a fresh public-only clone of a
pinned Citadel revision. Claude Code completed the declared regression with an
exact observed model and topology match; Citadel then required the declared
file to have changed and ran the repository verifier independently before
reporting a pass. Actual and marginal cash stayed unknown while attributable
market-equivalent telemetry remained separate.

Two infrastructure failures are published beside the pass rather than hidden:
the WindowsApps Codex executable could not be launched as a child process, and
the first Claude attempt could not reach its provider from the restricted
environment. Run `npm run operation:prospective` to verify all three report
digests, history bindings, gates, published patch, freeze, and privacy scan.

This is credible prospective integration evidence, not a comparative savings,
performance, or broad-reliability result. The comparative performance gate
remains open.

## Runnable local example

The package includes a no-provider example with a real command verifier:

```sh
npm run operation:example
node bin/citadel.js operation run \
  --request examples/operation-control/request.json \
  --catalog examples/operation-control/catalog.json \
  --workspace examples/operation-control
```

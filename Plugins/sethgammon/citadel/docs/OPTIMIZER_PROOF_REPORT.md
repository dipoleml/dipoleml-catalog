# Citadel Optimizer Proof Report

Observed: 2026-07-30

## Answer

The frozen optimizer matrix is complete, signed, and locally reproducible.
The engineering contract passed. The performance hypothesis did not.

Citadel cannot currently claim that its adaptive policy reduces real agent
cost, beats prompt-only routing, or is ready for a performance-based grant
submission. The useful result is a falsifiable proof system that rejected its
own routing claim and preserved the failures needed to design the next method.

## Actual matrix

Seth Gammon authorized the exact subscription-backed envelope at
`2026-07-30T20:44:02.628Z`:

- 120 CLI cells;
- at most 162 model attempts;
- at most 7,230 aggregate timeout-minutes;
- no dollar spending amount because the runs used existing subscriptions.

The completed run stayed inside every cap:

| Measure | Actual |
|---|---:|
| Signed matrix cells | 120 / 120 |
| Cells that reached a model | 84 |
| Real model attempts, counted from verification receipts | 87 / 162 |
| Aggregate model-cell runtime | 590.857 minutes |
| Passed and independently verified | 33 |
| Failed | 51 |
| Unknown because setup failed before a model | 36 |
| Known list-price-normalized comparison cost | $114.575324 |

The normalized comparison cost is not a cash charge or subscription invoice.
It is the common list-price basis frozen before the matrix.

Failure classification is preserved, not collapsed:

| Classification | Cells |
|---|---:|
| Passed | 33 |
| `EXPECTED_ARTIFACTS_NOT_CHANGED` | 23 |
| `VERIFICATION_FAILED` | 28 |
| `SETUP_FAILED` | 36 |

## Policy result

All policies contain 30 cells. Each policy has 21 known-cost cells and 9
unknown-cost setup failures.

| Policy | Verified | Real model attempts | Known normalized cost |
|---|---:|---:|---:|
| Always frontier | 11 / 30 | 21 | $34.838471 |
| Always cheap | 0 / 30 | 21 | $4.312938 |
| Prompt only | 10 / 30 | 21 | $39.561832 |
| Adaptive | 12 / 30 | 24 | $35.862083 |

The four held-out scenarios produced:

| Policy | Held-out verified | Known-cost median |
|---|---:|---:|
| Always frontier | 5 / 12 | $0.655518 |
| Always cheap | 0 / 12 | $0.069684 |
| Prompt only | 6 / 12 | $0.522119 |
| Adaptive | 6 / 12 | $0.948231 |

Those known-cost medians are descriptive only. Three held-out cells per policy
have unknown cost, so the report correctly refuses to compute the economic
savings metric.

The preliminary performance gate remains open because:

- adaptive did not beat prompt-only on held-out verified completions;
- adaptive's known-cost held-out median was higher than prompt-only;
- 36 setup failures left cost unknown;
- unknown cost cannot be treated as zero or excluded from a savings claim.

The engineering gate passed: the matrix is complete, all 120 attestations
verify, exact model and executor bindings verify, cost provenance remains
strict, and no adversarial case produced a false pass.

## What the scenarios actually say

- `citadel-short-executor-proof`: frontier, prompt-only, and adaptive each
  passed 3/3. Prompt-only had the lowest known-cost median of those successful
  policies. Adaptive added no demonstrated value.
- `citadel-long-cost-provenance`: frontier and adaptive passed 3/3. Adaptive
  selected the frontier profile directly, so its lower observed median is run
  variance, not evidence that routing saved cost.
- `citadel-safety-model-proof`: prompt-only and adaptive both passed 3/3.
  Prompt-only's median was `$0.648209` in 3.49 minutes versus adaptive's
  `$0.941569` in 7.39 minutes. The frozen adaptive heuristic over-routed.
- `p-limit-cleanup-pending`: frontier and adaptive passed 3/3; prompt-only
  passed 2/3. This is one positive frontier-selection case, not enough to
  rescue the matrix-level claim.
- `p-limit-short-clear-queue` failed under every policy. Adaptive escalated
  from workhorse to frontier in every repetition and still failed.
- `p-limit-context-cancel` changed the expected artifacts under frontier,
  prompt-only, and adaptive, but all 12 verifier runs exited unsuccessfully
  without task-level failure detail in the bounded receipt. Treat this as a
  benchmark/verifier investigation, not a comparative model result.
- `citadel-context-receipt-recovery` failed the artifact contract in all 12
  cells even though the configured verifier passed in all 12. Agents often
  changed plausible recovery files outside the frozen three-file expectation.
  This manifest is not reliable enough for a capability conclusion.
- All 36 Nano ID cells failed setup before any model call.

## Zero-model forensics

The Nano ID failure is reproducible at pinned ref
`1a1fee4610061c63e2429eb5c22a35e3634c1d03`.

The frozen setup command:

```text
corepack pnpm install --frozen-lockfile
```

fails under Corepack's pnpm `9.12.1` with:

```text
ERROR packages field missing or empty
```

That commit's `pnpm-workspace.yaml` has `allowBuilds` and
`minimumReleaseAgeExclude`, but no `packages` field. These are setup
compatibility failures, not model failures. They remain unknown in the frozen
report.
The post-matrix zero-model reproduction is recorded in
[`actual-forensics/nanoid-setup.json`](../benchmarks/optimizer-proof/actual-forensics/nanoid-setup.json).

Two record-shape limitations were also exposed:

- setup fallback records say `attempts: 1` despite containing no verification
  receipt and making no model call; therefore the actual model-attempt count is
  the receipt count, 87, not the top-level sum, 123;
- after adaptive escalation, top-level `selected_profile_id` is the terminal
  profile; the receipt sequence is authoritative for the executed route.

These defects are documented rather than silently repaired inside the frozen
method. A future benchmark version must correct them with a new identity.

## Reproducible artifacts

- Report:
  `optimizer-report-sha256:f43285ff9254b84a49ae8e4e7c02f278716ed4c09db4e30307d7678c75420aa9`
- Proof bundle:
  `sha256:1822a5a8c73e570884ca8e0e38c28bdaf2d1934f8fafdb647f60ad5d337e13db`
- Bundle contents: 46 digest-bound files
- Local bundle verification: valid; 46/46 files verified; report,
  calibration, diagnostic pilot, and forensic records reproduced
- Portability: copied text inputs are canonicalized to LF before hashing
- Public-random holdout: `citadel-short-executor-proof`, selected by
  precommitted drand round `6333716`
- Clean hosted bundle verification: pending this commit's GitHub job

The report's `generated_at` field is derived from the latest matrix
`started_at`, not the wall-clock time at which the report command was run.

## Claim boundary

Safe claim:

> Citadel implements a signed, fail-closed engineering contract for evaluating
> outcome-aware economic routing. Its first frozen 120-cell actual matrix
> falsified the current adaptive performance claim: the controller did not
> beat prompt-only routing, and setup and manifest defects block a savings
> estimate.

Unsafe claims:

- Citadel reduces real agent cost;
- Citadel retains frontier quality at lower cost;
- Citadel is best in class;
- the Sentient performance target has been met;
- the grant package is ready to submit.

## What should happen next

Do not rerun or reinterpret this matrix. Preserve it as the negative baseline.

The next benchmark identity should:

1. make setup compatibility a preflight gate before authorization;
2. replace brittle exact-file expectations with task-owned artifact contracts;
3. isolate task verification from unrelated repository-wide tooling;
4. make attempt and route-sequence semantics unambiguous;
5. add enough tasks to distinguish a controller from prompt-only routing;
6. precommit a controller hypothesis that can earn value through calibrated
   cheap starts, evidence-based escalation, and avoided frontier calls.

Until a new precommitted matrix passes those gates, the grant thesis is the
open evaluation and controller research program, not proven economic savings.

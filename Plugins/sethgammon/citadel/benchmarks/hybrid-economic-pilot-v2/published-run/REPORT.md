# Citadel prospective hybrid economic pilot

Run: `sha256:13f324e5d92e7bab5d1d538964339ab8a60229842af4103cd84c7d58510cf661`  
Freeze: `sha256:54237369eb16f1be5283630f9a7fc541dc41e2ce48b4795532627809cefb9140`  
Window: 2026-08-02T01:09:30.630Z to 2026-08-02T01:11:56.820Z

Frozen evidence and economic gates: **passed**.

| Policy | Unique tasks | Verified | Attempts | Local 3B | Claude | Escalations | Wall time | Comparison USD | Local GPU kWh |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| always-claude-sonnet | 12 | 12/12 | 12 | 0 | 12 | 0 | 66.4s | $0.063711 | 0.000000 |
| citadel-calibrated-support-route | 12 | 12/12 | 13 | 8 | 5 | 1 | 73.8s | $0.039071 | 0.000711 |

## Comparisons

- Relative verified completion: 100.0% of always-Claude.
- Hybrid comparison-cost reduction: 38.7%.
- Request wall-time reduction: -11.3%.

## Baseline validity by frozen risk stratum

- low: 4/4 (100.0%).
- moderate: 4/4 (100.0%).
- high: 4/4 (100.0%).

## Gates

- baseline_absolute_quality: **passed**
- baseline_risk_strata: **passed**
- relative_quality: **passed**
- comparison_cost: **passed**
- terminal_coverage: **passed**
- execution_identity: **passed**
- zero_path_violations: **passed**
- zero_false_passes: **passed**
- integrity: **passed**

## Claim boundary

This prospective run uses 12 unique, author-selected synthetic repository fixtures. The baseline sends every operation to Claude Sonnet 5 through authenticated Claude Code. The candidate sends only preregistered supported operation shapes to local Qwen 2.5 Coder 3B and calls Claude for unsupported shapes or after a model-external verifier rejection. Tasks, routes, runtimes, model identities, source closure, schedule, and gates were frozen before either model executed these scenarios.

Comparison USD combines Claude Code's provider-reported `total_cost_usd` equivalent with measured local GPU electricity and frozen residual-GPU amortization. It is not the operator's actual marginal bill: the Claude Pro subscription is not allocated per request, and CPU, whole-system energy, setup, downloads, and human utility remain unknown. A pass is positive evidence on this task set, not external selection, production reliability, or general savings.

Run `npm run hybrid:v2:verify` for model-external verifier replay and offline reconstruction of model identity, routes, economics, source bindings, receipts, chains, digests, and signatures.

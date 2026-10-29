# Citadel prospective hybrid economic pilot

Run: `sha256:08f9b839e08d1a1d5c93ca7ec07a9ad5cd56a521b586c1e5e7aefcd9ec93ae91`  
Freeze: `sha256:93d43b67a039166100393a52a6f1f290e2d767e2c0cc2832ff712b4ac7f110fd`  
Window: 2026-08-02T00:55:41.516Z to 2026-08-02T00:58:35.687Z

Frozen evidence and economic gates: **failed**.

| Policy | Unique tasks | Verified | Attempts | Local 3B | Claude | Escalations | Wall time | Comparison USD | Local GPU kWh |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| always-claude-sonnet | 12 | 12/12 | 12 | 0 | 12 | 0 | 62.8s | $0.051366 | 0.000000 |
| citadel-hybrid-risk-route | 12 | 12/12 | 16 | 8 | 8 | 4 | 101.3s | $0.036800 | 0.000887 |

## Comparisons

- Relative verified completion: 100.0% of always-Claude.
- Hybrid comparison-cost reduction: 28.4%.
- Request wall-time reduction: -61.4%.

## Baseline validity by frozen risk stratum

- low: 4/4 (100.0%).
- moderate: 4/4 (100.0%).
- high: 4/4 (100.0%).

## Gates

- baseline_absolute_quality: **passed**
- baseline_risk_strata: **passed**
- relative_quality: **passed**
- comparison_cost: **failed**
- terminal_coverage: **passed**
- execution_identity: **passed**
- zero_path_violations: **passed**
- zero_false_passes: **passed**
- integrity: **passed**

## Claim boundary

This prospective run uses 12 unique, author-selected synthetic repository fixtures. The baseline sends every operation to Claude Sonnet 5 through authenticated Claude Code. The candidate sends low and moderate risk work to local Qwen 2.5 Coder 3B and calls Claude only for high risk or after a model-external verifier rejection. Tasks, routes, runtimes, model identities, source closure, schedule, and gates were frozen before either model executed these scenarios.

Comparison USD combines Claude Code's provider-reported `total_cost_usd` equivalent with measured local GPU electricity and frozen residual-GPU amortization. It is not the operator's actual marginal bill: the Claude Pro subscription is not allocated per request, and CPU, whole-system energy, setup, downloads, and human utility remain unknown. A pass is positive evidence on this task set, not external selection, production reliability, or general savings.

Run `npm run hybrid:verify` for model-external verifier replay and offline reconstruction of model identity, routes, economics, source bindings, receipts, chains, digests, and signatures.

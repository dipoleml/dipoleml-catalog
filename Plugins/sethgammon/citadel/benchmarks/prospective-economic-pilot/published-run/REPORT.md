# Citadel prospective economic repository-operation pilot

Run: `sha256:f89f3a3cde8534b23a84702174fe29c2e2625b83d994df08f82bfc081e1555d1`  
Freeze: `sha256:364ea819b1a769f07a04702c47b928c2ba0b2c77e04412615350f272ddbcb237`  
Window: 2026-08-02T00:32:14.789Z to 2026-08-02T00:38:07.827Z

Frozen evidence and economic gates: **failed**.

| Policy | Unique tasks | Verified | Attempts | 3B | 7B | Escalations | Wall time | GPU kWh | Modeled GPU USD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| always-strong-local | 12 | 8/12 | 12 | 0 | 12 | 0 | 120.6s | 0.002558 | $0.000847 |
| citadel-frozen-risk-route | 12 | 8/12 | 15 | 10 | 5 | 3 | 221.1s | 0.003442 | $0.001303 |

## Comparisons

- Relative verified completion: 100.0% of always-7B.
- Measured GPU-energy reduction: -34.6%.
- Modeled GPU-cost reduction: -53.9%.
- Request wall-time reduction: -83.4%.

## Baseline validity by frozen risk stratum

- low: 4/4 (100.0%).
- moderate: 4/6 (66.7%).
- high: 0/2 (0.0%).

## Gates

- baseline_absolute_quality: **failed**
- baseline_risk_strata: **failed**
- relative_quality: **passed**
- gpu_energy: **failed**
- modeled_gpu_cost: **failed**
- terminal_coverage: **passed**
- execution_identity: **passed**
- zero_path_violations: **passed**
- zero_false_passes: **passed**
- integrity: **passed**

## Claim boundary

This is one prospective run over 12 unique, author-selected synthetic repository fixtures on one Windows workstation, one GTX 1070, and one Qwen model family. The method, tasks, routes, models, source closure, schedule, and gates were cryptographically frozen before any model executed these scenarios. Each attempt ran in a fresh fixture copy and received a deterministic model-external verifier verdict.

A pass is positive local evidence that the frozen routing policy reduced measured GPU energy and modeled GPU cost while preserving verified completion on this task set. It is not external task selection, a production workload, a multi-stack or multi-hardware result, proof of general savings, or an actual end-to-end cash measurement. Setup, downloads, CPU and whole-system energy, and human utility remain unknown.

Run `npm run prospective:verify` to replay every verifier and reconstruct model identity, routes, economics, source bindings, receipts, chains, artifact digests, and signatures offline.

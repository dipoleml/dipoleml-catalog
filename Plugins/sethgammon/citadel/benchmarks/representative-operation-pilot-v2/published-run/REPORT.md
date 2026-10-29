# Citadel representative repository-operation pilot v2

Run: `sha256:6a270bf3ac6db239c453823fe387bfcd536ababd272e49558a0d375290e9b827`  
Freeze: `sha256:2919cec68fd2293006b9fa3139f4e2920f9e2361cf2a487b29725ed43426e3ec`  
Window: 2026-08-01T05:19:58.399Z to 2026-08-01T05:23:49.666Z

Evidence and economic gates: **failed**.

| Policy | Unique tasks | Verified cells | Attempts | 3B | 7B | Escalations | Request wall time | GPU kWh | Modeled GPU USD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| always-strong-local | 6 | 6/12 | 12 | 0 | 12 | 0 | 110.9s | 0.002507 | $0.000810 |
| citadel-risk-profile-local | 6 | 6/12 | 14 | 8 | 6 | 2 | 110.1s | 0.002329 | $0.000772 |

## Frozen comparisons

- Relative verified-cell completion: 100.0% of always-7B.
- GPU-energy reduction: 7.1%.
- Modeled GPU-cost reduction: 4.7%.
- Request wall-time reduction: 0.7%.

## Gates

- quality: **passed**
- gpu_energy: **failed**
- modeled_gpu_cost: **failed**
- terminal_coverage: **passed**
- execution_identity: **passed**
- zero_path_violations: **passed**
- zero_false_passes: **passed**

## Boundary

Six unique fixture tasks × two policies × two timing repetitions. Ephemeral workspace roots are normalized before signed verifier records are compared. All other task, route, verifier, model, and cost semantics remain frozen. This shakedown does not establish general savings. Actual end-to-end cash remains unknown.

Run `npm run representative:v2:verify` for model-external repository replay and offline reconstruction.

# Citadel prospective local economic comparison result

Run: `sha256:92f8ca62dd0a5d119a0ded1c3a78c8bf77ba9b850905cd0c6c8fc898534197c1`  
Freeze: `sha256:40858b138a4125461bc25eda126b0df5875cca5e6f19c48709153dc22be60086`  
Window: 2026-08-01T03:02:13.729Z to 2026-08-01T03:12:18.830Z

## Outcome

Evidence and economic gates: **failed**.  
False passes: **0**.  
Integrity failures: **0**.

| Policy | Verified | Attempts | 3B | 7B | Escalations | Duration | GPU kWh | Modeled comparison USD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| always-strong-local | 24/36 | 36 | 0 | 36 | 0 | 314.9s | 0.004599 | $0.001795 |
| citadel-adaptive-local | 27/36 | 39 | 24 | 15 | 3 | 280.8s | 0.004145 | $0.001609 |

## Precommitted comparison

- Relative verified completion: 112.5% of always-7B.
- GPU-energy reduction: 9.9%.
- Modeled GPU electricity plus amortization reduction: 10.3%.
- Model-duration reduction: 10.8%.
- Token reduction: -11.2%.

## Gate results

- quality: **passed**
- gpu_energy: **failed**
- modeled_cost: **failed**
- terminal_coverage: **passed**
- execution_identity: **failed**
- zero_false_passes: **passed**

## Claim boundary

This is a prospective 72-cell comparison on one Windows workstation, one GTX 1070, one Qwen model family, and exact-answer tasks. Provider invoice cost is observed $0 for self-hosted Ollama. GPU energy is measured. Electricity and GPU amortization are frozen scenario calculations, not observed bills. CPU, memory, storage, display, and whole-system energy remain unknown, so actual end-to-end cash remains unknown.

Run `npm run readiness:verify` to recompute every route, answer, receipt, chain link, artifact digest, summary, source binding, and Ed25519 signature offline.

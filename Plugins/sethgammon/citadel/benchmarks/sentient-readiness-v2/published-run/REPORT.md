# Citadel capability-profile local optimizer result

> **Disclosure:** Read the preserved method and this signed result together
> with the [v2 corrigendum](../CORRIGENDUM.md). It corrects the provenance,
> task-template overlap, and repetition interpretation without changing the
> frozen bundle or negative economic conclusion.

Run: `sha256:ef69fc777ebd7bf68ba48fe4de9c36c3a30926d45bb459b78dad7a02898a24a8`  
Freeze: `sha256:59f9b492ba72dd3f838f53eb7737983c91b859064f4d6cad8ab248090eb78f4d`  
Window: 2026-08-01T03:44:38.936Z to 2026-08-01T03:53:36.633Z

## Outcome

Evidence and economic gates: **failed**.  
False passes: **0**.  
Integrity failures: **0**.

| Policy | Verified | Attempts | 1.5B | 3B | 7B | Escalations | Duration | GPU kWh | Modeled USD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| always-strong-local | 24/36 | 36 | 0 | 0 | 36 | 0 | 243.0s | 0.003568 | $0.001389 |
| citadel-capability-profile-local | 24/36 | 48 | 18 | 6 | 24 | 12 | 284.8s | 0.004127 | $0.001617 |

## Precommitted comparison

- Relative verified completion: 100.0% of always-7B.
- GPU-energy reduction: -15.7%.
- Modeled GPU electricity plus amortization reduction: -16.4%.
- Model-duration reduction: -17.2%.
- Token reduction: -27.4%.

## Gate results

- quality: **passed**
- gpu_energy: **failed**
- modeled_cost: **failed**
- terminal_coverage: **passed**
- execution_identity: **passed**
- zero_false_passes: **passed**

## Claim boundary

This is a prospective 72-cell comparison on one Windows workstation, one GTX 1070, one quantized Qwen model family, and exact-answer tasks. Provider invoice cost is observed $0 for self-hosted Ollama. GPU energy is measured. Electricity and GPU amortization are frozen scenario calculations, not observed bills. CPU, memory, storage, display, setup/download cost, and whole-system energy remain unknown.

Run `npm run readiness:v2:verify` to recompute every route, answer, receipt, chain link, artifact digest, summary, source binding, and Ed25519 signature offline.

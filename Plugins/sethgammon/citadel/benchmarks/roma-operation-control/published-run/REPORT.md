# Citadel whole-operation control diagnostic result

Run: `sha256:daa2e179a7ed7347c532732e791862d36230a679b3eaad2f2732f627643562a4`  
Freeze: `sha256:f1ecf932261ceac604978952c42cdb8ec14032b795bffd1848fae90e9572ded5`  
Window: 2026-07-31T19:32:26.366Z to 2026-07-31T19:51:35.146Z

## Outcome

Evidence machinery: **passed**.  
Optimizer performance hypothesis: **failed**.  
False passes: **0**.  
Receipt-integrity failures: **0**.  
Execution-control failures: **0**.

| Policy | Verified | Rate | Duration | Prompt tokens | Completion tokens | Frontier calls | 3B calls | 7B calls | Escalations |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| frontier-only | 6/6 | 100.0% | 47.7s | 99411 | 294 | 6 | 0 | 0 | 0 |
| prompt-router | 3/6 | 50.0% | 40.8s | 50133 | 825 | 3 | 3 | 0 | 0 |
| always-open-local | 2/6 | 33.3% | 13.2s | 857 | 72 | 0 | 0 | 6 | 0 |
| citadel-whole-operation | 4/6 | 66.7% | 1042.8s | 100004 | 21398 | 0 | 55 | 34 | 3 |

## Interpretation boundary

This is a six-task diagnostic, not a general superiority claim. A model or stack status never counted as completion; only the frozen deterministic answer verifier did. The total USD cost remains unknown because subscription allocation, CPU/system energy, electricity price, and hardware amortization were not all measured. Self-hosted Ollama provider invoice cost was $0 per request, which is not the same claim as zero total cost.

Citadel avoided 0 strong whole-operation attempt(s) relative to always-7B local while recording every module/provider call and all verifier-triggered escalation.

Run `npm run operation-proof:verify` to recheck source bindings, cell artifacts, deterministic verification, control reconciliation, content digests, and the Ed25519 bundle signature.

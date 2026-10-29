# Citadel capability-profile local optimizer benchmark v2

## Purpose

This prospective follow-up tests a policy change motivated by, but not tuned on, the locked v1 result. V1 routed every compact task to one 3B model and reduced measured GPU energy by only 9.9%. Before seeing any v2 holdout outputs, Citadel freezes a capability profile with three lanes: a 1.5B lane for atomic numeric work, a 3B lane for lexical counting, and a 7B lane for compositional, constraint, or adversarial work. An independently recomputed exact-answer verifier may escalate a failed small-model attempt once to 7B.

The claim under test is narrow: on this machine and task set, can the frozen capability profile preserve at least 95% of the always-7B verified completion rate while reducing measured GPU energy and modeled GPU electricity plus amortization by at least 30%?

## Prospective controls

- Twelve new holdout tasks are stored in `scenarios.json`; none appeared in v1 or calibration.
- Two policies run three repetitions per task: 72 signed cells total.
- The order is fixed by hashing the frozen seed, scenario, policy, and repetition.
- `always-strong-local` runs Qwen2.5-Coder 7B once.
- `citadel-capability-profile-local` applies only frozen task-text rules: numeric atomic -> 1.5B, lexical counting -> 3B, and compositional/constraint/adversarial -> 7B.
- A failed 1.5B or 3B answer escalates once to 7B. A 7B initial route does not escalate.
- Every request uses temperature 0, seed 42, a 2,048-token context, a 128-token output cap, and `keep_alive: 0` so each measured attempt includes cold model residency costs.
- The answer verifier is deterministic and external to the model. Model prose cannot change a verdict.
- Each cell binds requested and observed model identity, output and answer verdict, token counts, duration, sampled GPU energy, modeled comparison cost, the preceding receipt digest, and an Ed25519 signature.
- Offline verification recomputes routing, answers, economics, chain links, artifacts, source digests, and signatures.

## Frozen gates

- Relative verified completion >= 95% of always-7B.
- Measured GPU-energy reduction >= 30%.
- Modeled GPU electricity plus amortization reduction >= 30%.
- Complete terminal coverage, verified execution identity, zero false passes, and zero integrity failures.

The aggregate is a failure if any gate fails. Failed and unknown executions remain in the result.

## Cost boundary

Ollama has no per-request provider invoice. GPU energy is sampled with `nvidia-smi`. Electricity uses a frozen $0.20/kWh scenario. GPU amortization uses a frozen $100 residual value over 10,000 useful compute hours. CPU, memory, storage, display, setup/download cost, utility-bill reality, and whole-system energy are unknown. The modeled total is a comparison metric, not an observed cash bill.

## Generalization boundary

This is one Windows workstation, one GTX 1070, one quantized Qwen model family, and exact-answer tasks. It tests whether the capability-profile mechanism can produce a prospective result; it does not establish broad production savings or best-in-class performance.

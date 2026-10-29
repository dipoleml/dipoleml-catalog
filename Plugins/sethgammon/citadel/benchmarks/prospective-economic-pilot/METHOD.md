# Prospective economic repository-operation pilot

## Question

Can a policy frozen before execution preserve verified repository-operation
completion while reducing measured GPU energy and modeled GPU cost relative to
running the stronger local model for every operation?

## Frozen design

- Twelve unique, previously unrun synthetic repository operations.
- One attempt per task and policy; repetitions are not substituted for task
  diversity.
- Baseline: Qwen 2.5 Coder 7B for every task.
- Candidate: Qwen 2.5 Coder 7B for high-risk tasks; Qwen 2.5 Coder 3B for low
  and moderate risk, with one 7B escalation only after the deterministic
  repository verifier rejects the 3B artifact.
- Temperature zero, fixed seed, fixed context and output limits.
- Fresh fixture copy for every attempt.
- Exact allowed-path contract and a model-external Node verifier for every
  artifact.
- Stable hash schedule, signed receipt chain, full transitive source binding,
  and offline verifier replay.

The fixtures and risk labels are author-selected. No model has executed these
exact scenarios before the freeze. There is no outside selector, and the task
set is not represented as a random sample of production work.

## Gates

Every gate must pass:

1. Always-7B verifies at least 80% of all tasks.
2. Always-7B verifies at least 70% within each preregistered risk stratum.
3. The candidate preserves at least 95% of always-7B verified completion.
4. Candidate measured GPU energy is at least 30% lower.
5. Candidate modeled GPU cost is at least 30% lower.
6. All scheduled cells terminate with verified runtime identity.
7. Zero changed-path violations, false passes, receipt-chain failures, source
   drift, digest drift, or signature failures.

Unknown measurement fails its dependent gate. No failed cell is silently
removed. The frozen schedule may be resumed but not rewritten.

## Economics boundary

GPU energy is average `nvidia-smi` board power sampled every 500 ms multiplied
by request wall duration. Modeled comparison cost is that energy at the frozen
electricity rate plus duration-based residual GPU amortization. Provider invoice
is exactly zero for self-hosted Ollama requests. Actual end-to-end cash is
unknown because CPU and whole-system energy, setup, downloads, observed utility
rate, and human utility are not measured.

## Interpretation

A pass is positive local evidence for this frozen task set. It is not external
selection, production reliability, multi-family or multi-stack validation,
general savings, or a complete cost-of-ownership result. A failure remains a
published diagnostic result.

# Citadel prospective local economic comparison

Status: **unexecuted method** until `freeze.json` is generated, committed, and
published. Measured execution must refuse to start when the freeze or its
source digests do not verify.

## Question

Can a deterministic Citadel policy preserve the independently verified
completion rate of always using the larger local model while reducing measured
GPU energy, model duration, and a declared comparison-cost model?

This is a preregistered local pilot on one consumer machine. It is not evidence
of broad agent-stack superiority, production reliability, or actual-dollar
savings.

## Frozen comparison

- 12 previously unexecuted tasks: eight compact controls and four deeper
  constraint, graph, scheduling, and adversarial tasks.
- Two policies: `always-strong-local` and `citadel-adaptive-local`.
- Three repetitions per task and policy, for 72 primary cells.
- `always-strong-local` makes one Qwen2.5-Coder 7B call.
- `citadel-adaptive-local` applies Citadel's already-published task-feature
  function. Scores below `0.20` start with Qwen2.5-Coder 3B; other tasks start
  with 7B. A failed 3B answer may escalate once to the same 7B baseline model.
- Temperature is zero and output is capped at 128 tokens.
- Cell order is derived from the frozen seed and task/policy/repetition IDs.

Each model receives only the task plus an instruction to return one JSON object
with an `/answer` value. Expected answers remain digest-only and are never sent
to the provider.

## Verification and integrity

- Completion is decided outside the model by exact canonical SHA-256 answer
  comparison.
- Model self-reports cannot pass a cell.
- Requested model, observed model, and the installed Ollama manifest digest
  must agree.
- Every attempt retains duration, tokens, output digest, and sampled GPU power.
- Primary cell receipts form a hash chain in frozen execution order.
- Every cell receipt and the final bundle are Ed25519-signed.
- Failed, unknown, interrupted, and escalated attempts remain in the bundle.
- Offline verification recomputes scenarios, routes, answers, receipts, chain,
  summaries, source digests, model identities, and signatures.

## Economic lenses

No list price is presented as cash spend.

- Ollama provider invoice: observed `$0` per request.
- GPU energy: measured by 500 ms NVIDIA power samples and integration over the
  attempt wall duration.
- Electricity comparison: derived from measured GPU kWh using a frozen
  `$0.20/kWh` scenario assumption; it is not Seth's observed utility rate.
- GPU amortization comparison: derived from a frozen `$100` residual-value and
  `10,000` useful-compute-hour scenario; it is not an invoice or appraisal.
- CPU, memory, storage, display, and whole-system energy remain unknown.
- Setup and model-download costs are excluded and disclosed.
- Human intervention during measured execution must be zero.

The pilot may therefore claim measured GPU-energy and modeled comparison-cost
differences. It may not claim complete actual-dollar savings.

## Precommitted gates

The local pilot passes only when all are true:

1. adaptive verified completion is at least 95% of the always-7B rate;
2. adaptive measured GPU energy is at least 30% lower than always-7B;
3. adaptive modeled GPU electricity plus amortization is at least 30% lower;
4. every completed attempt has exact model and manifest evidence;
5. every primary cell has a terminal passed, failed, or unknown classification;
6. adversarial false passes, signature failures, chain failures, and receipt
   integrity failures are all zero.

Latency and token differences are reported but are not passing gates.

## Claim boundary

A passing result would establish one prospective constrained-hardware economic
comparison for an open local model family. It would not establish the funded
target across multiple stacks, model families, machines, or real repositories.
A failed gate is still a publishable result and must not be replaced under this
benchmark identity.


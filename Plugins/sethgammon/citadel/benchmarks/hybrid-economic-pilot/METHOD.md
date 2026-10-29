# Prospective hybrid economic repository-operation pilot

## Question

Can Citadel preserve model-externally verified completion while reducing a
provider-reported and locally measured comparison cost relative to sending
every operation to a strong cloud model?

## Frozen design

- Twelve unique, previously unrun synthetic repository operations: four low,
  four moderate, and four high risk.
- Baseline: authenticated Claude Code, requested `sonnet`, exact observed
  canonical model `claude-sonnet-5`, on every task.
- Candidate: local Qwen 2.5 Coder 3B on low and moderate risk, then Claude only
  after deterministic verifier rejection; Claude directly on high risk.
- Claude runs in print mode with tools, persistence, custom settings, skills,
  and plugins disabled. Ollama runs at temperature zero with a fixed seed.
- Fresh fixture copy, exact allowed-path contract, and model-external Node
  verifier for every attempt.
- Stable hash schedule, signed receipt chain, transitive source binding, exact
  runtime identity, retained outputs, and offline replay.

The task set is author-selected and was informed by the failed local-only
prospective pilot. Neither model has executed these exact scenarios before the
freeze. There is no external selector or claim of production sampling.

## Gates

All gates must pass: at least 80% baseline verified completion overall; at least
70% baseline completion in every risk stratum; at least 95% candidate completion
relative to baseline; at least 30% comparison-cost reduction; complete terminal
and execution-identity coverage; and zero changed-path, false-pass, source,
receipt, chain, digest, or signature failures.

## Economics boundary

Cloud comparison cost is Claude Code's returned `total_cost_usd`, retained as a
provider-reported equivalent rather than represented as the operator's bill.
Local comparison cost is measured GPU electricity at the frozen rate plus
duration-based residual GPU amortization. Claude Pro subscription allocation,
CPU and whole-system energy, setup, downloads, and human utility are unknown.
The combined USD figure is useful for a controlled policy comparison but is not
actual end-to-end cash.

## Interpretation

A pass would establish a positive prospective hybrid result on this task set:
the controller called the strong model less often without losing externally
verified completions and cleared its frozen economic threshold. It would not
establish general savings, production reliability, independent task selection,
or complete cost of ownership.

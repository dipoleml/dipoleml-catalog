# Prospective calibrated hybrid economic pilot v2

## Calibration change

The first hybrid pilot preserved 12/12 verified completions and avoided four
Claude calls, but its risk-only eligibility rule attempted local work on four
unsupported shapes. It reduced comparison cost by 28.4%, missing the frozen
30% gate. A paired-cost sensitivity was 30.1%, but that post-run diagnostic did
not change the failed verdict.

V2 freezes a narrower support envelope learned from that failure. Local 3B is
eligible only for a single-file structured config migration, a single-file
package-script addition, a single-file nullish-default preservation repair, or
a single-file case-insensitive lookup repair. Documentation synchronization,
strict parsers, refactors, security work, and multi-file API changes route
directly to Claude. Verifier rejection still triggers exactly one Claude
recovery.

## Frozen design

- Twelve new operations never sent to either model: eight inside the calibrated
  local support envelope and four direct-to-Claude high-risk operations.
- Baseline: authenticated Claude Code `sonnet`, exact canonical identity
  `claude-sonnet-5`, on all twelve tasks.
- Candidate: pinned local Qwen 2.5 Coder 3B only when `local_eligible` is frozen
  true; otherwise Claude. One Claude recovery follows an external-verifier
  rejection.
- Tools, persistence, project customizations, plugins, and skills are disabled
  for Claude. Ollama uses temperature zero and a fixed seed.
- Fresh fixture copies, exact changed-path contracts, deterministic hidden Node
  verifiers, stable hash schedule, signed chain, full source closure, retained
  outputs, exact runtime identity, and offline replay.

Tasks are author-selected and shaped by prior calibration; this is disclosed,
not independent selection. Neither model has executed these exact scenarios
before freeze.

## Gates and economics

The unchanged gates require at least 80% baseline completion overall, 70% in
every risk stratum, 95% relative candidate completion, 30% comparison-cost
reduction, full terminal and runtime-identity coverage, and zero path,
false-pass, source, receipt, chain, digest, or signature failures.

Comparison USD combines Claude Code's returned `total_cost_usd` equivalent with
measured local GPU electricity and frozen residual-GPU amortization. Claude Pro
subscription allocation, CPU and whole-system energy, setup, downloads, and
human utility remain unknown. A pass is evidence for the calibrated support
envelope on these tasks, not general savings or complete cost of ownership.

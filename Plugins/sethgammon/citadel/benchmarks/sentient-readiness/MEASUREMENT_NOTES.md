# Local measurement semantics

These notes apply to the signed v1 and v2 local Ollama studies.

- `duration_ms` is client request/attempt wall time around the local HTTP call.
  It is not provider-only model duration. Ollama's
  `provider_total_duration_ns` is retained per successful response but was not
  used in the published aggregate.
- GPU energy is derived from the recorded average GPU power and attempt wall
  duration. The number of 500 ms samples and average watts are retained; the
  raw sample series is not. This supports arithmetic reconstruction but not a
  reanalysis of within-attempt power variance.
- `human_interventions_during_cells: 0` is an operator declaration embedded in
  the environment record. It was not instrumented by an independent sensor or
  event ledger and must be described as operator-declared.
- Provider invoice cost is known zero for self-hosted Ollama calls, while actual
  end-to-end cash remains unknown because whole-system energy, setup/download
  allocation, and the observed utility rate were not measured.
- The freeze source lists did not include every transitive runtime/verifier
  dependency. `DEPENDENCY_CLOSURE.json` reconstructs the closure from Git
  objects at the signed execution commit; it is a post-run supplement, not a
  retroactive preregistration change.

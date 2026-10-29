# Citadel grant risk register

| Risk | Why it could invalidate the result | Mitigation and evidence |
|---|---|---|
| Benchmark overfitting | A router can look efficient on tasks or templates used to design it | V2 is disclosed as new exact instances from mostly reused templates, not an independent family holdout; funded tasks separate calibration, template families, and held-out repositories before freeze |
| Pseudo-replication | Repeated deterministic cells can be mistaken for independent tasks | Report unique-task count first; repetitions estimate runtime variance; statistics cluster by unique task and repository |
| Timeout sensitivity | One timeout can create an apparent policy saving | Publish matched-pair and precommitted timeout/outlier sensitivity; v1's direction reversal is now a named artifact |
| Cherry-picked reruns | Retrying only failures manufactures a stronger aggregate | Intent-before-cell ledger; immutable cell paths; ambiguous runs are unknown and never retried automatically |
| Weak or correlated verifier | The same model can reward its own mistake | Deterministic verifier outside the routed model where possible; different-family arbiter only for irreducible judgment; publish verifier identity and never imply third-party independence |
| Weak strong-model baseline | A controller can appear quality-preserving only because the comparator also fails | Always-frontier must clear 80% overall and 70% per stratum before economics govern; the public holdout's 2/16 Claude result is retained as baseline-invalid |
| Retrieval or edit-protocol bottleneck | Both model families can fail because required code was not retrieved or full-file JSON was unusable | Fund and freeze a patch/edit contract, retrieval-coverage tests, gold/reference reconstruction, parse telemetry, and no-hidden-test boundary before the larger evaluation |
| Model substitution | Requested and actual runtime paths can differ | Requested/observed reconciliation, exact manifest IDs, provider receipts, fail-closed unknown state |
| Missing costs | Token-only accounting hides tools, retries, local compute, and people | Separate actual, marginal, market-equivalent, energy, amortization, setup, and human lenses |
| Local hardware generalization | One GTX 1070 result may not transfer | Funded benchmark spans hardware profiles; current result is labeled single-machine |
| Provider and model drift | Hosted defaults and model IDs change | Pin public commits and explicit models; record runtime version and observed identity |
| Setup and survivorship bias | Failed installations disappear from the sample | Preflight and setup failures remain terminal unknowns; fresh-clone proof is separately versioned |
| Verifier leakage | Expected answers or tests can enter model context | Digest-only expected answers; isolated workspaces; exact source bindings |
| Incomplete source binding | A freeze can omit transitive verifier or runtime dependencies | Supplement existing studies with execution-commit dependency closure; future freezes bind the full transitive source tree before execution |
| Evidence tampering | Reports can be edited after a run | Content-addressed artifacts, receipt chains, operator Ed25519 signatures, offline reconstruction; signatures are tamper evidence, not proof against operator fabrication |
| Privacy leakage | Raw prompts, paths, logs, or secrets can become public | Bounded output, path and secret redaction, privacy-safe public bundles, local-first telemetry |
| Controller overhead | Coordination and verification can cost more than they save | Include controller, verifier, retry, and model-load overhead; publish failed economic gates |
| Single-maintainer continuity | Public infrastructure and canonical release authority can stagnate | MIT licensing, forkable release tooling, versioned contracts, key recovery/rotation, 12-month maintenance reserve; no successor is currently confirmed, so canonical stewardship remains an explicit risk |
| Misleading product complexity | Research surfaces can obscure first value | Keep `/do` and `/do next` primary; advanced control remains progressive and optional |

## Stop conditions

Citadel must refuse a savings claim when completion quality falls below the
frozen floor, any material cost component required by the comparison is
unknown, model identity is not observed, the verifier changes after execution,
or artifact/signature reconstruction fails.

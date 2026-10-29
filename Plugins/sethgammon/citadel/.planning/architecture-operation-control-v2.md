# Operation Control v2 experience decision

Status: accepted for implementation

## User and job

The primary user already has Claude Code or Codex and wants a useful result from a repository. They should not have to learn Citadel's subsystems, topology names, receipt schemas, or model catalog before getting that result.

The advanced user needs to put a quality target, tool boundary, privacy rule, time ceiling, or economic ceiling around a whole operation and let Citadel choose and escalate an execution path without turning missing evidence into success or zero cost.

## Experience promise

Citadel has one front door and four progressive levels:

1. `/do <outcome>` routes and verifies ordinary work.
2. `/do next` and `/do continue` preserve and resume work that outlives one session.
3. Campaign, fleet, and Mission Control surfaces coordinate longer or parallel work.
4. Operation Control is explicit power-user infrastructure for constrained, comparable, receipt-backed execution.

Every level is independently useful. No lower level exposes configuration required only by a higher level.

## Core loop

Ask -> choose the least complex viable path -> execute -> independently verify -> stop or escalate only for a classified reason -> record what is known, unknown, and spent -> resume through `/do next` if needed.

## Operation Control decisions

- Optimize the expected cost of the complete fallback path, not a single model call.
- Select from declared plans that may differ by model, topology, and tools.
- Calibrate success from verified outcomes, with conservative priors when evidence is sparse.
- Start directly when a direct plan can meet the target; recursion is a candidate, not a default.
- Retry the same plan only for declared repairable failures. Otherwise move to a declared fallback.
- Enforce privacy and tool allowlists before execution and reconcile the observed model, topology, and tool calls afterward.
- Track actual cash, marginal, and market-equivalent cost as separate lenses. Unknown never becomes zero.
- Treat a digest or valid signature as integrity evidence, not proof that the signer is trusted or that the result is correct.
- Use an out-of-process JSON adapter protocol so the controller can attach to Claude Code, Codex, local models, tools, ROMA, or another harness without owning their internals.

## Defaults and recovery

- `/do` remains the documented default.
- `citadel operation plan` is read-only.
- `citadel operation run` requires explicit request, catalog, and workspace inputs. Adapter and verifier processes run without a shell.
- An explicit cost ceiling rejects unknown-cost paths unless the request opts into allowing unknown cost.
- Missing observations produce `unknown`; mismatched observations fail control reconciliation.
- A failed verifier can escalate only through the frozen fallback path. Exhaustion ends `failed` or `unknown`; it cannot self-report `passed`.

## Proof boundary

The original ROMA diagnostic remains frozen and reproducible. v2 ships separately and may ingest its outcomes, plus the existing 120-cell real-repository optimizer run, as historical evidence. Retrospective calibration demonstrates evidence ingestion and controller behavior; only a prospective controlled run can establish a causal savings claim.

## Acceptance gates

- A new user can understand the first useful command in under one README screen.
- Planning works without a model, provider account, or daemon.
- The npm package includes the runtime, CLI, examples, and tests.
- Contract, routing, cost, tool-governance, retry, execution, verification, tamper, and packaging tests pass.
- Public documentation names limitations and separates the frozen diagnostic, retrospective evidence, and prospective claims.

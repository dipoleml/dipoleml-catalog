# Citadel whole-operation control diagnostic

Status: **method frozen by `freeze.json`; no measured cell may run unless that freeze verifies.**

## Question

Can Citadel govern an existing recursive agent stack at a level that prompt-only model routing cannot: module assignment, decomposition depth, concurrency, subtask ceiling, retry budget, operation timeout, tool availability, and verifier-triggered escalation? Can it prove the declared plan was the configuration and provider path actually exercised?

This is a compact diagnostic, not a population-level performance claim.

## Frozen comparison

Six previously unexecuted holdout tasks are each run under four policies, for 24 primary cells:

1. `frontier-only`: one direct, read-only Codex CLI attempt with the explicitly requested subscribed frontier model.
2. `prompt-router`: a frozen prompt-text heuristic chooses either that same frontier call or one direct 3B open/local call for the whole query. It cannot change topology, retries, tools, or module assignments.
3. `always-open-local`: one direct 7B open/local Ollama call.
4. `citadel-whole-operation`: a signed Citadel plan configures pinned ROMA module-by-module. One escalation attempt is allowed only after the independent deterministic verifier fails attempt one. All attempts count.

Policy order within each scenario is deterministically shuffled from the frozen seed. A cell receives only its task. Codex runs in an empty temporary workspace. Direct Ollama calls have no tools. ROMA receives no user-configured or external toolkits. ROMA's mandatory internal `ArtifactToolkit` for executor/aggregator is inventoried separately from external tool controls, and actual provider tool calls are recorded. Expected-answer digests are never included in model or ROMA inputs.

The prompt-score thresholds and six prompts are frozen before any of those prompts are executed. They intentionally cover compact, mixed, and stronger/deeper Citadel plan branches and both prompt-router delegates; this is branch coverage, not outcome-based tuning.

The local hardware profile is a single 8 GB GPU. Citadel therefore freezes ROMA concurrency at one, keeps controller modules (atomizer/planner) on 3B, reserves 7B for execution/synthesis when the prompt score warrants it, and applies separate output-token ceilings to every module. Mixed plans are bounded to one decomposition layer and three subtasks; the strongest plan is bounded to two layers and four subtasks. Provider retries are zero; the only second attempt is the visible verifier-triggered Citadel escalation.

The ROMA bridge atomically checkpoints sanitized configured controls and provider-call history while an operation is in flight. A process kill or timeout can therefore retain partial model/token evidence, but its status remains incomplete and cannot pass either control reconciliation or completion verification.

## Pre-measurement engineering disclosure

The atomic, direct-local, subscribed-frontier, and atomic-ROMA smoke paths passed before freeze. A separate non-holdout compositional engineering prompt produced three ROMA timeouts while single-GPU bounds were progressively tightened. Those failures led to 3B controller assignment, lower per-module output ceilings, concurrency one, provider retries zero, and atomic in-flight checkpoints. The engineering prompt is not a measured cell, is not included in the result, and none of the six diagnostic prompts was executed before freeze.

## Success and non-success

Primary outcome: independently verified completion rate. A completion passes only when the final parseable JSON object contains `/answer` whose canonical SHA-256 equals the frozen expected digest. Model prose, ROMA status, and self-reported verdicts cannot pass a cell.

Required integrity gates:

- zero false passes in adversarial and synthetic tamper checks;
- exact ROMA upstream commit and adapter digest;
- exact Ollama model manifest digests;
- configured controls reconcile to the signed plan;
- every exercised ROMA module has provider-call history identifying the planned model;
- unexercised modules are reported as `not_exercised`;
- every receipt is content-addressed and the final bundle is Ed25519-attested.

The Citadel performance hypothesis is supported only if its verified completion rate is not below `always-open-local` and it avoids at least one strong whole-operation attempt without creating a false pass. For this local comparison, a strong attempt means the primary executor is the 7B model; the always-open-local baseline therefore has six. Otherwise the integration/evidence result may still pass while the optimizer hypothesis is reported as failed.

## Cost boundary

No list-price proxy is presented as spend. The receipt includes every material component even when unknown:

- provider invoice: known $0 for self-hosted Ollama; unknown per-request allocation for a subscription CLI;
- measured wall duration and tokens where the runtime reports them;
- sampled GPU energy when NVIDIA telemetry is available;
- CPU/system energy, electricity price, and hardware amortization remain explicit unknowns unless measured;
- setup/download time is disclosed and excluded from measured cells;
- human interventions are zero during measured execution.

Therefore total USD remains `unknown` whenever any end-to-end monetary component is unmeasured.

## Reproduction boundary

`npm run operation-proof:verify` verifies the published frozen method and proof bundle without model access. `npm run operation-proof:doctor` checks a reproduction environment. `npm run operation-proof:run` performs a new attested 24-cell reproduction against the bound ROMA commit and model digests; it does not overwrite the published proof unless explicitly given a different output directory.

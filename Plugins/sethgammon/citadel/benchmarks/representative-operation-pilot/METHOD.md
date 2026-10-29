# Representative repository-operation pilot

Status: prospective shakedown method. Freeze before any measured cell.

## Question

Can Citadel execute and verify artifact-producing repository operations while
accounting for failed attempts and escalation, rather than evaluating only
single-answer prompts?

This pilot is an external-validity bridge, not a general economic benchmark.

## Task population

Six unique, privacy-safe fixture repositories cover:

1. bug fixing with tests;
2. configuration migration;
3. documentation consistency;
4. behavior-preserving refactor;
5. path-boundary security repair; and
6. multi-file API compatibility.

Each task declares model-visible input files, allowed changed files, and a
hidden deterministic repository verifier. Model output must be a JSON object
mapping allowed relative paths to complete replacement file content. The
harness applies it to a fresh isolated copy and runs the verifier subprocess.

## Policies and schedule

- `always-strong-local`: Qwen2.5-Coder 7B for every attempt.
- `citadel-risk-profile-local`: Qwen2.5-Coder 3B for low/moderate-risk
  single-file operations; 7B for security and multi-file API operations. A
  failed 3B verification triggers exactly one 7B attempt in a fresh copy.
- Two timing repetitions per unique task/policy.
- Temperature 0, seed 73, 4096-token context, and 1024 output-token ceiling.
- The randomized 24-cell order is frozen before execution.

Repetitions estimate runtime variability. The study contains six unique tasks,
not 24 independent task samples.

## Evidence and cost

Every attempt retains requested and observed model identity, raw model output,
parsed changed-file map, applied-file digests, verifier command/status/bounded
stdout and stderr, request wall duration, token counts, measured average GPU
power-derived energy, modeled GPU electricity plus amortization, and unknown
actual end-to-end cash. Each cell and final bundle is operator-signed with
Ed25519 and linked into a receipt chain.

The deterministic verifier is outside the routed model and policy. It is not a
third-party audit. Operator signatures provide tamper evidence, not proof that
the operator could not fabricate an execution.

## Gates

- at least 95% of always-7B verified-cell completion;
- at least 30% lower measured GPU energy and modeled GPU cost;
- zero changed paths outside the declared allowlist;
- zero false passes or receipt/source/identity integrity failures;
- all setup and verifier failures remain terminal failed or unknown evidence.

Passing this shakedown would prove the repository-operation harness and
measurement loop, not best-in-class routing or general savings. Failing the
economic gate is a publishable result.

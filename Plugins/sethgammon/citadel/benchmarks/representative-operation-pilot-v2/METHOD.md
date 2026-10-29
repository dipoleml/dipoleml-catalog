# Representative repository-operation pilot v2

Status: prospectively frozen repair of the v1 harness failure.

V1 aborted after its first scheduled cell because verifier stderr embedded a
random temporary-workspace path, making immediate offline replay byte-unequal.
V2 changes one evidence-normalization rule: paths matching the harness-created
ephemeral workspace root are replaced with `<ISOLATED_WORKSPACE>` before the
verifier record is signed or compared.

The six fixture repositories, tasks, allowed changed paths, deterministic
verifiers, model digests, policies, two timing repetitions, temperature, seed
for model generation, cost lenses, and gates otherwise remain the same as v1.
The 24-cell order uses a new v2 schedule seed and is frozen before execution.

Each attempt still occurs in a fresh isolated fixture copy. The model returns
complete replacement contents for exactly the allowed files; the harness
applies them and invokes a hidden subprocess verifier. A failed 3B attempt for
low/moderate-risk work escalates once to 7B in another fresh copy. High-risk
security and multi-file tasks use 7B first.

Repetitions estimate runtime variability. This remains a six-unique-task
shakedown, not a general benchmark. Operator signatures prove tamper evidence
under the published key, not third-party execution. Actual end-to-end cash
remains unknown.

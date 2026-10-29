# Citadel grant evaluator: start here

Citadel is applying to build open token and economic optimization for agent
operations. The narrow thesis is:

> The unit worth optimizing is not a model call. It is a model-externally
> verified operation, including models, topology, tools, retries, local
> compute, failures, and unknown costs.

## The review path

1. [Product overview](https://sethgammon.github.io/Citadel/): start with `/do`
   and open progressively into persistent and controlled operation.
2. [Research program](https://sethgammon.github.io/Citadel/research.html): the
   evidence ladder, funded target, and explicit claim boundary.
3. [Generated evidence manifest](../EVIDENCE_MANIFEST.md): current public
   numbers generated from canonical artifacts.
4. [Outside-authored public holdout](../../benchmarks/public-holdout-pilot/REPORT.md):
   the completed secondary diagnostic across 24 distinct repositories, plus its
   [independent calculation and data validation](../../benchmarks/public-holdout-pilot/VALIDATION.md).
5. [Calibrated hybrid economic pilot](../../benchmarks/hybrid-economic-pilot-v2/published-run/REPORT.md):
   the passed 24-cell prospective comparison across 12 new artifact-producing
   tasks, Claude Sonnet 5, and local Qwen 2.5 Coder 3B.
6. [Calibration trail](../../benchmarks/hybrid-economic-pilot/published-run/REPORT.md):
   the retained 28.4% near-miss that informed the narrower v2 support envelope.
7. [Delivery evidence](GITHUB_DELIVERY_EVIDENCE.md): dated maintainer-attributed
   history, public interest, owner-visible traffic, and the exact boundaries on
   what those counts do not prove.
8. [Grant draft](SENTIENT_OPTIMIZER_APPLICATION_DRAFT.md): the request, public
   deliverables, budget, and risks.

Application support: the required eight-page PDF is generated at
[`output/pdf/citadel-sentient-grant-packet.pdf`](../../output/pdf/citadel-sentient-grant-packet.pdf),
with its render source in
[`scripts/render-sentient-grant-packet.py`](../../scripts/render-sentient-grant-packet.py).
The live-form audit and exact claim boundary are in
[`SUBMISSION_READINESS.md`](SUBMISSION_READINESS.md).

## Ninety-second technical review

Run the complete offline evidence path without model access:

```text
npm run grant:verify
```

That command runs seventeen canonical checks, including both public-holdout
verification paths and hybrid v2, and
recomputes signatures, source bindings, receipt chains, reports, and public
claims. It does not ask the controller or models whether they won.

## Current result in one paragraph

Citadel's contract and actual-run coverage spans Claude Code, Ollama, and a
pinned Sentient ROMA integration. Earlier studies retained multiple negative
policies. A synthetic hybrid v2 later verified 12/12 under both policies and
reduced comparison cost 38.7% inside an author-selected support envelope. The
public-random primary capstone then stopped `setup-unknown` before inference.
A disclosed secondary pilot assigned 24 distinct outside-authored repositories,
sealed routes before evaluation calls, and received all 32 official verdicts.
Qwen passed 1/16, direct Claude 2/16, and the Qwen-first controller 3/16 at 1.26%
lower comparison cost. Because direct Claude passed only 12.5% overall and 0%
in three strata, Citadel rejects the frozen descriptive signal as a general
optimization result. The evidence system worked; retrieval, edit representation,
baseline strength, calibration power, actual cash, and generalization remain
the funded work.

## What funding buys

The grant repairs the exact failure exposed on outside-authored work: improve
retrieval and edit representation, establish a strong route that clears 80%
overall and 70% per stratum, measure actual end-to-end cost, and learn which
models, agents, topology, tools, retries, and verification paths preserve at
least 95% of that valid baseline while reducing cost at least 30% across stacks,
model families, hardware profiles, repositories, and task strata. A weak
baseline invalidates the comparison rather than lowering the bar.

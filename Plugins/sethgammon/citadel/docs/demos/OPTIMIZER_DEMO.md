# 90-second Optimizer Demo

This script is for the engineering-contract stage. Do not replace “fixture”
with “result” until attested actual runs exist.

## 0–15 seconds: the waste

Show one frozen task and the four policies.

Narration:

> Coding agents normally choose a model once and let the bill happen. Citadel
> treats the whole operation as an economic decision: model, agent count,
> topology, tools, retries, and when to stop.

## 15–35 seconds: inspect before spending

Run:

```bash
node scripts/optimizer-benchmark.js plan \
  --scenario nanoid-size-consistency \
  --policy adaptive \
  --fixture-probe
```

Point to:

- the bounded probe;
- cross-cutting scope;
- selected capability tier;
- prediction source `policy_assumption`;
- explicit escalation plan.

Say plainly that the probe is a fixture for the demo.

## 35–55 seconds: compare policies

Show:

- always-frontier;
- always-cheap;
- prompt-only;
- adaptive.

Explain that prompt-only routing already exists elsewhere. The proposed value
is changing the whole execution path and checking the final outcome rather than
merely selecting one response model.

## 55–75 seconds: prevent fake savings

Show a failed cheap attempt still present in total cost. Then change one cost to
unknown and rerun the report.

Narration:

> Unknown is not zero. Failed work is not free. Incomplete work cannot become a
> saving. A model substitution or tampered record cannot become a pass.

## 75–90 seconds: the honest close

Run:

```bash
node scripts/optimizer-benchmark.js doctor
```

Close with:

> The controller and proof contract are ready. Real savings are not proven
> yet. These blockers are the exact work between this repo and a defensible
> grant claim.

Then show `node scripts/optimizer-benchmark.js calibration-plan`: it enumerates
the 12 non-holdout runs and makes no model calls. The blocked status is part of
the proof, not a demo failure.

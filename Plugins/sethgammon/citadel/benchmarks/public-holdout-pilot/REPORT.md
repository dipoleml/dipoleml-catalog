# Public holdout fast pilot - final report

Status: complete secondary pilot; all assigned outputs and official verdicts published

Observed through: 2026-08-03 UTC

## Bottom line

Citadel completed the full prospective control and evidence sequence on 24
outside-authored tasks from 24 distinct repositories: eight calibration tasks
and sixteen untouched evaluation tasks. Routes were signed and published before
any evaluation-model call. The official SWE-bench-Live evaluator returned a
verdict for every evaluation output.

The frozen descriptive rule records a preliminary in-sample signal: the sealed
local-first controller verified 3/16 tasks versus 2/16 for direct Claude and
used 1.26% less comparison cost. That is not a credible generalized optimization
result. Direct Claude verified only 12.5% overall and 0% in three of four
strata, so it was not a useful strong baseline. Actual subscription cash also
remains unknown.

The defensible result is that Citadel made the failure legible. It preserved the
prospective assignment, model identities, output-contract failures, comparison
amounts, external verdicts, route ledger, and negative baseline finding without
turning any unknown into a pass or a saving.

## Study shape

The original public capstone remains terminal `setup-unknown`: its signed gold
preflight yielded only 41 of 60 required evaluation tasks. This secondary pilot
uses that already-public parent selection and preflight, then applies a disclosed
preflight-informed quota:

- four fixed strata: JavaScript/TypeScript by short/long issue;
- two calibration and four evaluation tasks per stratum;
- at most one task per repository;
- 24 assigned tasks and 24 distinct repositories;
- Qwen 2.5 Coder 3B through a pinned local Ollama digest;
- Claude Sonnet through Claude Code 2.1.219;
- Microsoft's pinned SWE-bench-Live evaluator as the only completion authority.

This is a bounded secondary study. It does not inherit the primary capstone's
preregistration or statistical power.

## Evaluation results

| Route or policy | Official passes | Verified rate | Comparison USD | Actual subscription cash |
|---|---:|---:|---:|---|
| Qwen 3B direct | 1/16 | 6.25% | $0.013633 derived local equivalent | $0 observed provider cash; full local economics incomplete |
| Claude direct | 2/16 | 12.50% | $4.794071 provider-reported equivalent | Unknown |
| Sealed Qwen-first controller | 3/16 | 18.75% | $4.733624 mixed comparison amount | Unknown |

The controller runs Qwen first and visits Claude only after an official Qwen
failure. Qwen passed `TanStack/router-4611`; Claude passed
`MetaMask/metamask-mobile-17294` and `denoland/std-6775`. Those successes are
disjoint, so the controller verified all three.

Against direct Claude, the paired point estimates are:

- verified-rate difference: +6.25 percentage points;
- comparison-cost reduction: 1.2609%;
- exploratory 95% stratified bootstrap interval for quality difference:
  0 to +18.75 percentage points;
- exploratory 95% stratified bootstrap interval for comparison-cost reduction:
  -0.3871% to +4.8232%.

The cost interval crosses zero. More importantly, the direct-Claude baseline is
too weak to support a quality-preservation or economic-generalization claim.
The intervals are descriptive, not a population noninferiority test.

## What failed

Both model routes produced ten evaluator-ready patches and six unusable outputs.
The unusable Qwen outputs comprised four invalid `files` JSON responses and two
paths outside deterministic retrieval. Claude also produced six unusable
outputs. Of the remaining parse-valid patches, hidden repository verification
rejected most.

Calibration had already warned about this: Qwen passed 0/8 and Claude passed
1/8. The sealed router therefore selected Qwen-first for every evaluation task
as either `best-available` or minimally quality-eligible under conservative,
small-sample estimates. It did not learn a discriminating per-task route.

The next technical problem is not "find a cheaper model." It is to improve and
measure the operation substrate that determines whether any model can work:

1. retrieval that supplies sufficient task-relevant code without leaking hidden
   evaluation data;
2. an edit protocol that does not require fragile full-file JSON for large
   repositories;
3. stronger and more diverse baseline routes;
4. calibration large enough to reject uniformly poor routes before evaluation;
5. complete local, provider, setup, tool, and bounded-human cost lenses.

## What the pilot proves

- A public-random parent selection and signed gold preflight can feed a disclosed
  secondary assignment without replacing tasks after outcomes are visible.
- A calibration-derived route ledger can be signed and published before
  untouched evaluation calls.
- Requested model identity, deterministic context, raw output, parse status,
  comparison amount, and official external verdict can be joined by digest.
- Passed, failed, setup-unknown, and evaluator-unknown states remain distinct.
- A low-quality frontier baseline is exposed rather than used to manufacture a
  savings headline.

It does not prove production reliability, universal savings, best-in-class
routing, actual subscription savings, or population noninferiority.

## Reproduce and inspect

```text
node scripts/public-holdout-pilot.js verify
node scripts/test-public-holdout-pilot.js
```

Primary artifact identities:

- freeze: `sha256:cfe2d091ccd01effd8cacc443986e649a9db442a828fbe20946673a9eff173c8`
- assignment: `sha256:c5fa3f2a08617b1347fa402964fb91ae422036333a92fc1f551da073e3eb765e`
- route ledger: `sha256:6839fbc159f099ac0e3c13004dc9718d4d3e1dfac60a44f61eaa12e7f00ea257`
- Qwen evaluation verdict bundle: `sha256:c994d247440f570aa40499ceb4f158bcadf507cb891aaa58c8e3e6674661fbe5`
- Claude evaluation verdict bundle: `sha256:180775ce15489b64197ea34b03023936129a80fc82b351360dc9a43f5508bc8d`
- final analysis: `sha256:90db4827e2a96ffe81a95f09e05f2380af53d2eef49bf4720049534388b52c6d`

Official evaluator runs:

- Qwen: `https://github.com/SethGammon/Citadel/actions/runs/30849205321`
- Claude: `https://github.com/SethGammon/Citadel/actions/runs/30849205979`

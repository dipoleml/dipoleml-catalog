# Public holdout fast pilot - validation report

## Overall assessment: share with caveats

The artifact chain, assignment grain, official verdict coverage, and headline
arithmetic are internally consistent and ready to share. The study needs a
prominent baseline-validity caveat. It is not ready to support a generalized
quality-preserving optimization or savings claim.

## Question and sources

Question: on a small outside-authored repository sample, did the sealed Citadel
route preserve observed verified quality and reduce comparison cost relative to
direct Claude?

Sources observed 2026-08-03 UTC:

- signed pilot freeze and assignment;
- 24 visible task records;
- 16 signed routes and eight calibration records;
- 32 signed evaluation attempts;
- two 16-record official evaluator verdict bundles;
- final content-addressed analysis;
- GitHub evaluator runs `30849205321` and `30849205979`.

## Data-quality checks

| Check | Result |
|---|---|
| Assigned task IDs | 24/24 distinct |
| Repository uniqueness | 24/24 distinct |
| Calibration/evaluation overlap | 0 tasks |
| Calibration quota | 2 tasks in each of 4 strata |
| Evaluation quota | 4 tasks in each of 4 strata |
| Visible task coverage | 24/24 assigned IDs |
| Evaluation attempts | 32 distinct attempt IDs |
| Official verdict coverage | 32/32 attempts |
| Evaluator unknowns | 0 |
| Signed artifact verification | Passed |

The sample is complete for the frozen secondary method. It is preflight-informed
and not a random sample of all repositories or coding-agent work.

## Independent calculation spot-checks

Calculations were recomputed from the per-plan attempts and official verdicts,
without reading `final-analysis.json` as an input.

| Metric | Recomputed | Frozen analysis | Status |
|---|---:|---:|---|
| Direct-Claude passes | 2/16 | 2/16 | Verified |
| Qwen-direct passes | 1/16 | 1/16 | Verified |
| Qwen-first controller passes | 3/16 | 3/16 | Verified |
| Paired quality difference | +0.0625 | +0.0625 | Verified |
| Direct-Claude comparison cost | $4.794071 | $4.794071 | Verified |
| Controller comparison cost | $4.733623979 | $4.733623979 | Verified |
| Comparison-cost reduction | 0.012608704 | 0.012608704 | Verified |

The controller total equals all sixteen local comparison amounts plus Claude's
comparison amount for the fifteen tasks where Qwen did not officially pass.
Actual subscription cash is not derivable from these values and remains unknown.

## Material issues

1. **High - baseline validity.** Direct Claude passed 12.5% overall and 0% in
   three of four strata. A controller that matches or exceeds this result has
   not demonstrated useful quality preservation.
2. **High - external validity.** Sixteen evaluation tasks are enough for a
   transparent diagnostic, not a population claim. The bootstrap is exploratory
   and the cost interval crosses zero.
3. **High - protocol bottleneck.** Each plan produced six unusable outputs, and
   hidden verification rejected most parse-valid patches. Retrieval and edit
   representation are plausible shared bottlenecks.
4. **Medium - secondary selection.** Eligibility used the already-signed gold
   preflight after the primary 20/60 assignment failed. This is disclosed and
   valid for the secondary question, but it does not preserve the primary
   preregistration.
5. **Medium - cost scope.** Claude values are provider-reported comparison USD;
   local values are derived equivalents. Subscription allocation, full-system
   energy, setup, and human cost are not complete.

## Required public caveats

- Describe the frozen method's `overall_preliminary_signal: true` as an
  in-sample rule outcome, not a grant-quality optimization success.
- State the 2/16 direct-Claude and 3/16 controller verified counts next to any
  cost comparison.
- Do not call 1.26% lower comparison cost a bill saving or an end-to-end saving.
- Preserve the primary capstone's terminal `setup-unknown` result separately.
- Treat the pilot as evidence that the control and falsification substrate works
  and that retrieval/output/baseline quality is the next funded bottleneck.

## Validation judgment

The evidence package is ready to share after the application, site, and PDF are
revised to include the negative baseline finding. Any version that presents this
pilot as proof of generalized economic optimization needs revision.

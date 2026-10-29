# Canonical milestone plan and budget

Proposed public-goods grant: **$150,000 over nine months**. This is the only
budget table application materials may reproduce. The amount, applicant
availability, and legal recipient remain unconfirmed until Seth approves the
final application.

## Cost basis

| Cost basis | Quantity | Amount |
|---|---:|---:|
| Maintainer engineering, research, product, documentation, and release labor | 9 months x $11,000/month | $99,000 |
| Evaluation compute, provider inference, paid tools, and controller calibration | Not-to-exceed pool for up to 900 primary operation cells plus bounded calibration; grant-supplied credits offset cash draw dollar-for-dollar | $27,000 |
| Hosted verification and evidence retention | Up to $250/month for 21 months plus a $1,750 ceiling for storage, egress, monitoring, and domain costs | $7,000 |
| Open-model reference hardware and measurement | One consumer reference workstation up to $6,500 plus power and measurement equipment up to $500 | $7,000 |
| Compatibility and accessibility direct costs | OS/device test services, compatibility fixtures, and accessibility tooling; labor remains in the maintainer line | $2,000 |
| Bounded contingency | Maximum 5.33%; unused funds remain unspent or are reallocated only with funder approval | $8,000 |
| **Total** |  | **$150,000** |

The labor rate is $132,000 annualized, approximately the
[U.S. Bureau of Labor Statistics May 2024 median annual wage of $133,080 for
software developers](https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm).
It is compensation for one full-time maintainer and includes documentation,
accessibility implementation, project management, and release work; those tasks
are not charged again as separate labor.

The compute ceiling is a capacity model, not a promise to spend the maximum.
The primary evaluation can cover up to 60 unique operations x five policies x
three compatible stack contexts, or 900 operation cells. Within the $27,000
ceiling, no more than $18,000 may fund frontier/provider and paid-tool calls;
the remaining $9,000 covers open-model cloud execution, controller calibration,
and bounded failure reruns. Repetitions estimate variance and never become new
independent task successes. Sentient or other grant-supplied compute credits
reduce the applicable cash draw dollar-for-dollar. All direct costs are
invoice-backed and published in aggregate with the final unused-funds account.

No outside reviewer, contractor, recruited operator cohort, or honoraria pool is
promised. If the funder later requires an independent audit or recruits a
community evaluation cohort, that scope requires a written budget amendment; it
will not be silently taken from benchmark compute.

## Milestones, dependencies, and acceptance gates

| Milestone | Months | Depends on | Public acceptance gate | Allocation |
|---|---:|---|---|---:|
| 1. Operation substrate, workload, and economic closure | 1-2 | Current signed calibration and public-holdout artifacts | Replace the failed full-file JSON boundary with a patch/edit contract; prove deterministic retrieval and gold/reference edit reconstruction; define at least 60 unique artifact-producing operations across five strata; repeat trials are not independent tasks; cost components are measured or explicitly unknown | $30,000 |
| 2. Adapter and conformance SDK | 2-4 | M1 operation schema and task contract | ROMA plus two additional open stacks satisfy one versioned contract for requested/observed identity, tools, artifacts, attempts, model-external verdicts, failure preservation, and cost lenses | $28,000 |
| 3. Expected verified-operation controller | 4-6 | M1 data and M2 adapters | Held-out routing decisions are reproducible; the controller prices likely verification, escalation, and recovery; zero adversarial false passes | $35,000 |
| 4. Multi-stack prospective evaluation | 6-8 | M1-M3 frozen release candidate | Always frontier first clears the baseline-validity floor: at least 80% verified overall and 70% in every preregistered task stratum. Citadel then must reach at least 80% absolute verified completion, at least 95% of that valid frontier rate, and at least 30% lower measured end-to-end cost, with cluster-aware uncertainty; every negative and unknown cell is published | $32,000 |
| 5. Public proof, beginner path, and maintenance release | 8-9 | M4 terminal result | One command reconstructs reports from signed raw evidence; clean hosted verification passes; `/do` onboarding, adapter docs, governance, compatibility, and accessibility gates pass across clean Windows, macOS, and Linux environments; evidence retention and the maintenance window are live | $25,000 |
| **Total** |  |  |  | **$150,000** |

### Cost-to-milestone crosswalk

This matrix is the reconciliation between direct cost categories and milestone
envelopes. Row and column totals must both remain equal to the canonical request.

| Cost basis | M1 | M2 | M3 | M4 | M5 | Total |
|---|---:|---:|---:|---:|---:|---:|
| Maintainer labor | $18,000 | $20,000 | $24,000 | $18,000 | $19,000 | $99,000 |
| Evaluation compute and tools | $6,000 | $3,000 | $7,000 | $10,000 | $1,000 | $27,000 |
| Hosted verification and retention | $1,000 | $1,000 | $1,000 | $1,000 | $3,000 | $7,000 |
| Reference hardware and measurement | $5,000 | $1,000 | $1,000 | $0 | $0 | $7,000 |
| Compatibility and accessibility direct costs | $0 | $1,000 | $0 | $0 | $1,000 | $2,000 |
| Bounded contingency | $0 | $2,000 | $2,000 | $3,000 | $1,000 | $8,000 |
| **Milestone total** | **$30,000** | **$28,000** | **$35,000** | **$32,000** | **$25,000** | **$150,000** |

Milestone allocations are scheduling envelopes, not a second budget. A category
may draw less than its ceiling; an unused amount does not automatically move to
another row or milestone.

## Tranches and go/no-go rules

1. **Tranche A — $45,000:** M1 plus the initial M2 schema. Continue only if the
   retrieval/edit contract, representative workload, baseline matrix,
   measurement boundary, and adapter contract are frozen and publicly
   reconstructable.
2. **Tranche B — $60,000:** remaining M2 and M3. Continue only if at least three
   stacks can emit conformant receipts and the controller can be evaluated
   without changing the stacks' native planning logic.
3. **Tranche C — $45,000:** M4 and M5. Release the final tranche after the
   evaluation candidate, task split, statistical plan, and gates are frozen.

If a go/no-go rule fails, the terminal deliverable is the public negative
result, failure analysis, reusable data/contracts, and unused-funds accounting.

## One baseline matrix

Every applicable unique task is evaluated against:

1. **Always frontier** — primary quality and economic comparator.
2. **Stack-native default** — adoption-cost diagnostic.
3. **Prompt-only strong/weak router** — routing diagnostic.
4. **Strongest applicable open/local profile** — accessibility diagnostic.
5. **Citadel adaptive** — treatment policy.

The primary pass condition is fixed. First, always frontier must verify at least
80% of unique operations overall and at least 70% in every preregistered task
stratum. If it does not, the benchmark is baseline-invalid and diagnostic; task
or verifier repair creates a new benchmark identity. Against a valid frontier
baseline, Citadel adaptive must verify at least 80% of operations overall,
retain at least 95% of frontier's verified-operation rate, and use at least 30%
less measured end-to-end cost. Diagnostic baselines are reported even when they
do not govern the primary gate. In particular, paired prompt-only differences
are reported but are not a pass condition.

## Statistical contract

- Minimum 60 unique tasks; repetitions estimate runtime variance and are never
  presented as independent task successes.
- Stratify by repository, task family, agent stack, model family, and hardware.
- Report task-level completion, paired cost deltas, medians, distributions, and
  cluster-bootstrap confidence intervals grouped by unique task/repository.
- Precommit missing-data, timeout, setup-failure, and outlier sensitivity rules.
- Treat an always-frontier result below 80% overall or below 70% in any frozen
  task stratum as a baseline-invalid diagnostic, never as an easier denominator.
- Zero false passes, signature failures, chain failures, or identity
  substitutions are required.
- Any post-result task, verifier, metric, or threshold change creates a new
  benchmark identity and preserves the prior result.
- Beginner-path evidence comes from clean, reproducible install environments and
  release fixtures. Stars, forks, clones, page views, voluntary feedback, or
  other interest signals never alter or govern the optimizer performance gate.

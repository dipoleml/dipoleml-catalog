# Citadel Optimizer

Citadel Optimizer is an outcome-aware economic controller for multi-step agent
work. Its job is not to make another agent UI or to choose a model from a
prompt. Its job is to choose and revise the execution path that is most likely
to complete the whole operation at the lowest total cost.

The hypothesis is:

> Across competing agent stacks, an adaptive controller can reduce
> end-to-end cost by at least 30%, reach at least 80% absolute verified
> completion, and retain at least 95% of a valid always-frontier policy.

Always frontier is valid only if it verifies at least 80% overall and 70% in
every preregistered task stratum. That is a target, not a current result.

## What the controller owns

For each operation, the controller:

1. infers the capabilities the task appears to require;
2. performs bounded, read-only repository reconnaissance;
3. chooses an executor profile, capability tier, topology, and agent count;
4. records whether its prediction came from training evidence or a policy
   assumption;
5. continues, escalates, splits, or stops based on progress and verification;
6. records total cost with provenance;
7. learns capability profiles from training outcomes while excluding holdouts.

The existing Citadel verifier, receipts, worktree isolation, and recovery
machinery provide ground truth. They are not the optimizer. They prevent the
optimizer from claiming savings by silently accepting incomplete work,
substituting a different model, or dropping failed attempts from the bill.

## Policies

The public benchmark compares:

- `always-frontier`: strongest frozen tier for every task;
- `always-cheap`: cheapest frozen tier for every task;
- `prompt-only`: economic selection from task text only;
- `adaptive`: bounded repository probe, economic selection, and trajectory
  escalation.

Prompt-only routing is not presented as novel. Not Diamond documents
query-level quality/cost routing, and SWE-Router explores a cheap model before
deciding whether to escalate. Citadel's narrower proposed contribution is
whole-operation control across models, agents, topology, tools, retries, and
verified outcomes with explicit end-to-end cost provenance.

Sources:

- [Not Diamond: What is Model Routing?](https://docs.notdiamond.ai/docs/what-is-model-routing)
- [SWE-Router: Routing in Multi-turn Agentic Software Engineering Tasks](https://arxiv.org/abs/2607.00053)

## Cost truth

Optimizer cost is never a bare number. It is one of:

- `vendor_reported`;
- `price_derived`, bound to a pricing-snapshot digest;
- `tool_reported`;
- `unknown`.

Known cost can contain model, tool, compute, and human components. Unknown cost
has no amount and blocks the economic gate. Failed attempts remain in total
cost. This deliberately differs from the older product benchmark's directional
`estimated_cost` field.

The current Codex pricing snapshot uses official OpenAI API list prices as a
normalization basis, not as a claim about the user's invoice or subscription
marginal cost. It binds both the ordinary and over-272K-token price rules.
Claude's machine-readable `total_cost_usd` remains vendor-reported. The
completed calibration shows that both sources are observable; comparability and
economic benefit still require the frozen benchmark.

The current calibration access basis is `subscription`. Its authorization
contract caps execution at 4 CLI runs and 160 aggregate model-runtime timeout
minutes. It does not ask the user for a dollar ceiling.

## Current implementation

Implemented:

- strict scenario, executor, probe, decision, run, freeze, and cost contracts;
- deterministic capability inference and economic routing;
- bounded read-only repository probing;
- explicit escalation and stopping actions;
- training-only capability-profile learning;
- an actual-run adapter protocol and signed run format;
- a self-contained Claude/Codex adapter bound by source digest;
- exact public model IDs and canonical Operation Fork profile digests;
- a digest-bound official-list-price normalization for Codex token telemetry;
- a completed, digest-bound 4-run non-holdout calibration record;
- an archived calibration scenario set plus a digest-bound no-model forensic
  record explaining why its task verifiers failed;
- bounded, path- and secret-redacted verifier and patch receipts on every future actual-run
  verification attempt;
- proof bundles that independently validate completed calibration and pilot
  records, both forensic records, and all three frozen scenario sets;
- a completed two-run frontier diagnostic capped at 80 aggregate
  model-runtime timeout minutes, with its raw false negative preserved and a
  zero-call artifact-gate replay explicitly excluded from performance claims;
- a separate 120-run benchmark matrix;
- fixture-only adversarial and anti-gaming tests;
- a submission gate that refuses missing calibration, unattested runs,
  unknown cost, and missing external selection.

Not yet proven:

- any real cost reduction;
- parity with frontier verified completion;
- externally reproduced results;
- usefulness outside the three frozen repositories.

Run `node scripts/optimizer-benchmark.js doctor` for the current machine and
freeze blockers.

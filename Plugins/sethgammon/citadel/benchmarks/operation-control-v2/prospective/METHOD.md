# Operation Control v2 prospective integration pilot

Status: frozen before execution

## Question

Can the packaged v2 controller invoke one declared real coding runtime against a
pinned real repository task, reconcile the observed model and topology, run the
independent repository verifier, preserve unknown economic lenses, and produce
a digest-verifiable report without using the adapter's self-report as success?

This is an end-to-end integration pilot. One cell cannot establish performance,
savings, or superiority.

## Frozen cell

- Source: `https://github.com/SethGammon/Citadel.git`
- Revision: `4a02265c206d992b556fc1b38c3c9487ced880d8`
- Runtime: Codex CLI through `citadel-operation-adapter-v1`
- Requested model: `gpt-5.6-sol`
- Topology: one direct attempt; no fallback
- Planned tools: `filesystem`, `shell`
- Required observed tool calls: none
- Independent verifier: `node scripts/test-executor-profiles.js`
- Required changed artifact: `scripts/test-executor-profiles.js`
- Adapter timeout: 30 minutes
- Verifier timeout: 10 minutes
- Actual-cash, marginal, and market-equivalent budgets: unset
- Unknown-cost policy: allow

The objective and pinned scenario are in `scenario.json`. The execution
workspace must begin clean at the pinned revision. The adapter may edit the
workspace but may not commit, push, publish, deploy, or contact unrelated
external systems.

## Gates

An integration pass requires all of the following:

1. the adapter process completes;
2. requested and observed model match;
3. requested and observed topology match;
4. no unplanned or disallowed tool is observed;
5. the independent verifier exits zero;
6. the required test artifact is observed as changed;
7. the report digest verifies offline;
8. missing cash or price evidence remains `unknown`.

Any missing model/topology observation is `unknown`. Any control mismatch or
failed verifier is a failure. The result is published regardless of outcome.

## Attempt handling

An infrastructure failure before a model starts may be repaired without
changing the frozen cell. Each attempt is retained as a separate report. A
repair may change only the local executable binding; runtime, model, objective,
source revision, tools, verifier, required artifact, limits, and claim boundary
remain frozen.

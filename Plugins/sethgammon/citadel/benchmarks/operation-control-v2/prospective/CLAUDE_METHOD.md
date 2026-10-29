# Operation Control v2 Claude prospective integration pilot

Status: frozen before execution

## Question

Can the packaged v2 controller complete the same pinned real-repository task
through a subscription-authenticated Claude Code adapter while enforcing a
bounded tool surface, observing the requested model/topology, requiring an
actual artifact change, running an independent verifier, and preserving honest
economic semantics?

This is one integration cell. It cannot establish performance, savings, or
superiority.

## Frozen cell

- Source: `https://github.com/SethGammon/Citadel.git`
- Revision: `4a02265c206d992b556fc1b38c3c9487ced880d8`
- Objective: the exact objective in `scenario.json`
- Runtime: Claude Code CLI through `citadel-operation-adapter-v1`
- Requested model: `claude-opus-5`
- Topology: one direct attempt; no fallback
- Planned tools: `filesystem`, `shell`
- Claude tool allowlist: `Read`, `Edit`, `Write`, `Glob`, `Grep`, restricted
  `node`, `npm`, `npx`, and read-only git inspection commands
- Required observed tool calls: none because aggregate Claude JSON does not
  expose call identity
- Independent verifier: `node scripts/test-executor-profiles.js`
- Required changed artifact: `scripts/test-executor-profiles.js`
- Adapter timeout: 30 minutes
- Verifier timeout: 10 minutes
- Actual-cash, marginal, and market-equivalent budgets: unset
- Unknown-cost policy: allow

## Gates

An integration pass requires adapter completion, exact model and topology
reconciliation, no observed control mismatch, a zero verifier exit, observed
coverage of the required changed artifact, an offline-verifiable report digest,
and no conversion of missing cash evidence into zero.

The result is published regardless of outcome. Infrastructure-only repairs may
change the local executable binding, but not the frozen task or gates.

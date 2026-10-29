# Tracker touchpoint after a confirmed merge (gated reference)

> Read from [workflow.md](../workflow.md) § After confirmed merge unless `flowctl sync active --json`
> reads `active: false`.

For each matching spec, run the tracker touchpoint if the bridge is active
and current restrictions permit it; `tracker.perEvent.land.merged` does not
gate the terminal status. Use the existing `flowctl_tracker` API in memory
with `python -B` to prevent bytecode writes:
use the head-read spec and bridge config, durable-check with `wire.parent_read`,
normalize with `status.policy.flow_to_normalized` using this exact PR's
confirmed merge evidence, and use `status.policy.decide`. Apply an allowed
transition with `status.providers.apply_status` and
`resolve_verb.bound_executor(config, executor.execute)`. Preserve configured
status IDs, terminal-state policy and completion-review gating. Do not use
`tracker sync` or `tracker status`: they write local claims and receipts.
Read helper signatures from the bundled scripts; do not reconstruct provider
requests. Keep inputs/results in memory, including `evidence=<merge-commit-sha>`;
no local fold, timestamp write, or comment is needed for the terminal touchpoint.

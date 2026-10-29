# Feature-map update: prove and write (gated reference)

> Read from [feature-map-update.md](feature-map-update.md) §1 only when an altered route ties to a
> feature file.

## 2. Prove each new route once

Evidence goes under `.flow/tmp/work-features-<spec-id>/`, referenced by path.

1. Start the app as `.flow/features/README.md` states (baseline preconditions,
   an isolated port and profile this run owns). Read
   [doctor-and-proof.md](../../flow-next-features/references/doctor-and-proof.md)
   and run Doctor before the first drive.
2. Drive each altered route once: UI surfaces by the
   [drive skill](../../flow-next-drive/SKILL.md) universal flow, `cli` surfaces
   by running the command directly and capturing stdout, stderr and exit code.
   Capture the user action and the resulting state.
3. Tear down what this run started. Keep the evidence.

**The app cannot be started, or no driver is usable:** leave the map unchanged.
For each altered route, file a drift note (the contract's identity, Expected:
the mapped route, Observed: `not driven (<reason>); the change moved it to
<new route>`) so the next maintain pass picks it up. The work run is not
blocked by this.

A route that fails to prove is not written; file the drift note the same way.

## 3. Write the proven edits

For each proven route, edit only that feature file: the sections the change
altered (`Sub-features`, `How to get to it (user POV)`, `Driving it`,
`Gotchas`), keeping the four-H2 and `**Surface:**` contract, and refresh its
`**Last proven:** <UTC date> at <git rev-parse --short HEAD>` line. Update the
index row in `.flow/features/README.md` when sub-feature IDs changed. A feature
the change removed outright is a source-confirmed deletion: drop its file and
index row and record the removed surface in the summary.

Then retire every open drift note that names a route this step proved
(`$FLOWCTL features status --json` lists `open_drift` ids and titles):
`$FLOWCTL memory mark-stale <entry-id> --reason "route re-proven <date> at <short commit>" --json`.
Memory disabled: drift notes are neither filed nor retired; record the expected
changes in the run notes and the final summary instead.

The edits (and any memory files the drift steps touched) ride the Phase 5
commit with the rest of the change. Note one line for the Phase 5 final
summary: `Feature map: <n> file(s) updated, <m> drift note(s) filed, <k> retired`.

Done when: every altered route is either proven and written with a fresh
last-proven line, or recorded as a drift note with the map left unchanged; no
unaltered feature file was edited; nothing undriven entered the map.

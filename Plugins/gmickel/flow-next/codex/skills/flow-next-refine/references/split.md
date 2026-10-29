# Refine — split proposal

Read before the write-back when the refined criteria reach 8 or more, or visibly serve more than one independently shippable outcome.

Apply [spec-count.md](../../flow-next-flow/references/spec-count.md): it owns what counts and the independence partition. Propose a split only when its partition yields more than one spec; a large but cohesive set is one spec, and the summary says so.

When it does, print the allocation as ordinary markdown (per-spec titles, allocated criteria, dependency edges) and fold the choice into the read-back question rather than asking separately: a one-line note naming the proposal, and `split as proposed` as an extra option beside `approve and write` (which keeps one spec). A free-text answer adjusts the allocation.

On `split-as-proposed`:

- Create each new spec with one `$FLOWCTL spec create --title "<title>" --plan-file <literal path> --json` call. Its body is self-contained, and its allocated criteria are renumbered from R1 in the new spec.
- Remove the moved criteria from the source spec's write-back.
- Record the edges with `$FLOWCTL spec add-dep <spec-id> <depends-on-id> --json`.

Criteria a review has already judged are never moved or renumbered: keep them in place and record the proposal in `## Decision Context` instead. An unattended or receipt-driven run never splits; it records the proposal in `## Decision Context` as `### Split proposal (unactioned)`.

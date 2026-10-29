# Representative operation pilot v1: aborted before an aggregate

Freeze: `sha256:af6a158d6598e2fbb77931aa6fd3b89d6727b862736cd75a6540405d038942c9`

The first scheduled cell executed two model attempts and was written with its
intent and signed receipt. Immediate offline replay then rejected the cell
because failed-verifier stderr contained the random isolated-workspace path.
The task verdict was stable, but byte comparison was not:

```text
recorded: ...citadel-representative-refactor-dedupe-types-qT5Dd2...
replayed: ...citadel-representative-refactor-dedupe-types-EJa68T...
```

No aggregate bundle or performance result was produced. The run was not
continued or selectively retried. The partial cell and intent remain in
`published-run/` as failure evidence.

A new benchmark identity is required. V2 must normalize only the ephemeral
workspace root before signing and comparing bounded verifier output; task,
model, routing, fixture, verifier, economic, and gate contracts remain frozen
again before execution.

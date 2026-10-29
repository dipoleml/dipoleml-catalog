# Multi-repo spec base (gated reference)

> Read from phases.md when the spec changes code in git repos beside this one (Phase 2), and
> when `.flow/tmp/spec_base_repos` exists (Phase 4).

## Phase 2

When the spec changes code in git repos beside this one (a home-base workspace; the project instructions or the spec name them), record each repo's merge-base with its own base branch the same way, one `<repo path> <sha>` line per repo in `.flow/tmp/spec_base_repos` (the fence clears it, so a previous run's repos never carry over; a resumed run records its repos again); a repo first touched later gets its line before its first edit.

## Phase 4

With `.flow/tmp/spec_base_repos`, also run classify inside each listed repo against its recorded sha: tier-B needs exit 0 in every repo, and a repo that exits nonzero (including a missing path or unresolvable base) runs its full gates. Name each listed repo and its sha in the auditor dispatches ([quality-auditor.md](quality-auditor.md)).


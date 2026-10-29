# Stacked PRs (gated reference)

> Read from [workflow.md](../workflow.md) § Merge one layer only when open children target this PR's
> head branch or it belongs to a native stack.

## Before merging

With open children, link the chain bottom-to-top using
`POST /repos/{owner}/{repo}/stacks` with `pull_requests` before merging.
Reuse an existing stack; read it again immediately before submitting.
Only the lowest open layer may merge: a higher layer stops `BLOCKED` naming
the lowest PR. Merge one layer per run; never merge a parent implicitly.
If stacks are unavailable, keep child-targeted branches on the ordinary path.
After the parent merges, inspect its children: a conflicted child is reported
as needing a rebase and land stops, retaining the confirmed parent merge.
A plain child still based on its parent needs a manual rebase onto the intended
base before its own landing; land never retargets it or resolves its conflicts.
Other stack errors stop `NEEDS_HUMAN`, not a silent fallback.

## Merge call

Native stacks use `PUT /repos/{owner}/{repo}/pulls/{number}/merge-async` with
`merge_method=squash`, `merge_action=direct_merge`, and `sha=<full-head-sha>`;
never the ordinary merge call, auto-merge, or merge-queue enrollment.
Observe its returned status/UUID in memory; pending is `RESOLVING`, not success.

## After the merge

On a native stack, after confirming the merge, freshly verify no open PR has
the merged branch as base before deleting its remote ref with a separate
`DELETE /repos/{owner}/{repo}/git/refs/heads/{branch}` call (encode the ref).
If children still target it, or the read fails, keep the branch and report it.
A deletion failure leaves the merge confirmed; include it in the reason.

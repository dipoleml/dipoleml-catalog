# Feature-map update (gated reference)

> **Loaded only when `.flow/features/` exists**, at phases.md Phase 4 (Quality),
> after all tasks complete. A repo without a map never reads this file and the
> existence check is the whole cost.

The feature map records how a user reaches each feature. When this spec's change
alters one of those routes, the map is updated in the same change, so the PR
shows the map diff beside the code diff. Shape of a feature file and the drift
note contract: [feature-entry-contract.md](../../flow-next-features/references/feature-entry-contract.md).

This step is the only map writer besides `/flow-next:features`. It edits only
the entries this change altered; the full maintain pass stays user-invoked and
this step never dispatches it. It asks nothing, so it follows work's own
autonomy rules unchanged (attended and `mode:autonomous` runs alike).

## 1. Find the altered routes

Compare the spec's diff (`$(cat .flow/tmp/spec_base)..HEAD`, plus the diff of
each repo listed in `.flow/tmp/spec_base_repos` from its recorded sha, plus the
task done summaries, which name routes a task changed) with the map's feature files.
A route is altered when a user now reaches or drives a mapped feature
differently: a renamed control or label, a moved page or URL, a new entry point,
a removed sub-feature, or a changed CLI invocation. Code changes that leave
every mapped route as a user sees it are not map changes.

- No altered route: the map is untouched. Note `Feature map: unchanged` for the
  Phase 5 final summary and stop here.
- A changed user-facing surface that you cannot tie to one feature file: do not
  guess an edit. File a drift note naming the changed surface (title
  `drift: <surface>/<changed-surface-slug> unmapped`, Expected: the old route
  if known, Observed: what the change did) and leave the map alone.
- A user-facing feature the map has never covered is not an altered route. The
  next maintain pass finds it; this step adds no new feature file.
- An altered route you can tie to a feature file: read
  [feature-map-prove.md](feature-map-prove.md) and run its prove and write steps for each such route.

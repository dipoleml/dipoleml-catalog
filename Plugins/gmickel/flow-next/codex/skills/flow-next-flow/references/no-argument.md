# No argument: what to route

Read only when flow was invoked with nothing to route. Resolve the item from the most recent
thing flow can see, first match wins, then route it as if its id had been given:

1. The item this conversation last touched: the spec capture wrote, the task work closed, the PR
   make-pr opened. Capture's `Recommended next:` line names the step.
2. The spec whose `branch_name` matches the current branch.
3. Intent in the conversation that no spec captures yet. Ask whether to capture it into 1..n
   specs; a "yes" routes to `$flow-next-capture from:flow`, a "no" continues down the
   ladder.
4. The next open spec in `.flow`, by your judgement of readiness and order; `$FLOWCTL next` and
   the `ready` flag are hints. A candidate with dependencies is admitted only when
   `$FLOWCTL spec chain <id> --json` reports `eligible: true` (every dependency done, or one open
   chain parent with all tasks done and its branch on origin; work then branches from that
   parent's tip). Skip an `eligible: false` candidate with the command's `reason`. Several
   equally plausible candidates are an inline pick, never a guess.
5. Ask once what to work on.

Also run `$FLOWCTL features status --json` once (in a home-base workspace, add `--repo <path>`
for each sibling repo the project instructions name). When its `recommendation` is `maintain`,
print `Also recommended: /flow-next:features - feature map due a maintain pass (<reasons>)` after
the report's `Next:` line. Flow recommends it and never dispatches it.

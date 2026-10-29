# Worker baseline reuse (gated reference)

> **Read by the worker at the Phase 1 baseline only when its prompt carries `BASELINE_HANDOFF`.**
> The handoff can then stand in for the baseline run. Without it, run the baseline as worker.md
> Phase 1 states and never read this file.

```bash
# Check git log --format= --name-only <verified-sha>..HEAD (not only the net diff).
# A handoff is valid only if every path changed since its verified SHA is under .flow/.
# Any other changed path invalidates it: run the baseline normally.
# When BASELINE_HANDOFF is present, record `baseline: green via handoff (<content>)`
# and SKIP running the focused Quick commands as baseline (lint/format always run, never
# skipped). worker.md Phase 1's red-baseline
# rules are unchanged and the handoff never applies to them (a handoff asserts
# green, so the red branch is unreachable via handoff). The wave route keeps its first-task
# baseline. The rolling first batch may reuse the conductor's green spec-base
# baseline for the SAME commands, under the same .flow/-only handoff rule.
```

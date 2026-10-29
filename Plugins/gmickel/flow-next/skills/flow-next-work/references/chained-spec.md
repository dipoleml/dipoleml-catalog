# Chained specs (gated reference)

> Read from phases.md Phase 2 only when the spec's `depends_on_epics` is non-empty or the
> branch fence prints `BLOCKED:`.

**Chain check first.** Before any branch is created or any task starts, ask flowctl whether the spec is chain-eligible; the predicate lives in one place and this skill never re-derives it. A dependent spec whose parent is open with every task done and its branch on origin is **chained**: the spec branch is created from the parent's fetched remote-tracking ref, and that ref is the base for the spec base, gate classification, and the quality auditor's diff range. Work never creates a local branch named after the parent and never deletes or resets an existing parent branch. An `eligible: false` answer (an unfinished parent, two open parents, an unpushed parent, a sibling already chained, a failed remote query) stops the run with `BLOCKED: <reason from the command>` before any task starts; the same reason parked the spec at selection under `flow --auto`.

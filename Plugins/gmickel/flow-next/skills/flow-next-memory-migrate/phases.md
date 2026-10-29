# Memory migration — `(track, category)` decision tree

For each legacy entry, classify it into exactly one `(track, category)` pair. Calibration below mirrors the deterministic baseline in `flowctl.py` (`_memory_classify_mechanical` + `_DEPRECATED_TYPE_MAP`) plus narrative guidance for when the entry's body warrants overriding the mechanical default. For the workflow phases that drive these decisions, see [workflow.md](workflow.md).

---

## Mechanical baseline (the default — applied when no body signal)

| Legacy filename | Default `(track, category)` |
|-----------------|-----------------------------|
| `pitfalls.md`   | `bug/build-errors`          |
| `conventions.md`| `knowledge/conventions`     |
| `decisions.md`  | `knowledge/tooling-decisions` |

This is what `flowctl memory list-legacy --json` emits as `mechanical_track` + `mechanical_category` on each entry. Take this default unless the entry's title + body unambiguously points at a different category.

---

## Valid track / category pairs (the schema)

The skill must only write entries with these pairs. `flowctl memory add` validates again, but pinning the valid set in the prompt avoids round-trips on rejected writes.

**Track `bug` categories:**

- `build-errors` — compile / lint / type-check / dependency-resolution failures
- `test-failures` — flaky tests, assertion mismatches, fixture issues, CI test failures
- `runtime-errors` — null dereferences, race conditions, leaks, hangs, exceptions in production code paths
- `performance` — slow queries, N+1, memory leaks, latency regressions
- `security` — auth bypass, injection, secret leakage, CSRF / XSS
- `integration` — API contract drift, schema mismatch, third-party service mishaps, wire-format issues
- `data` — corruption, partial writes, migration errors, encoding bugs
- `ui` — layout breakage, wrong colors, a11y regressions

**Track `knowledge` categories:**

- `architecture-patterns` — system design choices, structural patterns ("we model X as a state machine")
- `conventions` — naming, file layout, code style ("PascalCase for components, kebab-case for files")
- `tooling-decisions` — tool choice rationale ("use pnpm not npm because <reason>")
- `workflow` — process / branching / review patterns ("PRs are squash-merged", "feature branches off main")
- `best-practices` — generic guidance not specific to a tool or pattern ("always validate inputs at boundaries")
- `decisions` — a recorded choice whose rejected alternatives are part of the record ("nearest-ancestor lookup; always-root was rejected because <reason>")

---

## When to override the mechanical default

The mechanical default is right ~70% of the time on real corpora. Override only when the entry's title + body provides high-confidence evidence for a different category.

### Override examples (from `pitfalls.md` mechanical default `bug/build-errors`)

| Body signal | Override to |
|-------------|-------------|
| "Race condition between callback handlers" | `bug/runtime-errors` |
| "Deadlock in worker pool when N workers > M tasks" | `bug/runtime-errors` |
| "Memory leak — promises never resolved" | `bug/runtime-errors` |
| "Test flakes when run in parallel mode" | `bug/test-failures` |
| "Assertion fails when running on CI but not locally" | `bug/test-failures` |
| "API call took 30s after migration to v2" | `bug/performance` |
| "Query runs N+1 in production" | `bug/performance` |
| "Token refresh leaked client secret" | `bug/security` |
| "CSRF cookie not set on logout" | `bug/security` |
| "Stripe webhook signature mismatch" | `bug/integration` |
| "GraphQL schema drift broke client" | `bug/integration` |
| "Migration partially applied — half the rows have new column" | `bug/data` |
| "User uploads UTF-16 names; we expected UTF-8" | `bug/data` |
| "Modal traps focus when escape pressed twice" | `bug/ui` |
| "Color contrast fails WCAG AA on dark theme" | `bug/ui` |

### Override examples (from `conventions.md` mechanical default `knowledge/conventions`)

| Body signal | Override to |
|-------------|-------------|
| "We model long-running jobs as a finite state machine" | `knowledge/architecture-patterns` |
| "Every service registers via the bus on startup" | `knowledge/architecture-patterns` |
| "Use pnpm not npm — workspace hoisting matters here" | `knowledge/tooling-decisions` |
| "Switched from Jest to Vitest for ESM compat" | `knowledge/tooling-decisions` |
| "PRs are squash-merged after one approval" | `knowledge/workflow` |
| "Feature branches off main; never off other features" | `knowledge/workflow` |
| "Always validate inputs at boundaries; trust the core" | `knowledge/best-practices` |

### Override examples (from `decisions.md` mechanical default `knowledge/tooling-decisions`)

| Body signal | Override to |
|-------------|-------------|
| "Decided to model orders as event-sourced aggregates" | `knowledge/architecture-patterns` |
| "Decided that PR titles follow Conventional Commits" | `knowledge/workflow` |
| "Decided we always run lint before push" | `knowledge/workflow` |
| "Decided naming convention: PascalCase components, kebab-case files" | `knowledge/conventions` |

### When in doubt

Take the mechanical default. The post-migration report flags it as `needs-review` (autofix) or asks the user (interactive). Re-classification later via `/flow-next:audit` Replace flow is cheap; a wrong override at migration time is silently misleading.

---

## Decision tree (quick reference)

```
For each legacy entry:

  Read title + body + tags + source filename.

  Set default = (mechanical_track, mechanical_category)  # from list-legacy

  Scan body for override signals (catalog above):
    - Strong evidence for a different category?
        yes → override + log rationale
        no  → continue

  Validate (track, category) against schema:
    - In MEMORY_CATEGORIES[track]?
        yes → ready to write
        no  → fall back to mechanical default + log as needs-review

  Ambiguous (could plausibly be A or B)?
    interactive → ask via blocking-question tool
    autofix     → take mechanical default + log as needs-review

  Phase 2: flowctl memory add --track <t> --category <c> --title "..." --body-file <tmp>
```

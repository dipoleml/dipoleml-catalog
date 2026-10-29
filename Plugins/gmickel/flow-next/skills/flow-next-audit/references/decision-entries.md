# Decision-entry calibration (gated reference)

> Read from phases.md only when the audit set holds a `knowledge/decisions/` entry.

Entries under `knowledge/decisions/` document forward-looking choices: the project picked approach X, considered Y and Z, and committed to a constraint. The 6 outcomes still apply, but the per-entry judging question changes — and `Replace` means **supersede**, not rewrite-in-place.

### Per-entry judging question

For non-decision entries, Phase 1 asks "is this still relevant?". For decision entries, ask:

> **Does the constraint that motivated this decision still hold?**

The constraint is whatever made the decision hard-to-reverse, surprising-without-context, and a real trade-off when it was made. If the constraint is still in force, the decision is still active. If the constraint has dissolved (the trade-off no longer exists, the surprising context is now the obvious default, the codebase changed shape so reversal is now cheap), the decision is a candidate for supersession.

### Decision-specific frontmatter

Decision entries may carry these optional fields (see `MEMORY_DECISION_FIELDS` in `flowctl.py`):

- `decision_status`: one of `proposed`, `accepted`, `superseded` (`MEMORY_DECISION_STATUSES`)
- `superseded_by`: id of the successor entry that replaced this one
- `alternatives_considered`: list of options that were rejected when the decision was made

When auditing, treat `decision_status: superseded` as already-handled — the entry is historical record. Audit the `superseded_by` target instead. If `superseded_by` points at a missing entry, that's an Update (broken cross-reference) on this entry.

### Outcome calibration for decisions

| Outcome | Meaning for a decision entry | Action |
|---------|------------------------------|--------|
| **Keep** | Constraint still holds; rejected alternatives are still rejected for the same reasons | No edit |
| **Update** | Constraint holds; only references / `alternatives_considered` text / cross-refs drifted | Edit in place; `decision_status` unchanged |
| **Consolidate** | Two decision entries cover the same choice (rare — usually means a rushed double-write) | Merge into canonical, `git rm` subsumed |
| **Replace** | Constraint no longer holds; a different choice is now in force | **Supersede** — see flow below |
| **Delete** | The entire problem area is gone (the system that needed the decision was removed) | `git rm` (prefer Replace + supersede when problem domain still exists) |
| **Harden** | Rare — the decision states a constraint a machine can check, and it keeps being re-taught | Write the gate, verify it fires, `flowctl memory mark-hardened`; file stays on disk, supersession fields preserved |

**Harden is expected to be rare on decision entries.** Most decisions are judgment records — "we chose X over Y because of trade-off Z" — and a trade-off rationale is not a deterministic check. The calibrated judging question above ("does the constraint still hold?") stays primary; only reach for Harden when the decision's constraint is itself mechanically checkable (e.g. "all timestamps are UTC ISO-8601" rather than "we prefer a monorepo"). Because `mark-hardened` never removes the file, hardening a decision does not conflict with the supersede-not-delete rule.

### Replace = supersede

For non-decision entries, `Replace` means write a successor and `git rm` the old. For decision entries, the old entry stays — it's part of the history of why the project arrived where it is. Replace becomes a two-step supersession:

1. **Write the new decision entry** — a fresh `knowledge/decisions/<slug>-<date>.md` describing the current choice, what changed in the constraint, and why the prior decision no longer applies. Optionally include `alternatives_considered` listing both the original alternatives and the prior decision itself (now also rejected). Include `related_to: [<old-id>]` for traceability.
2. **Mark the old entry superseded** — Edit the old entry's frontmatter to set `decision_status: superseded` and `superseded_by: <new-entry-id>`. Body untouched. Do **not** `git rm` — the historical record stays on disk.

When autofix evidence is insufficient to write the successor decision (the constraint clearly dissolved but the new approach is too unstable to commit to), mark the old entry stale via `flowctl memory mark-stale` instead of half-shipping a supersession. The user (or a follow-up audit) can revisit when the new approach has settled.

### Edge cases

- A decision whose `decision_status` is `proposed` but never reached `accepted` (the project never committed) → if no code reflects the proposal, classify Delete; if partial implementation exists, mark stale and surface in the report.
- A decision that references a constraint visible only in external context (a contract, a partner integration, a regulatory rule) → audit cannot verify the constraint from code alone. Skip with a "cannot mechanically verify" note in the report; do not auto-Delete.
- A decision pointing at `superseded_by: <id>` where the successor itself is now superseded → walk the chain; the audit target is the head of the chain.

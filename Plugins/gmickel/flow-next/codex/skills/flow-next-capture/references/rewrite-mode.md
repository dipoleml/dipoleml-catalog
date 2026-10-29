# capture — `--rewrite <spec-id>` mode (loaded on demand)

> Loaded ONLY when `REWRITE_TARGET` is non-empty (the invocation carried `--rewrite <spec-id>`).
> A fresh capture never reads this file. Read it once at Phase 0.6 — it governs the rewrite behavior
> in Phases 0, 4, 5 and 6.

Contents:

- [0.6 — Target validation](#06--target-validation)
- [Phase 4 — rewrite read-back additions](#phase-4--rewrite-read-back-additions)
- [5.3 — Rewrite branch](#53--rewrite-branch)
- [Phase 6 — rewrite footer](#phase-6--rewrite-footer)

---

## 0.6 — Target validation

- Validate the target exists **and is a spec** (not a task — `flowctl show` accepts both, but capture only writes specs to spec IDs):

  ```bash
  out=$("$FLOWCTL" show "$REWRITE_TARGET" --json) || { echo "Error: --rewrite target $REWRITE_TARGET does not exist. Drop --rewrite to create a new spec, or pick an existing spec id." >&2; exit 2; }
  if echo "$out" | jq -e '.tasks' >/dev/null 2>&1; then
    : # spec — has .tasks array
  else
    echo "Error: --rewrite target $REWRITE_TARGET is a task, not a spec. Pass a spec id (fn-N-slug, no .M suffix)." >&2
    exit 2
  fi
  ```

- If the target is missing or is a task, exit 2 with the appropriate error message above.
- Read the existing spec. Retain the original body for the saved-spec diff. Re-read the target immediately before replacement; preserve intervening user edits, and ask only if reconciling them requires a material choice.

---

## Phase 4 — rewrite read-back additions

The saved-spec review (workflow.md §5.6a) gains a mandatory rewrite diff:

- **Print the existing → proposed diff** (unified style; changed sections in full) as ordinary markdown alongside the saved-spec summary, never only inside the editor question. `--rewrite` already authorizes replacement of this target; the diff exposes what changed, without a second generic approval.
- The short ask's one-line pointer reads `Summary + rewrite diff printed above; saved spec at <path>.`
- Summary-payload **rewrite-mode pointer** - one short clause, e.g. `Rewrite diff printed above.` (the full diff is already in the ordinary message; never paste it into the ask).
- Confidence tier `[your-call]` covers rewrite-mode with substantive divergence from the existing spec.
- **Forbidden:** never silently overwrite intervening user edits or omit the rewrite diff. Editor follow-ups open the saved spec and never restore the temporary draft over it.

Mark-ready consent on a rewrite is target-aware — see `references/mark-ready.md` when that gate fires (a rewrite offers the question only when the target itself was ready before the rewrite; an unrelated ready spec never prompts on a draft rewrite).

---

## 5.3 — Rewrite branch

When `REWRITE_TARGET` is set:

```bash
SPEC_ID="$REWRITE_TARGET"

# Skip spec create — the spec already exists. Overwrite the spec body from the
# §4.1 draft file (literal path typed verbatim, per the path-persistence rule).
"$FLOWCTL" spec set-plan "$SPEC_ID" --file "${TMPDIR:-/tmp}/flow-capture-draft-<working-title-slug>-<suffix>.md" --json

# Readiness reset — runs AFTER set-plan: a failed rewrite must not downgrade a
# blessed spec. A rewrite is a full re-authoring; any
# prior blessing no longer applies once the new body lands. Unconditional call:
# the toggle is idempotent — a never-ready spec is a silent no-op (no
# write, no updated_at bump), so this does NOT turn every rewritten draft into a
# readiness-adopter. Announce, never confirm — --rewrite already carried the
# consent.
READY_RESET=$("$FLOWCTL" spec unready "$SPEC_ID" --json | jq -r '.changed // false')

# Run anchor for Phase 6's sync check — REQUIRED on the rewrite path: created_at
# is the spec's ORIGINAL creation time here (an earlier run), so an old
# `event: capture` receipt would false-OK the check and the retro-fire would
# never fire.
date -u +%Y-%m-%dT%H:%M:%SZ > "${TMPDIR:-/tmp}/flow-capture-anchor-${SPEC_ID}"
```

When `READY_RESET=true` (the spec WAS ready), Phase 6's rewrite footer carries a one-line reset announcement. When `false`, no readiness line is printed — never announce a reset that didn't happen (zero noise for never-ready specs).

§5.4–§5.9b (branch name, tracker sync, glossary, readiness, no-plan) run exactly as on the new-spec branch.

---

## Phase 6 — rewrite footer

The close's first line becomes `Spec rewritten at .flow/specs/<SPEC_ID>.md.`, followed by `Readiness: spec rewritten — readiness reset to draft (re-bless when ready)` ONLY when §5.3's reset changed the flag (`READY_RESET=true`); never announce a reset that did not happen. `Tracker sync:` and `Recommended next:` follow workflow.md Phase 6, judged on the rewritten spec. When the spec already has tasks, add that they may need $flow-next-sync to align after a re-plan.

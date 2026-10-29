# Remediation flow (gated reference)

> Read from workflow.md only when the run is interactive or `--fix-all`, with no autonomy marker and no `--report-only`.

## Phase 5: Interactive Remediation

**Remediation is CATALOG-DRIVEN.** The questions below are NOT a fixed four - they are assembled from the [playbooks.md](../playbooks.md) ranked-actions catalog, filtered to the ACTUAL gaps found across Pillars 1-5 + the scored groups (AO / DR / TO / HP-core / FH-scored). Each option maps to a catalog row and carries that row's **tier** (Critical / High / Medium / Bonus) and **consent boundary**. Never offer a fix for a criterion that already passes; never invent an option not in the catalog.

**If `--fix-all`** - the catalog tier column + consent boundaries govern what auto-applies. `--fix-all` auto-applies ONLY **in-root, non-structural, non-harness** fixes at **Critical / High / Medium** tier - the in-root Pillars 1-5 fixes PLUS scored-group agent-file content whose catalog row is marked `--fix-all`-eligible (per the catalog's consent column; **the [playbooks.md](../playbooks.md) catalog is authoritative** on which scored-group items qualify). **Explicit-consent-only regardless of `--fix-all`:** anything outside the repo ROOT (the home-base kit), any harness settings / hook file (deny/ask/hook scaffolds), and ALL structural / playbook artifacts (a generated map, nested instruction files, the home base, the greenfield bootstrap plan). **On greenfield, `--fix-all` applies ONLY to exercised hygiene files** (`.gitignore`, lockfile, `.env.example`, `.editorconfig`) - never structural or generated artifacts (playbooks.md greenfield anti-pattern rules). When `--fix-all` is set, skip the questions, apply exactly the auto-eligible set, and continue at Phase 5.5 (the glossary bootstrap keeps its read-back gate even under `--fix-all`); Phase 6 then applies the selected fixes.

**Under any autonomy marker (`FLOW_AUTONOMOUS=1` or `mode:autonomous`), this entire phase is SKIPPED - exactly like `--report-only`.** No remediation is offered and no interactive consent is sought; the report states the gaps (and their catalog rows) so a human can settle them later. There is no autonomous person to answer, so the phase produces zero prompts and applies zero fixes.

**CRITICAL**: For consent, you MUST ask via the plain-text numbered prompt described below.

**Ask the user via plain text.** Render the options below as a numbered list `1.` … `N.`, followed by a final option `N+1. Other — type your own answer`. Print the question, then the numbered list, then **stop and wait for the user's next message before continuing**. Parse the reply as: a bare number `1`–`N+1` → that option; the literal text of an option label → that option; free text after `Other` → custom answer.

### Using plain-text numbered prompt correctly

Each question should:
- Have a clear header (max 12 chars)
- Explain what each option does and WHY it helps agents
- Allow multi-select when options are not exclusive — number the options as `1.` … `N.` and ask the user to reply with the numbers (or labels) of all that apply
- Include impact description for each option, and its catalog tier + consent boundary

### Question structure - catalog-driven

Group the gap-matched catalog items by category (Documentation, Tooling, Testing, Environment, Drivability/Observability, …) and ask **ONE question per category that has gaps** - skip any category with none. The options in each question are the catalog rows that apply to THIS repo's gaps, each labelled with its tier and (where not the default `--fix-all` in-root) its consent boundary. Explicit-consent-only items (structural artifacts, harness files, out-of-ROOT kit) are asked here even under `--fix-all`.

Illustrative shape (Tooling category - the exact options come from the catalog filtered to the repo's gaps, NOT this fixed list):

```json
{
  "questions": [{
    "question": "Which tooling improvements should I add? These give agents instant feedback instead of waiting for CI.",
    "header": "Tooling",
    "multiSelect": true,
    "options": [
      {
        "label": "Layered deterministic gates (Recommended)",
        "description": "Catalog #6 (High). Format/lint at the edit or commit layer (harness hook OR staged-files commit hook, file-scoped, <10s, auto-fix) - tests stay at the verify command + acceptance requirements + CI required check. Prime NEVER wires test suites into a pre-commit hook (known agent bypass/stall risk). Harness-hook portion is explicit-consent."
      },
      {
        "label": "File-scoped feedback commands",
        "description": "Catalog #4 (High). Single-test + single-file lint/typecheck commands so agents verify a change in seconds, not a full-suite wait. In-root, `--fix-all`."
      },
      {
        "label": "Add linter/formatter config",
        "description": "Catalog-adjacent (SV1/SV2). Only if NONE detected - never replace an existing tool. In-root, `--fix-all`."
      },
      {
        "label": "Add runtime version file",
        "description": "Catalog-adjacent (DE3). Pin the runtime from an evidenced version, never a literal. In-root, `--fix-all`."
      }
    ]
  }]
}
```

### Rules for Questions

1. **MUST ask via the plain-text numbered prompt described below**
2. **Options come from the [playbooks.md](../playbooks.md) catalog** - each labelled with its tier (Critical / High / Medium / Bonus) and consent boundary; never an option outside the catalog or the Pillars 1-5 templates
3. **Mark recommended items** - Add "(Recommended)" to high-impact (Critical/High) options; "(Bonus)" to nice-to-have (Bonus tier)
4. **Explain agent benefit** - Each description says WHY it helps agents AND names its catalog #/tier
5. **Skip empty categories** - Don't ask if no gaps in that category
6. **Max 4 options per question** - Tool limit, prioritize by catalog leverage order if more
7. **Hooks = layered gates, never test-runners** - the hook option is ALWAYS framed as fast file/staged-scoped format+lint at the edit/commit layer; prime NEVER offers a test-running pre-commit hook (SV4 / catalog #6). Tests belong at the verify command + acceptance requirements + CI. Any offered hook is built from Phase-2-verified commands, read-back gated, and exercised in the same pass (HP7 read-vs-exercise; harness.md)
8. **Never offer Pillar 6-8 items** - Production readiness is informational only
9. **Never offer informational sub-criteria (DC7, DE7)** - Surface as suggestions in Top Recommendations only; no auto-run from Phase 5
10. **Never offer DC8 (glossary) as a Phase 5 option** - Its remediation is the dedicated Phase 5.5 bootstrap with its own read-back; a Phase 5 checkbox would bypass the never-write-terms-unseen gate
11. **Structural / out-of-ROOT / harness items are explicit-consent** - even under `--fix-all`; ask before a map, nested instruction files, the home base, the bootstrap plan, or any harness settings/hook file

---

## Phase 5.5: Glossary Bootstrap (DC8)

Runs only when the Phase 3 glossary signal reported `GLOSSARY_TERMS == 0` (GLOSSARY.md absent or husk). When `GLOSSARY_TERMS > 0`, skip this phase entirely — prime never rewrites a populated glossary and never re-proposes existing terms; staleness/alias pruning belongs to `/flow-next:audit`.

**Under any autonomy marker (`FLOW_AUTONOMOUS=1` or `mode:autonomous`), this entire phase is SKIPPED - exactly like `--report-only`.** No glossary read-back is presented and no terms are written; the report notes the glossary gap (DC8) so a human can seed it later. There is no autonomous person to confirm the proposed definitions, and canonical vocabulary is never written unseen.

`--fix-all` does NOT bypass the read-back below: term definitions are judgment-bearing canonical vocabulary, not mechanical templates — never write terms unseen. (`--report-only` never reaches this phase; the workflow stops at Phase 4.)

### 5.5.1 Scan for load-bearing vocabulary

Build the candidate pool from what Phase 1 already collected plus targeted reads:

- README.md, docs/, CLAUDE.md / AGENTS.md (agents-md-scout and docs-gap-scout findings already summarize these — reuse them, don't re-read wholesale)
- Top-level module / package / directory names
- Domain nouns recurring across `.flow/specs/*.md` and source files
- Places where the SAME concept goes by two names in the repo (naming drift → `_Avoid_` candidates)

Selection bar: a term earns a slot when an agent could plausibly build around the wrong meaning — project-specific nouns, flows, and distinctions (e.g. two near-synonyms that mean different things in THIS repo). Exclude generic programming vocabulary (server, test, build) and anything without file evidence.

### 5.5.2 Propose terms

Definition prose follows the artifact prose contract in [docs/prose.md](../../../docs/flow-next/prose.md); proceed without it when the doc is absent.

Draft ~10-20 candidates (fewer is fine for small repos — never pad). Each proposal carries:

- **Term** — canonical name
- **Definition** — 1-3 sentences, concrete, written against the code (not aspirational)
- **Evidence** — at least one file ref (`path` or `path:line`) where the concept lives; a term with no evidence is dropped, not guessed
- **`_Avoid_` aliases** (optional) — only where naming drift is visible in the repo
- **`_Relates to_`** (optional) — cross-references between proposed terms

### 5.5.3 Read-back (mandatory — never write unseen)

Present the FULL proposal — every term with its definition, evidence, and aliases — then ask via `plain-text numbered prompt`:

- **Approve all** — write every proposed term
- **Select subset** — user indicates which terms to keep (follow up for the list)
- **Skip** — write nothing

No write happens before this approval. Decline/skip ⇒ DC8 stays ❌, note it in the Phase 7 summary, move on — never re-ask in the same run.

### 5.5.4 Write accepted terms

One `flowctl glossary add` per accepted term — stdin definition so multi-sentence text round-trips cleanly (same call shape as refine's doc-aware write). `glossary add` creates `GLOSSARY.md` at the repo root when no ancestor file exists, and upserts on re-runs:

```bash
"$FLOWCTL" glossary add "<term>" --definition-file - --json <<'EOF'
<definition — 1-3 sentences>
EOF
# optional flags when proposed: --avoid "alt1,alt2" --relates-to "x,y"
```

Verify after the last write:

```bash
"$FLOWCTL" glossary list --json | jq -r '.total_terms'   # must equal the accepted count
```

Record the outcome for Phase 7: seeded N terms / user declined / count mismatch (report it, don't retry-loop).

---

## Phase 6: Apply Fixes

For each approved fix:
1. Read [remediation.md](../remediation.md) for the template
2. Detect project conventions (indent style, quote style, etc.)
3. Adapt template to match conventions
4. Check if target file exists:
   - **New file**: Create it
   - **Existing file**: Show diff and ask before modifying, unless `--fix-all` covers this append/merge edit
5. Report what was created/modified

**Non-destructive rules:**
- Never overwrite without explicit consent
- Merge with existing configs when possible
- Use detected project style
- Don't add unused features

---

## Phase 7: Summary

After fixes applied:

```markdown
## Changes Applied

### Created
- `CLAUDE.md` — Project conventions for agents
- `.env.example` — Environment variable template
- `GLOSSARY.md` — Seeded with [N] terms (Phase 5.5 bootstrap)

### Modified
- `package.json` — Added lint-staged config

### Skipped (user declined)
- Pre-commit hooks
- Glossary bootstrap (declined at read-back)

### Not Offered (production readiness)
- CI/CD, PR templates, observability, security — address independently if desired
```

Offer re-assessment only if changes were made:

```
Run assessment again to see updated score?
```

**Re-run reuse.** A re-assessment **reuses this session's Phase 0.5 classification and the Phase 0.6 answers** - it does NOT re-classify from scratch and does NOT re-ask a question already answered this session. Only the criteria/gates **affected by the fixes just applied** re-verify (the ranked catalog is re-ranked from the new state, not re-derived); untouched pillars carry their prior grades forward. Show:

- New Agent Readiness score and maturity level
- Score changes per pillar (only the re-verified criteria move)
- Remaining recommendations, re-ranked

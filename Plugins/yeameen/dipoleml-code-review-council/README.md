# Multi-Agent Code Review for Claude Code

A [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin that delivers AI code review by running **seven reviewers in parallel** on the same diff — then synthesizing all findings into a verified report.

Different model families miss different things. Run them all:

1. **Codex CLI** — gpt-6-astra at `high` reasoning effort
2. **Gemini via the Antigravity CLI (`agy`)** — Gemini 3.8 Flash (High)
3. **Five Claude specialist subagents** — security, performance, logic, regression, and robustness (the last one runs *blind* — no intent briefing)

The synthesis step de-duplicates findings, **verifies each one against the actual code** (reviewers hallucinate), tags severity, and shows you a unified report before applying any fixes.

## Install

```
/plugin marketplace add https://github.com/yeameen/claude-code-review-council
/plugin install review-council
```

## Usage

```
/review-council                    # review uncommitted changes
/review-council 1234               # review GitHub PR #1234
/review-council commit:abc123      # review a specific commit
```

The skill infers scope from context (uncommitted, branch vs main, specific commit, or PR number) — ask only when ambiguous.

## What you get

A synthesized report with:
- **Findings** tagged by source (which reviewer flagged it) and severity (P0–P3)
- **Verified citations** — every `file:line` opened and checked before being included
- **Disagreements** surfaced explicitly — where one reviewer said "fine" and another said "block merge"
- **False positives** dismissed with a one-line reason
- **Proposed actions** — wait for your approval before any code changes

## How it works

The skill orchestrates seven reviewers and a synthesis pass from a single Claude Code session:

**1. Build a workspace.** Saves the diff and a short `context.md` (scope, stated intent from PR description / commit messages, project conventions, out-of-scope items) to `/tmp/review-council-<timestamp>/`. All reviewers except one see the same intent — not just the diff. This catches "implementation diverges from stated rule" findings that no-intent reviews miss. The exception is deliberate: the robustness specialist reviews the raw diff with **no intent briefing**, because "by design / out of scope" notes anchor reviewers away from the very paths they describe — and that's where hardening gaps hide.

**2. Launch seven reviewers in parallel.** All started in the same turn, so wall-time is bounded by the slowest, not the sum:

| Reviewer | How it runs |
|---|---|
| **Codex CLI** (gpt-6-astra `high`) | Backgrounded shell subprocess: `codex review --title "..." - <<<"$context+diff"` (prompt-mode — passes intent alongside the diff) |
| **Antigravity CLI** (Gemini 3.8 Flash High) | Backgrounded shell subprocess: `agy --print "$context+diff" --model "Gemini 3.8 Flash (High)" --dangerously-skip-permissions --print-timeout 9m` |
| **5 Claude specialists** | Spawned in parallel via Claude Code's `Agent` tool, one per axis (security / performance / logic / regression / robustness), each with a focused single-axis prompt and told to ignore findings outside its lane. The robustness agent gets the diff only — no `context.md` |

Each reviewer writes its report into the shared workspace dir.

**3. Synthesize.** Once all seven reports land, the orchestrator:
- Deduplicates findings across all seven streams
- **Verifies each citation by opening the file** — reviewers occasionally hallucinate `file:line` refs, so unverified ones get dropped
- Re-rates severity against what's actually in the code (a "P0" that's really a style nit gets downgraded; a "P3" that's a real race condition gets upgraded)
- Tags each finding with which reviewers flagged it — multiple independent flags = high confidence
- Surfaces disagreements explicitly when one reviewer said "fine" and another said "block"
- **Measures before dismissing** — any dismissal resting on an assumed data shape or size ("n is small", "that input never occurs") gets checked against real data first
- **Converts manual verifications into tests** — if verifying a finding required hand-checking an invariant, that invariant ships with a unit test, even when the finding is dismissed
- **Audits the drop path** — when the diff adds filtering/matching logic, samples the *rejected* items from real data; replay-style verification proves consistency, not completeness

**4. Push back when needed.** If a finding looks suspicious, the orchestrator can resume the relevant reviewer mid-flight rather than just dismissing it:
- Codex: `codex exec resume --last "you flagged X, but the code does Y — defend or retract"`
- Gemini: `agy --print "<counter-evidence>" -c` (resumes the most recent conversation)
- Claude specialists: re-spawned with the disputed finding + counter-evidence

The full exchange is saved to the workspace for audit.

**5. Report and wait.** Presents a unified P0–P3 report with proposed actions. **No code changes until you approve.** Then applies fixes and re-runs your project's tests if cheap.

**Degradation:** If Codex or Gemini fails (quota errors, empty output, network issue), the skill notes it in the report and synthesizes from whatever did run. The five Claude specialists are reliable enough to carry a review on their own.

## Why seven reviewers?

Single-model reviews — even at flagship effort — have predictable blindspots:

- Holistic reviewers (Codex, Gemini) often miss **regression risk** because they don't grep aggressively for callers of changed functions.
- Specialist subagents catch axis-specific issues (e.g., race conditions, schema-breaking changes) that holistic reviewers sail past.
- Cross-family disagreement (GPT vs. Gemini vs. Claude) is signal — when all three agree, confidence is high; when they split, that's exactly where human judgment matters.
- Intent briefing is double-edged: it catches divergence-from-intent, but it also suppresses scrutiny of paths the author declared intentional. The **blind robustness reviewer** covers exactly those paths — exact-match logic on external strings (case, punctuation, whitespace drift), silent-drop filters, size/type assumptions, and unenforced invariants.

The five Claude specialists also serve as a fallback: if Codex or Gemini fail (quota errors, empty responses), the review still completes.

## Prerequisites

The skill calls out to external CLIs. Install and authenticate before use:

| Tool | Install |
|------|---------|
| [`codex`](https://github.com/openai/codex) | `npm i -g @openai/codex` |
| `agy` (Antigravity CLI) | Google's Antigravity CLI — the standalone `gemini` CLI no longer works on individual tier (`IneligibleTierError`, deprecated 2026) |
| `gh` (for PR reviews by number) | [cli.github.com](https://cli.github.com/) |

If `codex` or `agy` is missing or rate-limited, the skill degrades gracefully — the five Claude specialists carry the review on their own.

## Cost & time

3–8 minutes wall-time. Seven flagship-effort reviewers cost real money. Use it for:

- Security-sensitive code
- Database migrations and schema changes
- Anything you'd want a senior engineer's eyes on before merging

Don't use it for typos, doc tweaks, or single-file refactors with passing tests. For those, use Claude Code's lighter `/pr-review` skill.

## Manual install (copy-paste)

If you don't want to use the marketplace flow:

```bash
git clone https://github.com/yeameen/claude-code-review-council
cp -r claude-code-review-council/skills/review-council ~/.claude/skills/
```

Then `/review-council` is available in any Claude Code session.

## License

MIT

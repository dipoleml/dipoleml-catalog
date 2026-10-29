# capture — strategy override (gated reference)

> Read from [strategy-alignment.md](strategy-alignment.md) §5.0 only when `OVERRIDE_STRATEGY=1` and the strategy snapshot is populated.

When `OVERRIDE_STRATEGY=1` AND the snapshot is populated, capture proceeds with the write **AND** prompts the user to record the override as a decision entry. Pattern (mirrors `/flow-next:refine` behavior (d) — three-criteria decision-record gate):

```bash
# Interactive only — autofix never reaches this branch (5.0 exits 2 above when OVERRIDE_STRATEGY=0,
# and OVERRIDE_STRATEGY=1 in autofix is treated as "user already chose to override; record audit
# trail to stderr but don't prompt" — see logging branch below).
```

**Ask the user via plain text.** Render the options below as a numbered list `1.` … `N.`, followed by a final option `N+1. Other — type your own answer`. Print the question, then the numbered list, then **stop and wait for the user's next message before continuing**. Parse the reply as: a bare number `1`–`N+1` → that option; the literal text of an option label → that option; free text after `Other` → custom answer.

Use `plain-text numbered prompt` (lead-with-recommendation, `[high]` toward yes):

- **header**: `Record override?`
- **body**: `Override strategy track "<track>" — record as a decision? Recommended: yes — override decisions belong in the decisions track (load-bearing architectural choice). Confidence: [high].`
- **options**: frozen — `yes` (write decision entry), `no` (proceed without recording; audit trail logged to stderr only).

On `yes`, invoke `flowctl memory add` with the override rationale piped via `--body-file -` stdin. The rationale prose follows the artifact prose contract in [docs/prose.md](../../../docs/flow-next/prose.md); proceed without it when the doc is absent.

```bash
"$FLOWCTL" memory add \
  --track knowledge \
  --category decisions \
  --title "Override strategy: <track-name>" \
  --module strategy \
  --tags strategy-override \
  --body-file - <<EOF
## Problem
Spec <spec-id> contradicts active track "<track-name>" in STRATEGY.md.

## What was chosen
<concise summary of the override decision>

## Why
<rationale — why the override is the right call given current context>

## Track being overridden
- **<track-name>** (STRATEGY.md): "<canonical track wording>"
- **Spec direction:** "<contradicting wording>"

## Considered alternatives
- Aligning with the strategy track (rejected because: <reason>)
- Updating STRATEGY.md instead of overriding here (rejected because: <reason>)

## Consequences
- This spec ships in tension with track "<track-name>".
- A future `/flow-next:strategy` run should re-evaluate the track; this decision feeds that conversation.
EOF
```

On `no`, proceed without writing the decision. Log an audit-trail line to stderr:

```bash
# On no:
echo "[STRATEGY OVERRIDE]: track=\"<track-name>\" decision-not-recorded spec=<spec-id>" >&2

# On yes (decision was recorded):
echo "[STRATEGY OVERRIDE]: track=\"<track-name>\" decision-recorded=<entry-id> spec=<spec-id>" >&2
```

The audit trail line appears in both interactive (after the user picks) and autofix (when `OVERRIDE_STRATEGY=1` was passed) — it is the minimum durable record that an override happened, surfaceable in CI logs / git hook output later. In autofix mode (where the plain-text numbered prompt is unreachable), the decision-not-recorded variant fires unconditionally.

# Capture — source tags

The calibration companion to [workflow.md](workflow.md): how drafted lines are tagged. Question bodies state confidence per [references/confidence-tiers.md](references/confidence-tiers.md).

## Source-tag taxonomy

Tags mark what capture authored. Content the user said verbatim carries **no tag**: an untagged acceptance criterion, decision-context line, or boundary line claims to be the user's own words and must be findable in the Phase 1 `Conversation Evidence` (quote-level fidelity; trimming and ellipsis are fine, rewording is not), whether or not the resolved template writes that block into the spec. Anything capture reworded, filled in, or imported carries one trailing tag:

| Tag | Meaning | Acceptance test |
|-----|---------|-----------------|
| `[paraphrase]` | User intent restated in spec language; same meaning, no new constraint. A close restatement lands here, never untagged. | The user expressed this idea; the wording is the agent's. |
| `[inferred]` | Agent fill-in the user did not state (error formats, retry policies, defaults, unnamed components). Surfaced in the saved-spec summary for keep / edit / drop. | Agent decided this. May be a reasonable default; may be wrong. |
| `[strategy:<track>]` | Derived from a populated `STRATEGY.md` section; the track name is literal in the tag. Only when the Phase 0 strategy snapshot is present. | The line follows from that track's text. |

| Conversation evidence | Acceptance line |
|-----------------------|-----------------|
| `> user (turn 4): "rate limit must reject 3+ requests per second from a single client"` | `- **R1:** Rate limit must reject 3+ requests per second from a single client.` |
| `> user (turn 7): "we should write the spec body atomically so partial writes don't corrupt"` | `- **R5:** Spec writes are atomic; a failed write preserves prior state. [paraphrase]` |
| (no mention of error format) | `- **R7:** Errors include the request id for trace correlation. [inferred]` |

Narrative sections (Goal & Context, an architecture overview) take no per-line tags; they carry one breakdown note, e.g. `<!-- Source: 70% user / 20% [paraphrase] / 10% [inferred] -->`. The summary's `[inferred]` tally counts per-line tags plus those inferred shares; the user's words count under `[user]` in the shared tally shape. Zero `[inferred]` is rare; thirty suggests the conversation was too thin and `/flow-next:refine` fits better.

Chart D-ID evidence, chart facts, assets, and briefing membership are structural links and are never tagged; the full provenance-lane rule loads with the chart-briefing gate (workflow.md §0.5b).

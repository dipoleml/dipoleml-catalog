# Declined-scope ledger

Read when scope is declined as product judgment: it could be built, and the person or the plan
chooses not to.

Record it in `.flow/memory/declined/<concept-slug>.md` on the first such refusal: a title, the
decision in one line, short reasoning, then `## Prior requests` opened with today's date and the
request that just came in. When the file already exists, append the dated line to
`## Prior requests` and leave the decision untouched. Write the file yourself, like the rest of
`.flow/memory/`; it is memory, not a plan artifact, and there is no flowctl verb for it. Its prose
follows the plugin's `docs/prose.md` when that doc exists.

Not a decline, so no entry:

- scope that already exists, is already planned, or belongs to another spec: that is an answer,
  and recording it would teach the next planner that shipped capability is rejected scope;
- a size or sequencing trim ("not this task", "not this milestone"): an ordinary `## Boundaries`
  line;
- a skipped question: it goes to `## Open Questions`.

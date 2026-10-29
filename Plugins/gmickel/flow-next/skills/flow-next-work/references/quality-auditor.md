# Quality auditor (gated reference)

> Read from phases.md Phase 4 only when the change is large or risky.

- If change is large/risky, run the quality auditor subagent as **two axis-scoped dispatches of the same agent**, both named in ONE message:
  - Task flow-next:quality-auditor("AXIS: correctness — review recent changes; base <sha>")
  - Task flow-next:quality-auditor("AXIS: standards — review recent changes; base <sha>")

  `<sha>` is the spec base you already resolved this phase (`cat .flow/tmp/spec_base`) — substitute the value into both dispatch strings. A dispatch that shipped the literal `<sha>` has broken this.

  **Both axis dispatches go out in the same message.** A run that dispatched one axis and waited for its report before sending the other has broken this — the split exists so neither axis can spend the whole budget on the other's territory, and serializing them re-imports the cost the split removed.

  The auditor grades work someone else produced, so it is the **reviewer** tier. **Routing precedence, highest first: an explicit argument in the invocation, then the project routing block in the instruction file, then the agent definition's own default, then the session model.**

  **Aggregation — both reports verbatim, under two headings:**
  - `### Correctness axis` — that report, unedited.
  - `### Standards axis` — that report, unedited.

  Never merged, never reranked, never interleaved; neither axis's findings may bury the other's. A run that folded the two reports into one ranked list, or dropped an axis because the other looked worse, has broken this. After the two reports, one line per axis: finding count + worst tier **within that axis**. There is no single winner across axes.

- Fix rule:
  - Fix **Critical** findings. Only the correctness axis can carry them — the standards axis's ceiling is Should Fix by charter, so a Critical attributed to the standards axis is a charter break, not a blocker.
  - **Should Fix** from either axis: conductor judgment.
  - **Consider** never blocks.
  - When deciding fixes, read each `Out-of-axis observation:` as belonging to the named axis's territory. This is a fix-decision step only — the presented reports above stay verbatim.

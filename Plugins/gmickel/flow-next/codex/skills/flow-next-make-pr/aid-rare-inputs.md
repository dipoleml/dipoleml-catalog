# PR cognitive-aid: rare inputs (gated reference)

> Read from pr-cognitive-aid.md only for the section whose input is present.

## Several specs

- When export has `specs`, set `specIds` to their IDs in export order; keep `specId` as host. Declare every
  spec's requirements with qualified refs and `rIds` (`fn-8:R4`). At least one group per spec in review order
  (two allowed above ten must-read files), short ID in each title, using its task/evidence summary; no-spec commits get a group.
  Past the seven-step cap, merge the smallest specs into one group whose title names each short ID.

## Hill climb

- Summarize a task's `Hill climb:` block (`flow-next-work/references/hill-climb.md`) in the existing prose fields and proof cells:
  metric and target, baseline to final with the percent change, attempt counts (kept, reverted, inconclusive), the kept commits in order,
  the harness proof, the final gate, and the best untried idea. A value the record lacks renders `unverified` with the gap; an unmet target is `unverified`, never `pass`.

## QA receipt

- QA receipts use `qa_outcome`, not the projected `verdict`: SHIP maps to pass,
  NEEDS_WORK to fail, BLOCKED/NA to unverified with their reason. Open findings go in `openItems` and make the PR a draft; QA never blocks it.
  Verify head freshness against code, allowing only leading QA-receipt and spec-close bookkeeping commits;
  stale/malformed receipts cannot justify a pass.

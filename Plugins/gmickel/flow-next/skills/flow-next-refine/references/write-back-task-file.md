# Refine — write-back for a task or a file (gated reference)

> Read from write-back.md only when the input is a task id or a file path. The write pattern and
> read-back approval in write-back.md still apply.

## Task

Task acceptance is a plain `- [ ]` checklist; it takes no source tags. Use the task text read when detecting the input.

**The task has planning detail** (file references, sizing, approach): never overwrite it. Append the new criteria to the existing acceptance, Write the merged list to a literal path, and run `$FLOWCTL task set-acceptance <id> --file "${TMPDIR:-/tmp}/flow-refine-acc-<id>-<suffix>.md" --json`. Or suggest refining the spec instead: `/flow-next:refine <spec-id>`.

**The task is a stub** (title, empty or placeholder description): write the description (what must be accomplished, the edge cases and constraints found; not how) and the acceptance, each to its own literal path, then:

```bash
$FLOWCTL task set-spec <id> --description "${TMPDIR:-/tmp}/flow-refine-desc-<id>-<suffix>.md" --acceptance "${TMPDIR:-/tmp}/flow-refine-acc-<id>-<suffix>.md" --json
```

Leave file references, sizing and implementation approach to plan.

## File path

Rewrite the file with the refined requirements: keep its structure and format, add sections for what the interview covered (edge cases, acceptance criteria), and stay on what, not how. No source tags; it is the person's own document until capture turns it into a spec. Draft it to a literal path and get approval as above before overwriting the file. Then suggest `/flow-next:capture` to turn it into a spec.

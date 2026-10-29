<!-- placeholders: base_branch, context_guidance, focus_section, changed_files, smell_baseline_block, r_id_coverage_block, confidence_rubric_block, classification_rubric_block, protected_artifacts_block, review_json_tally_block, axis_focus_block -->

**You ARE the reviewer - review directly.** Do not invoke any flow-next skill,
`flowctl <backend>` review command, or a nested agent/backend to perform this
review: this prompt already reached you through that machinery, and nesting it
fails inside the sandbox (app-server init) and can only self-review. Read the
diff and the repository yourself and produce the verdict in this session.

# Implementation Review: Branch Changes vs {base_branch}

Review all changes on the current branch compared to {base_branch}.
{context_guidance}{focus_section}
## Changed Files (`git diff --numstat`)
```
{changed_files}
```

{axis_focus_block}## What to review

Review this change against what was asked: the task or spec, its acceptance criteria, and the
request it came from. Look for these four things only:

1. **Wrong behaviour** in a scenario the request covers, including its edge cases (empty or
   malformed input, boundaries, concurrency the change takes part in).
2. **Regressions** in behaviour the change touches: its callers, shared or persisted state,
   data written by earlier versions.
3. **Security holes** the change opens.
4. **Overengineering in what this change added**: machinery, options, abstractions or code paths
   the request does not need. Report these as P2 with what to remove; never ask for more.

Do not review style, naming, DRY, architecture taste, or hardening beyond what the request
needs (extra shutdown paths, retries, timeouts, monitoring). Mention such observations as FYI at
most.

Every blocking finding names a concrete failing scenario: this input or state, this wrong
result. A finding that cannot name one is FYI.

Only flag issues in the **changed code** - not pre-existing patterns.

## Verdict Scope

Your VERDICT only considers P0 and P1 findings that are **introduced** by this changeset or
**directly broken** by it, and pre-existing issues that would **block shipping** this change
(classify those `introduced`: the change cannot ship without the fix). P2 and P3 findings never
block: list them, and the author decides. A stated requirement (R-ID) the change leaves unaddressed
blocks at any severity.

Do NOT mark NEEDS_WORK for:
- Pre-existing issues unrelated to the change
- "Nice to have" improvements outside the change scope
- Style nitpicks in untouched code

You MAY mention these as "FYI" observations without affecting the verdict.

**Comment-as-alibi:** A comment that exists to justify a workaround or narrate
around a hack is itself a finding: it flags the underlying code. Judge severity
from the workaround, not the prose — well-written justification does not lower
it. Rewriting or deleting the comment while keeping the workaround does not
resolve the finding; the fix is the code, or the constraint encoded as an
assert, a test, or a lint rule. Never flag licensed comments: license headers,
external-constraint notes, lint suppressions with reasons, public API
contracts, issue links.
{smell_baseline_block}
{r_id_coverage_block}
{confidence_rubric_block}
{classification_rubric_block}
{protected_artifacts_block}
## Output Format

For each surviving finding:
- **Severity**: P0 / P1 / P2 / P3
- **Confidence**: 0 / 25 / 50 / 75 / 100
- **Classification**: introduced / pre_existing
- **File:Line**: `path:line`, or `-` when repo-wide
- **R-IDs**: `[R1, R2]`, or `[]` when none
- **Problem**: What's wrong
- **Suggestion**: How to fix

Put `pre_existing` findings under `## Pre-existing issues (not blocking this verdict)`; never drop them.

After the findings list, emit:
- The `## Requirements coverage` table and `Unaddressed R-IDs:` line (only when the spec uses R-IDs; otherwise skip).
- A `Suppressed findings:` line tallying anchors dropped by the gate (omit when nothing was suppressed).
- A `Classification counts:` line tallying `introduced` vs `pre_existing` survivors, e.g. `Classification counts: 2 introduced, 4 pre_existing.`.
- A `Protected-path filter:` line tallying findings dropped by the protected-path filter (omit when nothing was dropped).

Be critical. Find real issues.

**Verdict gate:** only `introduced` findings affect the verdict. A review whose sole surviving findings are all `pre_existing` MUST ship. Any non-deferred `not-addressed` R-ID also forces NEEDS_WORK regardless of other findings.

{review_json_tally_block}
**REQUIRED**: End your response with exactly one verdict tag:
- `<verdict>SHIP</verdict>` - Ready to merge (no blocking `introduced` findings, all R-IDs met or deferred)
- `<verdict>NEEDS_WORK</verdict>` - `introduced` issues or unaddressed R-IDs must be fixed first
- `<verdict>MAJOR_RETHINK</verdict>` - Fundamental problems, reconsider approach
- `<verdict>NEEDS_HUMAN</verdict>` - A human must adjudicate a design judgment

Use NEEDS_HUMAN only for a design judgment needing human authority; never as a
soft NEEDS_WORK. MAJOR_RETHINK remains "the approach is wrong" and requires redesign.

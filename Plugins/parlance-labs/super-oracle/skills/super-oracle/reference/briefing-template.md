# Super Oracle Briefing Template

Fill every section, delete the parenthetical guidance, then run the script next
to this skill: `bash <this-skill-dir>/scripts/super-oracle.sh -o OUTPUT.md
BRIEFING.md`. The oracle has no prior context, so be complete and specific.

---

# Task: <one-line goal>

## Working directory
`/abs/path/to/repo`

## Context
- What this project is and what I am trying to achieve.
- What I have already done, tried, or ruled out (do not repeat it).
- Domain constraints, prior decisions, or style rules to respect.

## Read these first
- `/abs/path/file1` — why it matters
- `/abs/path/file2` — why it matters
- PR URLs, command outputs, logs, data files as relevant

## Review target
- Base/fixed point and exact diff command, or "complete current worktree".
- Commits plus relevant staged, unstaged, and untracked files.
- Request/spec source, or "no spec available" (do not invent one).
- Repository instructions, domain glossary/ADRs when present, and validation
  commands already run with outcomes.

## Question
<Exactly what you want answered.>

## Constraints / non-goals
- The reviewers do not modify the working tree; the calling agent owns fixes.
- Stay within <scope>; do not expand search beyond <X>.
- Respect <style guide / invariants / API contracts>.

## Prior-round dispositions (omit on round 1)
- Fixed: <finding and verification>.
- Rejected/duplicate: <finding and concise reason; reconsider only with new evidence>.

## Output
Put the full answer in your final message (the wrapper streams it to your named
Markdown review file). Choose the structure that best communicates the result.
Support findings with concrete evidence and `file:line` locations where possible.
State material uncertainty. Do not modify the working tree.

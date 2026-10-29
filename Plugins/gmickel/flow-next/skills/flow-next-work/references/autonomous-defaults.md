# Autonomous defaults (gated reference)

> Read from SKILL.md only when `AUTONOMOUS=1`, before any question.

If `AUTONOMOUS=1` (the branch default stays in SKILL.md):

- **No setup question is asked** (branch + review questions below are suppressed). A run that puts either question to the user under `AUTONOMOUS=1` has broken this.
- **Review** = explicit `--review` passthrough if present, else the backend the review step resolves per task (`none` when it reads `ASK`).
- **Never hang on a question.** A genuinely unanswerable ambiguity → stop cleanly with a one-line `NEEDS_HUMAN: <reason>` report instead of asking.

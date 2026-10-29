# Live QA under `pipeline.qa=auto` (gated reference)

> Read from [gate-selection.md](gate-selection.md) only when `pipeline.qa` is `auto`.

For `auto` only, decide the two halves; the QA gate never asks Jev, so a run with a key and one without decide the same way:

- **UI-observable criteria** is your judgment, read from the acceptance criteria and the repo (`.flow/features/`, the prime QA-readiness line): does the acceptance describe behaviour a user could observe on a screen, page, window or rendered widget, rather than CLI output, file contents or library behaviour? A UI with no surface the QA skill can drive records `no drivable surface`.
- **Startable target** comes from code: this hop's route result carries `decision.startable_target_fact`, resolved from a documented start command, deploy URL or `.flow/features/`. `null` records `no startable target`; never invent one.

QA runs when both halves hold. Record `stage: qa - ran [target: <cmd>]` or `stage: qa - skipped(config: pipeline.qa=auto: <no UI-observable criteria | no drivable surface | no startable target>)`. `off` and `on` never ask.

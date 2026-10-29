# Explain trace

`explain` shows a user step-by-step how a command would be analyzed — parse segments, rule
matches, and the final verdict — without executing anything, so they can understand or debug a
block before it happens.

## Sub-features

- `explain-blocked` renders the trace for a command that would be denied, ending in
  `Status: BLOCKED` with the reason.
- `explain-allowed` renders the trace ending in `Status: ALLOWED`.
- `explain-json` emits the same trace as machine-readable JSON via `--json`.

## How to get to it (user POV)

- Run `npx cc-safety-net explain "git reset --hard"` in a terminal (here:
  `./ccsn-isolated explain "…"`).
- The GUI Policy tab's "Test a command" box uses the same analysis (covered in
  [policy-gui.md](./policy-gui.md)).

## Driving it with ccsn-isolated

Preconditions:

- Baseline; run from a directory with no `.cc-safety-net/` (`$WS` before any `rule` or `policy`
  recipe, or the skill directory): explain also reads the cwd's project policy and rules.

- **Blocked trace.** Run `./ccsn-isolated explain "git reset --hard" | tee "$EVIDENCE/explain-blocked.txt"`.
  Output shows the `Command Analysis` box, `Segment 1: ["git","reset","--hard"]`, the matched
  analyzer (`Rule:   git:analyzeGitMatch()` / `Result: MATCHED`), and `Status: BLOCKED` with the
  git-stash suggestion. The rule id `git.reset-hard` appears only in the JSON. Exit code 0.
- **Allowed trace.** Run `./ccsn-isolated explain "git status" | tee "$EVIDENCE/explain-allowed.txt"`.
  RESULT shows `Status: ALLOWED`, followed by the CONFIG block (`Safety preset: standard`). Exit
  code 0.
- **JSON.** Run `./ccsn-isolated explain --json "git reset --hard" > "$EVIDENCE/explain.json"`.
  Stdout is pretty-printed JSON; assert with
  `jq -c '[.trace.steps[0].type, .trace.steps[0].segments, .result, .ruleId]'`, which prints
  `["parse",[["git","reset","--hard"]],"blocked","git.reset-hard"]`.

## Gotchas

- Exit code is 0 for blocked and allowed alike; assert on the rendered `Status:` line or the JSON
  verdict, not the exit code.
- Several positional words are shell-quoted and joined into one command, so everything after the
  first positional, `--json` included, becomes command text: put flags first. A command that
  starts with a dash needs `--` before it.
- `--cwd <path>` sets the directory for project policy lookup and path resolution; a missing path
  exits 1 with `Error: --cwd path does not exist`.
- explain reads the active policy — a leftover `$CCSN_VERIFY_HOME/.cc-safety-net/policy.json`
  from an earlier GUI recipe changes verdicts. Use a fresh home when asserting defaults.

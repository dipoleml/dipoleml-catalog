# Diagnostics

`status` summarizes what is enforced right now (protection toggles, safety level, active rules,
policy path); `doctor` runs the full installation health check with a self-test and can emit
JSON; `statusline` prints the one-line badge Claude Code shows in its status bar.

## Sub-features

- `status-summary` one-screen enforcement summary with pointers to `doctor`.
- `doctor-report` per-check health report; exit code reflects overall health.
- `doctor-json` machine-readable report via `--json`.
- `statusline` prints `🛡️ CC Safety Net` with a mode badge, or `❌` when the Claude Code plugin is
  not enabled.

## How to get to it (user POV)

- Run `npx cc-safety-net status` in a terminal.
- Run `npx cc-safety-net doctor` (add `--json` for machine output).
- Claude Code's `statusLine` setting runs `cc-safety-net statusline --claude-code`.

## Driving it with ccsn-isolated

Preconditions:

- Baseline. Expect the single "No integration configured" finding from doctor: the isolated home
  has no hooks installed, and that is the correct report for it.

- **Status.** Run `./ccsn-isolated status | tee "$EVIDENCE/status.txt"`. First line is
  `CC Safety Net — ready`; the summary shows `destructive ok`, `secrets ok`, the padded
  `Level        standard` row (grep `'^  Level +standard$'`), and the policy path. Under
  isolation it also lists `Not active` / `plugin cc-safety-net@cc-marketplace is disabled in
  Claude Code`, because the isolated home has no Claude Code settings.
- **Doctor.** Run `./ccsn-isolated doctor --json --skip-update-check > "$EVIDENCE/doctor.json"; echo exit=$?`.
  Stdout is a JSON report of named checks; record the exit code with it. Healthy means
  `engineSelfTest.failed` is 0 and `configState.state` is `"ready"`. Against a fresh isolated
  home the exit code is 1 with exactly one error finding, `integration.none-configured` —
  expected under isolation; any other error-severity finding is a real defect.
- **Statusline.** From `$WS`, run `./ccsn-isolated statusline --claude-code < /dev/null`; it prints
  `🛡️ CC Safety Net ❌`. Write
  `{"enabledPlugins":{"cc-safety-net@cc-marketplace":true}}` to
  `$CCSN_VERIFY_HOME/.claude/settings.json` and rerun: it prints the mode badge instead (`🔒`
  once the policy level is strict).

## Gotchas

- Without `--skip-update-check`, doctor calls the npm registry — slow or flaky offline, and it
  makes the run depend on the network.
- `status` and `statusline` read only Claude Code's `settings.json` (`$CLAUDE_SETTINGS_PATH`,
  else `$CLAUDE_CONFIG_DIR`, else `$HOME/.claude`); they spawn nothing.
- `doctor` runs the host CLIs on the real `PATH` (version probes, `codex plugin list`,
  `amp plugins list`) with the isolated `HOME`, so `.system.versions` lists real binaries. A shell
  that exports a host config directory (`CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `COPILOT_HOME`,
  `XDG_CONFIG_HOME`, `OPENCODE_CONFIG_DIR`, `KIMI_CODE_HOME`, …) points doctor at real host
  config: an integration then reads as configured, or a bad real config raises
  `integration.inspection-failed`. Unset those before judging doctor's findings.
- Doctor's exit code reflects the installation, not this checkout's health; under isolation
  always judge by `engineSelfTest` and `configState` in the JSON, never the exit code.

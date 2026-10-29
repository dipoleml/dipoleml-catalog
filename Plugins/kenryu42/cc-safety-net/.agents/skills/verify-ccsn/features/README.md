# cc-safety-net verification map

This directory is the maintained source for verifying the user-facing behavior of cc-safety-net.
Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Follow the Launch section of [SKILL.md](../SKILL.md): `CCSN_VERIFY_HOME`, `$EVIDENCE`, and the
  workspace `$WS` exist; every invocation goes through `./ccsn-isolated`.
- The Doctor check passed: `--version` prints `dev`, `status` prints `CC Safety Net — ready`.
- Session ids in hook payloads start with `ccsn-verify-` so a leaked audit entry is identifiable
  by filename in the real log tree.
- Command strings under test are analyzer input only. Never execute one in a shell.
- Never drive `install`/`update`/`uninstall`, and never drive an instance this run did not start.

## Driving conventions

- Start every recipe from the baseline unless its preconditions say otherwise.
- Run cwd-scoped commands (`explain`, `rule`, `policy`, hook payloads whose `cwd` is `$WS`) from
  `$WS`; `rule` and `policy` write project config there.
- Prefer `--json` output for assertions; keep the human rendering as evidence where it is the
  user-visible surface (`explain`, `status`).
- GUI: prefer element ids and `data-nav` attributes over coordinates; the URL token changes every
  launch — always re-read it from `gui.log`.

## Proof and skip reporting

- CLI proof includes the exact command (or stdin payload), stdout, stderr, and exit code.
- Hook proof pairs the stdout decision with the audit entry under
  `$CCSN_VERIFY_HOME/.cc-safety-net/logs/`. The hook answers; the host enforces — a hook proof
  covers the decision and audit trail, never file survival (that lives in `tests/e2e`).
- An allow proof needs empty stdout AND exit 0 AND the `allow` audit entry; a deny proof asserts
  the rule id, not just the deny (malformed payloads are denied too).
- GUI mutation proof includes a read-back through a second surface (API GET or the policy file on
  disk), not just the page's own success status.
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition; do not report
  a skipped entry point as verified through a different path.

## Features

- [Hook protection](./hook-protection.md) — the production deny/allow decision path a coding CLI
  drives over stdin, and its audit side effect.
- [Explain trace](./explain-trace.md) — step-by-step analysis of a command, human and `--json`.
- [Diagnostics](./diagnostics.md) — `status` summary, `doctor` health report, and the Claude
  Code `statusline`.
- [Audit logs](./audit-logs.md) — browsing recorded decisions with `logs`.
- [Policy GUI](./policy-gui.md) — the local web dashboard: activity feed, policy editing, the
  command tester.
- [Rule config](./rule-config.md) — `rule` declared tools, wrappers, list, and verify.
- [Policy proposals](./policy-proposals.md) — `policy check` diffs and the TTY-only `apply`.

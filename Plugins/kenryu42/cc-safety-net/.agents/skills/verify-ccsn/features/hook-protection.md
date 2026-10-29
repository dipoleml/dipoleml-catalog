# Hook protection

The core product: a coding CLI sends each pending tool call to `cc-safety-net hook
--<integration>` as JSON on stdin; the hook answers deny (JSON on stdout) or allow (silence)
before the tool call runs, and records the decision in the audit log.

## Sub-features

- `hook-deny` blocks a destructive command with a rule id and a safer-alternative message.
- `hook-allow` stays silent for a safe command and still records the allow decision.
- `hook-audit` appends one JSONL entry per decision under the active home.
- `hook-integrations` answers the same analysis through each host CLI's payload shape.

## How to get to it (user POV)

- A Claude Code `PreToolUse` hook invokes `cc-safety-net hook --coding-cli` (legacy alias
  `--claude-code`) with the tool-call JSON on stdin, installed by `cc-safety-net install`. Other
  hosts use their own flag; `cc-safety-net hook --help` lists them.
- The user never invokes it directly; verification plays the host CLI's role.

## Driving it with ccsn-isolated

Preconditions:

- Baseline, plus `cd "$WS"`.

- **Deny.** Send a `git reset --hard` payload. Run
  `printf '%s' '{"hook_event_name":"PreToolUse","tool_name":"Bash","session_id":"ccsn-verify-'"$RUN_ID"'-reset","cwd":"'"$WS"'","tool_input":{"command":"git reset --hard"}}' | "$REPO/.agents/skills/verify-ccsn/ccsn-isolated" hook --coding-cli | tee "$EVIDENCE/hook-deny.json"`.
  Stdout is one JSON object with `permissionDecision: "deny"` and a reason containing
  `Rule: git.reset-hard`; exit code 0; stderr empty. Assert the rule id, not just the deny: a
  malformed payload is also denied ("Failed to parse hook input JSON."), so a deny alone does not
  prove your rule matched.
- **Allow.** Send the same payload with `"command":"git status"` and session id
  `ccsn-verify-$RUN_ID-safe`. The allow proof is a negative and needs all three parts: empty
  stdout AND exit code 0 AND the `allow` audit entry below — empty stdout alone also looks like
  a crash swallowed by a pipe.
- **Audit side effect.** Run `find "$CCSN_VERIFY_HOME/.cc-safety-net/logs" -name '*ccsn-verify*'`
  and `cat` the two files into `$EVIDENCE/hook-audit.jsonl`. The deny entry has
  `"decision":"deny"`, `"ruleId":"git.reset-hard"`, and the session id; the allow entry has
  `"decision":"allow"`.
- **Isolation held.** Run `find ~/.cc-safety-net/logs -name "*ccsn-verify-$RUN_ID*"`; it finds
  nothing. Match the run id: older runs' stale files in the real tree are not this run's leak.

## Gotchas

- Exit code 0 does NOT mean allowed — for Claude Code deny and allow both exit 0. The decision is
  stdout. Hosts differ: Droid denies with exit 2 and repeats the reason on stderr, and Cursor
  and Grok Build print an allow JSON instead of silence.
- The hook answers; the host enforces. This recipe proves the decision and the audit trail, not
  that a file survived — survival proofs live in `tests/e2e`, which stage a sentinel and a real
  host runner.
- Outside a host's declared deny exit code (Droid's 2, with the reason on stderr), any stderr
  output or nonzero exit is itself a bug: hosts surface those channels, and the integrations
  contract keeps them silent (see `tests/e2e/harness.ts`).
- The audit log path is keyed by the realpath of the payload's `cwd` field, not the process cwd
  (`/tmp/x` lands under a `-private-tmp-x` slug on macOS). A `cwd` that does not exist is denied
  for the working directory, not by your rule.
- A malformed payload is denied before the session id is read, so it leaves no audit entry.
- Payload field names and command tool names differ per integration (`hook_event_name` and the
  `Bash` tool are Claude Code's shape; Droid's command tool is `Execute`, and a `Bash` call there
  is not analyzed as a command: empty stdout, no rule). For another flag, read its
  `src/hosts/<id>/hook.ts` first.
- Never "test" the hook by letting a real shell run the command afterward.

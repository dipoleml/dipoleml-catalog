# Audit logs

`logs` shows the user the decisions recorded in the active home — by default the denials, with
`--all` including allowed commands — reading the JSONL audit trail the hook writes.

## Sub-features

- `logs-denials` lists recorded deny decisions, newest first.
- `logs-all` includes allow decisions via `--all`.
- `logs-json` emits the raw entries via `--json`.
- `logs-filter` narrows by `--session`, `--project <path>`, `--agent`, `--rule`, `--since <days>`,
  or `--limit <n>`; `--id <16hex>` shows one entry in detail.

## How to get to it (user POV)

- Run `npx cc-safety-net logs` (add `--all`, `--json`, or a filter).
- The GUI Activity tab renders the same trail (covered in [policy-gui.md](./policy-gui.md)).

## Driving it with ccsn-isolated

Preconditions:

- Baseline, plus the two decisions from [hook-protection.md](./hook-protection.md) already
  recorded for `$WS`. Other recipes may have added more rows; assert on your session ids.
- `cd "$WS"`.

- **Denials.** Run `"$REPO/.agents/skills/verify-ccsn/ccsn-isolated" logs | tee "$EVIDENCE/logs-deny.txt"`.
  Each row is `<16-hex id>  <YYYY-MM-DD HH:MM>  deny   claude-code      git.reset-hard        git reset --hard  [$WS]`;
  no `allow` row appears.
- **All decisions.** Run `… logs --all | tee "$EVIDENCE/logs-all.txt"`. The deny rows plus an
  `allow  claude-code      -                     git status  [$WS]` row.
- **Raw entries.** Run `… logs --all --json > "$EVIDENCE/logs.json"`, then
  `jq -r '.[] | [.decision, .ruleId // "-", .sessionId, .command] | @tsv' "$EVIDENCE/logs.json"`.
  It lists `deny git.reset-hard ccsn-verify-$RUN_ID-reset git reset --hard` and
  `allow - ccsn-verify-$RUN_ID-safe git status`.
- **Filter.** Run `… logs --all --json --session "ccsn-verify-$RUN_ID-reset" | jq length`; it
  prints `1`.

## Gotchas

- `logs` is not scoped to the cwd: it reads every project's entries in the active home, from any
  directory. Narrow with `--project <path>` or `--session`; a plain path argument is refused.
- Rows show the entry id, never the session id; match sessions with `--session` or `--json`.
- Default output hides allows; a missing row is not a missing entry until `--all` also misses it.
- Default window is 20 rows from the last 30 days (`--limit`, `--since`).
- Entries live under `logs/<slugified-cwd>/<YYYY-MM>/<YYYY-MM-DD>-<sessionId>.jsonl`, with UTC
  month and date.
- Retention pruning deletes whole day files past the retention window, at most once per UTC day
  (on append, on `logs`, and on the GUI feed) — don't assert on counts across old fixture homes.

# Filing a finding

Read from `workflow.md` Phase 5 before filing the first finding. Reproduction, severity and the
evidence list are in Phase 5; this file covers the body, the commands and dedup. The severity
scale, reproduce-twice and session-hygiene practice are adapted from Ray Fernando's
`running-bug-review-board` skill (Apache-2.0).

## The body

Write for an engineer with no context. Finding prose follows [docs/prose.md](../../../docs/prose.md)
when it exists; the rules here win where they differ.

- **Title** states what the user experiences, not the suspected fix:
  `<persona> can't <goal> — <one-line observed symptom>` (`Fresh user can't complete signup — OTP
  step redirects to /500`, not `Fix the OTP cron job`).
- **Steps** run cold: persona and address used, full starting URL with query string, each action
  with its exact input, wait conditions ("after redirect to X"), where the screenshot was taken.
- **Expected** is quoted from the criterion and decision context; **Actual** is what the app did.
  When the two read the same but the bug is real, the difference is hidden state (URL, storage,
  server row): spell it out.
- Console lines are verbatim with tokens and personal data removed. Multi-step screenshots are
  numbered (`01-…png`). The failing request and the snapshot of the failing step help when you
  have them.
- One root cause is one finding: file the highest-impact case.

## Commands

With memory disabled, skip this and keep the finding in the run notes. Otherwise probe for an
existing entry, decide, then file once:

```bash
if [ "$($FLOWCTL config get memory.enabled --json | jq -r '.value')" = "true" ]; then
  mkdir -p .flow/tmp/qa-"$SPEC_ID"
  cat > .flow/tmp/qa-"$SPEC_ID"/finding-<sid>.md <<'EOF'
## Problem
<persona> attempting <goal> hit <observed failure> on the live app.

## Steps to reproduce (cold)
1. <starting URL incl. query string>
2. <verbatim action + input>
3. <wait condition>
4. <observe>

## Expected
<AC text + decision_context resolved-default — quoted from the spec>

## Actual
<observed state — incl. invisible state: URL / storage / server row>

## Evidence
- console: .flow/tmp/qa-<spec-id>/<sid>-console.log (last ~30 lines)
- screenshot: .flow/tmp/qa-<spec-id>/<sid>-fail.png
- url: <full URL at failure>
- write side-effect: <server/DB row or API response, if a write path>

## Traceability
- R-IDs: [R<i>, ...]   scenario: S<n>   driver_rung: <rung>   viewport: <wxh>
EOF
  # Probe only; nothing is written.
  _out="$($FLOWCTL memory add --check-overlap \
    --track bug --category "<category>" \
    --title "<persona> can't <goal> — <one-line symptom>" \
    --module "<surface / route / component>" --tags "qa,<spec-id>,<surface>" --json)"
  # File once. Add --update <matched-id> only when a match is this same bug.
  _out="$($FLOWCTL memory add \
    --track bug --category "<same category>" --title "<same title>" \
    --module "<same module>" --tags "qa,<spec-id>,<surface>" \
    --symptoms "<observed actual, one line>" \
    --root-cause "(observed via live QA — unconfirmed)" \
    --body-file .flow/tmp/qa-"$SPEC_ID"/finding-<sid>.md --json)"
  # Assign in this shell (not a pipeline tail) so the autonomous commit sees it.
  _p="$(printf '%s' "$_out" | jq -r '.path // empty')"
  [ -n "$_p" ] && QA_FILED_MEMORY="${QA_FILED_MEMORY:+$QA_FILED_MEMORY }$_p"
fi
```

Never pass `--no-overlap-check`: it empties `matches`, and later passes re-file the same bug
blind. `memory add` creates a new entry unless given `--update <id>`. Reading `matches`:

- score 3 or more: note "matches existing entry X"; when it is the same bug (a re-run, or an id you
  already know), file with `--update <id>` so the entry folds in rather than gaining a sibling.
- score 2: file new; the entry records `related_to` the match.

The root cause is unconfirmed (QA saw a symptom), so it stays `(observed via live QA — unconfirmed)`.

## Category

| Observed | Category |
|----------|----------|
| layout broken, wrong color, a11y, cosmetic | `ui` |
| crash, wrong value, null render at runtime | `runtime-errors` |
| API contract / wire-format / schema mismatch across a boundary | `integration` |
| data corruption, partial/lost write, wrong persisted row | `data` |
| auth bypass, leaked secret, injection | `security` |
| slow load, jank, memory growth | `performance` |

Pick the most specific that fits.

## Turning a finding into work

QA does not fix product code. When the person wants a finding fixed, `/flow-next:capture` turns
the finding body into a spec; capture owns spec-id minting and tracker linking.

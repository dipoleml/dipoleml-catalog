# Existing id: fetch and readiness check (gated reference)

> Read from steps.md Step 1 only when the input resolved to an existing spec or task id.

**Existing id.** Fetch it once, with the readiness check in the same bash block (variables do not survive across tool calls; never run a second `show --json`). The readiness check applies only to an existing spec, not to a task id:

```bash
$FLOWCTL cat <id>
SHOW_JSON=$($FLOWCTL show <id> --json)
echo "$SHOW_JSON"
# Readiness soft-check (spec ids only): warn, never block. Fires only in repos that
# use readiness (any spec marked ready, or tracker.readyState configured).
SPEC_READY=$(jq -r '.ready // false' <<< "$SHOW_JSON")
READINESS_WARN=false
# The owner-reconciliation stop (steps.md Planning choice) comes before any readiness prompt.
OWNER_STOP=$(jq -r 'if .no_plan == true and ((.tasks // []) | length) == 1 and .tasks[0].implicit_owner == true then 1 else 0 end' <<< "$SHOW_JSON" 2>/dev/null)
[[ "$OWNER_STOP" == "1" ]] && echo "OWNER RECONCILIATION — STOP. Apply Planning choice below; skip the readiness check."
if [[ "$SPEC_READY" != "true" && "$OWNER_STOP" != "1" ]]; then
  READY_STATE=$(jq -r '.value.tracker.readyState // empty' "${TMPDIR:-/tmp}/flow-plan-config-<suffix>.json" 2>/dev/null)
  READY_ADOPTED=$($FLOWCTL specs --json 2>/dev/null | jq '[.specs[] | select(.ready == true)] | length' 2>/dev/null || echo 0)
  if [[ -n "$READY_STATE" || "$READY_ADOPTED" -ge 1 ]]; then
    READINESS_WARN=true
    echo "READINESS GATE ACTIVE — STOP. Read references/readiness-warn.md before continuing."
  fi
fi
```

When the sentinel prints, read [`readiness-warn.md`](readiness-warn.md) before any further step. Otherwise continue silently.

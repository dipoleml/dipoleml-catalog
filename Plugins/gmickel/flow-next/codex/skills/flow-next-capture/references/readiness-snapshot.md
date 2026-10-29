# Readiness snapshot (gated reference)

> Read from workflow.md §4.2 on every run that is not under `from:flow`.

Readiness is a separate follow-up; capture the predicate now, before a rewrite resets the old flag. This step asks and writes nothing:

```bash
ACTIVE=0
# From the preamble root snapshot (same literal path) — not a config get call.
VAL="$(jq -r '.value.tracker.readyState // empty' "${TMPDIR:-/tmp}/flow-capture-config-<suffix>.json" 2>/dev/null)" || ACTIVE=1
[ -z "$VAL" ] && ACTIVE=1
if [ "$ACTIVE" = "1" ]; then
  echo "GATE ACTIVE — STOP. Read references/mark-ready.md before continuing."
fi   # default branch: bare no-op — NO link, NO read path
```

On the sentinel, read [mark-ready.md](mark-ready.md), compute its §4.2 predicate, and keep it for §5.9. Silent: `tracker.readyState` owns readiness, so capture offers no readiness write.

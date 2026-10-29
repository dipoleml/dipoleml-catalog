# Stale mapped routes (gated reference)

> Read from [workflow.md](../workflow.md) §5.5 only when a mapped route does not match the live app.

When a mapped route does not match the live app, record a drift note (not a P0/P1/P2 finding)
under the contract's "Writers and drift notes" rules, never edit `.flow/features/`, then derive
another route for the scenario and keep testing the criterion. Only when no route reaches the
surface does the scenario become a gap.

```bash
if [ "$($FLOWCTL config get memory.enabled --json | jq -r '.value')" = "true" ]; then
  mkdir -p .flow/tmp/qa-"$SPEC_ID"
  cat > .flow/tmp/qa-"$SPEC_ID"/drift-<sid>.md <<'EOF'
Expected: <mapped route / command>
Observed: <what the live app did>
EOF
  # upsert exits non-zero when 2+ entries share the title; never let that abort the run.
  if _out="$($FLOWCTL memory upsert \
    --track knowledge --category workflow \
    --title "drift: <surface>/<feature-slug> <sub-feature-id>" \
    --tags "feature-map-drift" \
    --body-file .flow/tmp/qa-"$SPEC_ID"/drift-<sid>.md --json)"; then
    _p="$(printf '%s' "$_out" | jq -r '.path // empty')"
    [ -n "$_p" ] && QA_FILED_MEMORY="${QA_FILED_MEMORY:+$QA_FILED_MEMORY }$_p"
    # A recurrence reopens a stale note; hardened or active notes keep their status.
    if [ "$(printf '%s' "$_out" | jq -r '.action // empty')" = "updated" ]; then
      _id="$(printf '%s' "$_out" | jq -r '.entry_id')"
      if [ "$($FLOWCTL memory read "$_id" --json 2>/dev/null | jq -r '.frontmatter.status // empty')" = "stale" ]; then
        $FLOWCTL memory mark-fresh "$_id" --json >/dev/null || true
      fi
    fi
  fi
fi
```

With memory disabled or a failed upsert, put Expected, Observed (and any listed entry ids) in the
run notes and continue.

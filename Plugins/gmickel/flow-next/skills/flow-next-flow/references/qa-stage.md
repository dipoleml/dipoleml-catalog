# QA stage - freshness rule

> **The rule, not a step to run.** `flow --auto` gets `QA_FRESH` from the pilot snapshot
> (`selected.qa_fresh`), which implements the receipt identity, outcome and branch-head checks
> below. Read this file to understand what counts as a fresh QA verdict; never run the probe
> it describes.

## QA-stage freshness (what the snapshot checks)

When the gate selects QA, the all-done juncture classifies `qa` **only when no *fresh* `qa_verdict` receipt exists** for the spec. Every hop re-classifies from disk. The freshness check prevents repeated QA from blocking make-pr. The receipt lives at the committed path `.flow/review-receipts/qa-<spec-id>.json` (the QA skill's default). A receipt is **fresh** iff all three hold:

1. `receipt.id == <spec-id>` (the receipt's existing spec-id field is `id`, not `spec`).
2. `receipt.head_sha` matches the spec **branch** head **with the `chore(flow): qa verdict` bookkeeping commits peeled off**. The receipt records the CODE head. The QA skill commits the receipt above it, so a raw `rev-parse "$BRANCH_NAME"` would never match and QA would re-run forever. Compute against the branch, never `HEAD`, because a resumed or manual run may sit on another branch. The post-dispatch verify runs before the receipt commit and still uses `HEAD` directly.
3. `receipt.qa_outcome` is a valid terminal value (`SHIP`, `NEEDS_WORK`, `NA`, or `BLOCKED`).

Resolve `BRANCH_NAME` + `QA_FRESH` here; the `qa` decision itself is made in the all-done PR probe's **no-PR** branch below, so an existing PR always takes priority. Read the receipt with a single `jq` so a missing/malformed file degrades to never-fresh:

```bash
[[ -n "${BRANCH_NAME:-}" ]] || BRANCH_NAME="$(printf '%s\n' "$SPEC_JSON" | jq -r '.branch_name // empty')"
QA_RECEIPT="$REPO_ROOT/.flow/review-receipts/qa-$SELECTED_SPEC.json"
QA_FRESH=0
if [ -f "$QA_RECEIPT" ] && [ -n "$BRANCH_NAME" ]; then
  R_ID="$(jq -r '.id // ""' "$QA_RECEIPT" 2>/dev/null)"
  R_SHA="$(jq -r '.head_sha // ""' "$QA_RECEIPT" 2>/dev/null)"
  R_OUT="$(jq -r '.qa_outcome // ""' "$QA_RECEIPT" 2>/dev/null)"
  case "$R_OUT" in SHIP|NEEDS_WORK|NA|BLOCKED) : ;; *) R_SHA="" ;; esac   # invalid outcome → never fresh
  # The receipt's head_sha is the CODE head; the QA skill's own `chore(flow): qa verdict` commit
  # sits ABOVE it on the branch, so the branch tip is not
  # the code head. Walk from the tip peeling those bookkeeping commits. Accept a match
  # anywhere in the chain. Otherwise a successful QA pass appears stale and runs again.
  if [ "$R_ID" = "$SELECTED_SPEC" ] && [ -n "$R_SHA" ]; then
    _s="$(git -C "$REPO_ROOT" rev-parse --verify --quiet "$BRANCH_NAME" 2>/dev/null || echo "")"
    while [ -n "$_s" ]; do
      [ "$_s" = "$R_SHA" ] && { QA_FRESH=1; break; }
      git -C "$REPO_ROOT" log -1 --format='%s' "$_s" 2>/dev/null \
        | grep -qE '^chore\(flow\): qa verdict ' || break
      _s="$(git -C "$REPO_ROOT" rev-parse "$_s^" 2>/dev/null || echo "")"
    done
  fi
fi
```

`QA_FRESH` is the result `auto.md`'s all-done PR probe consumes.

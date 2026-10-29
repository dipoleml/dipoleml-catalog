# Autonomous verdict commit (gated reference)

> Read from [workflow.md](../workflow.md) §6.3b only when `QA_AUTONOMOUS=1`.

When `QA_AUTONOMOUS=1`, commit exactly QA's own files so `flow --auto` gets a clean tree. Never
`git add -A` or a `.flow/memory` glob. An interactive run leaves commits to the user.

```bash
if [ "$QA_AUTONOMOUS" = "1" ]; then
  RECEIPT_HISTORY_DIR="${RECEIPT_PATH}.history"
  QA_HISTORY_PATHS=()
  [ -d "$RECEIPT_HISTORY_DIR" ] && QA_HISTORY_PATHS=("$RECEIPT_HISTORY_DIR")
  git -C "$REPO_ROOT" add -- "$RECEIPT_PATH" "${QA_HISTORY_PATHS[@]}" ${QA_FILED_MEMORY:+$QA_FILED_MEMORY}
  git -C "$REPO_ROOT" diff --cached --quiet -- "$RECEIPT_PATH" "${QA_HISTORY_PATHS[@]}" ${QA_FILED_MEMORY:+$QA_FILED_MEMORY} \
    || git -C "$REPO_ROOT" commit -m "chore(flow): qa verdict $SPEC_ID" -- "$RECEIPT_PATH" "${QA_HISTORY_PATHS[@]}" ${QA_FILED_MEMORY:+$QA_FILED_MEMORY}
fi
```

`flow --auto` recognises this subject when it looks past the commit for the code head that
`head_sha` recorded, so keep it exactly. A user running `mode:autonomous` with uncommitted
`.flow/memory` edits should commit them first, since an updated entry would ride this commit.

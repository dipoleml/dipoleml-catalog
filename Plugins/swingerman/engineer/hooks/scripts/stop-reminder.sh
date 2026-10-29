#!/bin/bash
set -euo pipefail

# Stop hook: remind to verify both test streams
# Fires when Claude finishes a task

project_dir="${CLAUDE_PROJECT_DIR:-.}"
specs_dir="$project_dir/specs"

# Only remind if specs exist (project is using ATDD)
if [ ! -d "$specs_dir" ]; then
  exit 0
fi

txt_count=$(find "$specs_dir" -name "*.txt" -type f 2>/dev/null | wc -l | tr -d ' ')

if [ "$txt_count" -eq 0 ]; then
  exit 0
fi

# Specs exist — remind about dual-stream verification
echo '{"decision": "approve", "systemMessage": "ATDD reminder: Before considering this task complete, verify both test streams pass — acceptance tests (run-acceptance-tests.sh) and unit tests. Both streams must be green."}'
exit 0

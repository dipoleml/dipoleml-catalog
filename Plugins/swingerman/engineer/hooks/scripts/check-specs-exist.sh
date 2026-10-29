#!/bin/bash
set -euo pipefail

# PreToolUse hook: soft warning when writing code without specs
# Fires on Write and Edit tool calls

input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name // empty')
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Skip if no file path
if [ -z "$file_path" ]; then
  exit 0
fi

# Skip non-source files (tests, configs, specs, docs, generated files)
case "$file_path" in
  *test*|*spec*|*specs/*|*.md|*.json|*.yaml|*.yml|*.toml|*.ini|*.cfg)
    exit 0
    ;;
  *.gitignore|*.env*|*config*|*generated-acceptance*|*acceptance-pipeline*)
    exit 0
    ;;
esac

# Check if specs directory exists and has .txt files
project_dir="${CLAUDE_PROJECT_DIR:-.}"
specs_dir="$project_dir/specs"

if [ ! -d "$specs_dir" ]; then
  echo '{"systemMessage": "ATDD reminder: No specs/ directory found. The ATDD workflow requires writing Given/When/Then acceptance specs before implementation. Consider running /atdd to start the workflow."}'
  exit 0
fi

txt_count=$(find "$specs_dir" -name "*.txt" -type f 2>/dev/null | wc -l | tr -d ' ')

if [ "$txt_count" -eq 0 ]; then
  echo '{"systemMessage": "ATDD reminder: specs/ directory exists but contains no .txt spec files. Consider writing acceptance specs before implementing features. Run /atdd to start."}'
  exit 0
fi

# Specs exist — no warning needed
exit 0

#!/usr/bin/env bash
# PostToolUse hook: append every Bash command to evidence/commands.log
# Triggered after each Bash tool call by Claude Code.
# Claude Code sends hook data as JSON on stdin.

set -euo pipefail

EVIDENCE_DIR="${EVIDENCE_DIR:-./evidence}"
LOG_FILE="$EVIDENCE_DIR/commands.log"

# Read stdin (hook JSON payload)
INPUT=$(cat)

# Extract the command from tool_input.command using Python (avoids jq dependency)
CMD=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    cmd = d.get('tool_input', {}).get('command', '')
    print(cmd)
except Exception:
    pass
" 2>/dev/null || true)

# Only log if a command was extracted
if [ -n "$CMD" ]; then
    mkdir -p "$EVIDENCE_DIR"
    TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || python3 -c "
from datetime import datetime, timezone
print(datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))
")
    echo "[$TIMESTAMP] $CMD" >> "$LOG_FILE"
fi

exit 0

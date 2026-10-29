#!/bin/bash
# Validates opinion piece character count is near target (~3500 characters).
# Usage: check-char-count.sh <yaml-file>

FILE="$1"
if [ -z "$FILE" ]; then
  echo "Usage: check-char-count.sh <yaml-file>"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "FAIL: File not found: $FILE"
  exit 1
fi

# Extract content field (everything after "content: |-" until next top-level key or EOF)
CONTENT=$(sed -n '/^content: |-/,/^[a-zA-Z]/{ /^content: |-/d; /^[a-zA-Z]/d; p; }' "$FILE")

if [ -z "$CONTENT" ]; then
  echo "FAIL: No content field found in $FILE"
  exit 1
fi

CHAR_COUNT=$(echo "$CONTENT" | wc -m | tr -d ' ')

if [ "$CHAR_COUNT" -lt 3000 ]; then
  echo "WARN: $CHAR_COUNT characters (target: ~3500). Too short by $((3000 - CHAR_COUNT)) characters."
  exit 1
elif [ "$CHAR_COUNT" -gt 4000 ]; then
  echo "WARN: $CHAR_COUNT characters (target: ~3500). Too long by $((CHAR_COUNT - 4000)) characters."
  exit 1
else
  echo "PASS: $CHAR_COUNT characters (target: ~3500)"
fi

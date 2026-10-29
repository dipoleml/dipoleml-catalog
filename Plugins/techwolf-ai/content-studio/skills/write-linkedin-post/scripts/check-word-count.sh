#!/bin/bash
# Validates LinkedIn post word count is within target range (150-250 words).
# Usage: check-word-count.sh <yaml-file>

FILE="$1"
if [ -z "$FILE" ]; then
  echo "Usage: check-word-count.sh <yaml-file>"
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

WORD_COUNT=$(echo "$CONTENT" | wc -w | tr -d ' ')

if [ "$WORD_COUNT" -lt 150 ]; then
  echo "WARN: $WORD_COUNT words (target: 150-250). Too short by $((150 - WORD_COUNT)) words."
  exit 1
elif [ "$WORD_COUNT" -gt 250 ]; then
  echo "WARN: $WORD_COUNT words (target: 150-250). Too long by $((WORD_COUNT - 250)) words."
  exit 1
else
  echo "PASS: $WORD_COUNT words (target: 150-250)"
fi

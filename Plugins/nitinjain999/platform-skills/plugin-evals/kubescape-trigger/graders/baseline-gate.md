---
# Gates PRs on new findings only (existing debt must not fail them).
type: regex
weight: 1
target: last_message
pattern: '--baseline(-fail-on-new)?\b'
flags: i
---

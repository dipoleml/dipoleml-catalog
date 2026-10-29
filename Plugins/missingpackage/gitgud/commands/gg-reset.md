---
description: Reset GitGud counter, stats, or all data
argument-hint: [counter|stats|all]
allowed-tools: Bash(node:*)
---

# Reset Tool

Reset various GitGud data:

- `counter` - Reset only the request counter
- `stats` - Reset statistics (keeps achievements)
- `all` - Reset everything (counter, stats, achievements, streak)

Script output:
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/reset.js" $ARGUMENTS`

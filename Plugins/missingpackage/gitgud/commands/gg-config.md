---
description: View or change GitGud configuration
argument-hint: [setting] [value]
allowed-tools: Bash(node:*)
---

# Configuration

View and modify GitGud settings.

## Usage

```
/gg-config                    # Show current configuration
/gg-config <setting> <value>  # Change a setting
```

## Examples

```
/gg-config frequency 15       # Set task frequency to every 15 requests
/gg-config daily_skips 5      # Allow 5 skips per day
/gg-config difficulty hard    # Set difficulty to hard
/gg-config enabled false      # Disable the plugin
```

Script output:
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/config.js" $ARGUMENTS`

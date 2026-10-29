---
description: Generate and open an interactive visualization of Buddy guard-mode reasoning data using the Buddy CLI.
---

Run the Buddy graph CLI to visualize the reasoning graph.

If `$ARGUMENTS` is present, treat it as optional CLI arguments such as a session ID or `--out` path.

```bash
set -euo pipefail

args=()
if [ -n "${ARGUMENTS:-}" ]; then
  read -r -a args <<< "$ARGUMENTS"
fi

if command -v buddy >/dev/null 2>&1; then
  buddy graph "${args[@]}" --open
else
  node dist/cli/buddy.js graph "${args[@]}" --open
fi
```

Execute the bash block above, then report the saved graph path and basic graph counts back to the user.

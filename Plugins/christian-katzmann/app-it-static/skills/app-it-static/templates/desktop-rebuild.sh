#!/bin/bash
# Refresh the served snapshot.
#
# A static launcher serves a SNAPSHOT of your build, not live source — so after
# you change code, run this to regenerate it. It runs each app's build_command
# (expensive — which is exactly why it is an explicit command and never
# automatic), then rebuilds and reinstalls the .app bundles.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="${APP_IT_PROJECT_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export APP_IT_PROJECT_ROOT="$ROOT"
CONFIG_FILE="$SCRIPT_DIR/app-it.config.json"

[ -f "$CONFIG_FILE" ] || { echo "ERROR: scripts/app-it.config.json not found." >&2; exit 1; }

# Collect unique, non-empty build commands (multiple apps may share one).
BUILD_CMDS=()
while IFS= read -r line; do
    [ -n "$line" ] && BUILD_CMDS+=("$line")
done < <(/usr/bin/python3 - "$CONFIG_FILE" <<'PY'
import json, sys
with open(sys.argv[1]) as f:
    cfg = json.load(f)
seen = []
for a in cfg.get("apps", []):
    c = (a.get("build_command") or "").strip()
    if c and c not in seen:
        seen.append(c)
for c in seen:
    print(c)
PY
)

if [ "${#BUILD_CMDS[@]}" -eq 0 ]; then
    echo "No build_command set in app-it.config.json — skipping the build step."
    echo "If your build is produced another way, run it yourself, then this script will bundle + install it."
else
    for cmd in "${BUILD_CMDS[@]}"; do
        echo "==> Building: $cmd   (in $ROOT)"
        ( cd "$ROOT" && eval "$cmd" )
    done
fi

"$SCRIPT_DIR/desktop-build.sh"
"$SCRIPT_DIR/desktop-install.sh"
echo
echo "Snapshot refreshed. The installed apps now serve the latest build."

#!/usr/bin/env bash
# Prepare a copy of @playwright/mcp@0.0.78 whose waitForCompletion does not sleep 500 ms before and after
# waiting for in-flight requests, and print the two env vars that make openJiuwen launch it.
set -euo pipefail
VERSION="${PLAYWRIGHT_MCP_VERSION:-0.0.78}"
DEST="${PW_MCP_NOSETTLE_DIR:-$HOME/.cache/s1a/pw-mcp-nosettle-$VERSION}"
if [ ! -f "$DEST/node_modules/@playwright/mcp/cli.js" ]; then
  npx -y "@playwright/mcp@$VERSION" --version >/dev/null
  PKG="$(find "$HOME/.npm/_npx" -path "*/node_modules/@playwright/mcp/package.json" \
    -exec grep -l "\"version\": \"$VERSION\"" {} + | head -1 || true)"
  [ -n "$PKG" ] || { echo "npx cache entry for @playwright/mcp@$VERSION not found" >&2; exit 1; }
  mkdir -p "$DEST" && cp -R "$(cd "$(dirname "$PKG")/../../.." && pwd)/." "$DEST"
fi
BUNDLE="$DEST/node_modules/playwright-core/lib/coreBundle.js"
python3 - "$BUNDLE" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1]); s = p.read_text()
before = "    result2 = await callback();\n    await tab2.waitForTimeout(500);\n"
after = "  if (requests2.length)\n    await tab2.waitForTimeout(500);\n"
if s.count(before) + s.count(after) == 0 and "async function waitForCompletion" in s:
    print("already patched", file=sys.stderr)
else:
    assert s.count(before) == 1 and s.count(after) == 1, "unexpected waitForCompletion shape; check the version"
    p.write_text(s.replace(before, "    result2 = await callback();\n").replace(after, ""))
    print("patched", file=sys.stderr)
PY
echo "export PLAYWRIGHT_MCP_COMMAND=node"
echo "export PLAYWRIGHT_MCP_ARGS=$DEST/node_modules/@playwright/mcp/cli.js"

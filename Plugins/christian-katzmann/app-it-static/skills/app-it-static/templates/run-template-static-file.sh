#!/bin/bash
# app-it-static launcher (file:// zero-server variant).
#
# Loads a FINISHED build straight from disk in the native Swift WebKit wrapper —
# NO server process at all, ~0 MB beyond the window itself. The lightest possible
# way to make a finished app clickable.
#
# Used ONLY when the build is confirmed file://-safe:
#   • asset paths are relative (./assets/...), not absolute (/assets/...)
#   • no client-side router that needs deep-link rewrites
#   • no fetch()/XHR of local files (file:// origin is null → CORS-blocked)
#   • no service worker (does not register on file://)
# When any of those fail, desktop-build.sh selects the static-server variant.
#
# This file is a TEMPLATE. desktop-build.sh substitutes:
#   __APP_NAME__       human display name
#   __PROJECT_ROOT__   absolute path to the repo (baked at build time)
#   __STATIC_DIR__     build output dir, relative to PROJECT_ROOT (holds index.html)
#
# The loaded bytes are a SNAPSHOT — run desktop:rebuild after changing source.

set -e

APP_NAME="__APP_NAME__"
PROJECT_ROOT="__PROJECT_ROOT__"
STATIC_DIR="__STATIC_DIR__"

INDEX="$PROJECT_ROOT/$STATIC_DIR/index.html"
HERE="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$INDEX" ]; then
    /usr/bin/osascript -e "display alert \"$APP_NAME failed to launch\" message \"Built file not found:\n$INDEX\n\nThis app loads a finished build from disk. Re-run desktop:rebuild from the repo.\""
    exit 1
fi

WRAPPER="$HERE/wrapper"
if [ ! -x "$WRAPPER" ]; then
    /usr/bin/osascript -e "display alert \"$APP_NAME failed to launch\" message \"Native wrapper missing at:\n$WRAPPER\n\nRun desktop:build to rebuild the bundle.\""
    exit 1
fi

# Build a correctly percent-encoded file:// URL. A raw "file://$INDEX" breaks when
# the repo path has a space or non-ASCII char: the wrapper's URL(string:) returns
# nil and the launch aborts. python3 (already required) encodes it via as_uri().
FILE_URL="$(/usr/bin/python3 -c 'import sys, pathlib; print(pathlib.Path(sys.argv[1]).as_uri())' "$INDEX")"

# No port, no pid-file — the wrapper loads the file:// URL directly. There is no
# server to keep warm or tear down; Cmd+Q simply closes the window.
exec "$WRAPPER" "$FILE_URL" "$APP_NAME" "" "" ""

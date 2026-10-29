#!/bin/bash
# Bump version and create git tag with semver
# Usage: scripts/bump.sh [major|minor|patch]
# Default: patch

set -euo pipefail

VERSION_FILE="VERSION"
CURRENT=$(cat "$VERSION_FILE")
BUMP="${1:-patch}"

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "Usage: $0 [major|minor|patch]"; exit 1 ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

echo "$NEW_VERSION" > "$VERSION_FILE"

# Update package.json
if command -v python3 &> /dev/null; then
  python3 -c "
import json, sys
pkg = json.load(open('package.json'))
pkg['version'] = '$NEW_VERSION'
json.dump(pkg, open('package.json', 'w'), indent=2)
"
fi

echo "Bumped $CURRENT -> $NEW_VERSION"
echo ""
echo "To release:"
echo "  git add VERSION package.json"
echo "  git commit -m 'chore: bump version to $NEW_VERSION'"
echo "  git tag v$NEW_VERSION"
echo "  git push origin main --tags"

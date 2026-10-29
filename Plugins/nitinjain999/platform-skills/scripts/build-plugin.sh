#!/usr/bin/env bash
# Assemble plugins/platform-skills/, the folder the Claude plugin directory lists,
# from the repository source.
#
# Why a separate folder: the directory scans the submitted plugin folder, and the
# repository root (website, evals, tests, docs, demo recordings: over 900 files)
# is past the 512 files it inspects, so every version was held for review. The
# folder carries only what the plugin loads or points Claude at:
#
#   .claude-plugin/plugin.json  the root manifest without `experimental`, whose
#                               eval suite (plugin-evals/) stays in the repository
#   .claude-plugin/icon.png     the listing icon
#   README.md                   scripts/plugin-readme.md with the command list
#                               generated from each skill's frontmatter
#   LICENSE, NOTICE
#   skills/ references/ agents/ assets/   in full
#   examples/                   only files that shipped content names, followed
#                               transitively (an example README that names another
#                               example pulls it in too)
#
# Edit the source, never the copy. tests/plugin-folder.sh rebuilds and compares:
# a pull request that changes the folder by anything but a rebuild fails, and so
# does a release tag whose folder is stale. Rebuild in the release PR.
#
# Usage: bash scripts/build-plugin.sh [--out <dir>]
#   --out  build into <dir> instead (tests); it must not exist yet
set -euo pipefail
export LC_ALL=C  # comm and sort must agree on one byte order

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT="$ROOT/plugins/platform-skills"
REPLACE=1
while [ $# -gt 0 ]; do
  case "$1" in
    --out) OUT="${2:?--out needs a directory}"; REPLACE=0; shift 2 ;;
    *) echo "usage: $0 [--out <dir>]" >&2; exit 2 ;;
  esac
done
if [ "$REPLACE" -eq 0 ] && [ -e "$OUT" ]; then
  echo "❌ --out $OUT already exists; give a path that does not" >&2
  exit 1
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Tracked files plus new ones that are not ignored, so a skill added but not yet
# committed still ships. --cached also lists files deleted from the work tree.
git ls-files --cached --others --exclude-standard \
  | grep -vE '^plugins/' \
  | while IFS= read -r f; do [ -f "$f" ] && printf '%s\n' "$f"; done \
  | sort -u > "$work/all"

grep -E '^(skills|references|agents|assets)/' "$work/all" > "$work/ship"
grep -E '^examples/' "$work/all" > "$work/examples" || true
cp "$work/ship" "$work/scan"

# Closure over examples/: every path a newly shipped text file names, resolved to
# the file itself or, for a directory, every file under it. A glob such as
# `examples/*` or `examples/**/*.tf` reduces to a bare `examples` and is dropped,
# or it would ship every example.
while [ -s "$work/scan" ]; do
  tr '\n' '\0' < "$work/scan" \
    | xargs -0 grep -IohE '(examples|references)/[A-Za-z0-9_./-]+' \
    | sed -E 's|[./]+$||' | grep '/' | sort -u > "$work/refs" || true
  awk 'NR == FNR { ref[$0] = 1; next }
       {
         if ($0 in ref) { print; next }
         p = $0
         while ((i = match(p, /\/[^\/]*$/)) > 0) {
           p = substr(p, 1, i - 1)
           if (p in ref) { print; next }
         }
       }' "$work/refs" "$work/examples" | sort -u | comm -23 - "$work/ship" > "$work/scan"
  sort -u "$work/ship" "$work/scan" -o "$work/ship"
done

stage="$work/plugin"
while IFS= read -r f; do
  mkdir -p "$stage/$(dirname "$f")"
  cp "$f" "$stage/$f"
done < "$work/ship"

mkdir -p "$stage/.claude-plugin"
jq 'del(.experimental)' .claude-plugin/plugin.json > "$stage/.claude-plugin/plugin.json"
cp .claude-plugin/icon.png "$stage/.claude-plugin/icon.png"
cp LICENSE NOTICE "$stage/"

# One line per slash command: the first sentence of the skill's description. The
# router skill is described in the README body, not listed as a command. Sorted
# by name: a glob orders aws-profile/ before aws/.
grep -E '^skills/[^/]+/SKILL\.md$' "$work/ship" | cut -d/ -f2 | sort | while IFS= read -r name; do
  [ "$name" = platform-skills ] && continue
  f="skills/$name/SKILL.md"
  desc="$(sed -n '2,/^---$/{s/^description:[[:space:]]*//p;}' "$f" | head -n 1)"
  desc="${desc#\"}"; desc="${desc%\"}"
  desc="$(printf '%s\n' "$desc" | sed -E 's/([.!?])[[:space:]].*$/\1/')"
  printf -- '- `/platform-skills:%s`: %s\n' "$name" "$desc"
done > "$work/commands"
awk -v list="$work/commands" '
  $0 == "<!-- commands -->" { while ((getline line < list) > 0) print line; next }
  { print }' scripts/plugin-readme.md > "$stage/README.md"

if [ "$REPLACE" -eq 1 ]; then
  rm -rf "$OUT"
  mkdir -p "$(dirname "$OUT")"
fi
mv "$stage" "$OUT"
chmod 755 "$OUT"  # mktemp -d creates 0700

count="$(find "$OUT" -type f | wc -l | tr -d ' ')"
echo "✅ built ${OUT#"$ROOT"/} ($count files)"

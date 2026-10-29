#!/usr/bin/env bash
# Validates the canonical skills/ tree.
#
# Asserts every skills/<name>/ has a SKILL.md whose frontmatter carries a
# non-empty name (matching the directory) and description, that any
# agents/openai.yaml parses as YAML, and that no skill directory has
# reappeared at the repository root.
set -uo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

failures=0
fail() { printf 'FAIL: %s\n' "$1" >&2; failures=$((failures + 1)); }

if [ ! -d skills ]; then
  fail "skills/ directory is missing"
  printf '\n%d check(s) failed\n' "$failures" >&2
  exit 1
fi

# Find a Python that can parse YAML. On Windows, `python3` is often a
# Microsoft Store stub that prints an install prompt instead of running,
# so probe each candidate by executing it rather than trusting its presence.
py=""
for candidate in python3 python py; do
  if command -v "$candidate" >/dev/null 2>&1 &&
     "$candidate" -c 'import yaml' >/dev/null 2>&1; then
    py="$candidate"
    break
  fi
done
[ -n "$py" ] || printf 'note: no Python with PyYAML found; skipping openai.yaml parse checks\n' >&2

skill_count=0

for dir in skills/*/; do
  name="$(basename "$dir")"
  skill_count=$((skill_count + 1))

  if [ ! -f "$dir/SKILL.md" ]; then
    fail "$name: missing SKILL.md"
    continue
  fi

  if [ "$(head -n 1 "$dir/SKILL.md" | tr -d '\r')" != "---" ]; then
    fail "$name: SKILL.md does not begin with '---' frontmatter"
    continue
  fi

  fm="$(awk 'NR==1 {sub(/\r$/,"")} {sub(/\r$/,"")}
             NR==1 && $0=="---" {infm=1; next}
             infm && $0=="---" {exit}
             infm {print}' "$dir/SKILL.md")"
  if [ -z "$fm" ]; then
    fail "$name: SKILL.md frontmatter block is empty or unterminated"
    continue
  fi

  fm_name="$(printf '%s\n' "$fm" | sed -n 's/^name:[[:space:]]*//p' | head -n 1)"
  fm_desc="$(printf '%s\n' "$fm" | sed -n 's/^description:[[:space:]]*//p' | head -n 1)"

  [ -n "$fm_name" ] || fail "$name: frontmatter 'name' is missing or empty"
  [ -n "$fm_desc" ] || fail "$name: frontmatter 'description' is missing or empty"
  if [ -n "$fm_name" ] && [ "$fm_name" != "$name" ]; then
    fail "$name: frontmatter name '$fm_name' does not match directory name"
  fi

  if [ -f "$dir/agents/openai.yaml" ] && [ -n "$py" ]; then
    "$py" -c 'import sys,yaml; yaml.safe_load(open(sys.argv[1]))' "$dir/agents/openai.yaml" >/dev/null 2>&1 ||
      fail "$name: agents/openai.yaml is not valid YAML"
  fi
done

[ "$skill_count" -gt 0 ] || fail "skills/ contains no skill directories"

# The duplication regression: skills must live under skills/ and nowhere else.
for dir in */; do
  name="${dir%/}"
  case "$name" in
    skills | docs | assets | scripts) continue ;;
  esac
  if [ -f "$dir/SKILL.md" ]; then
    fail "root-level skill directory '$name' must not exist; skills/ is the only tree"
  fi
done

if [ "$failures" -gt 0 ]; then
  printf '\n%d check(s) failed\n' "$failures" >&2
  exit 1
fi

printf 'OK: %d skills validated, no root-level duplicates\n' "$skill_count"

# WIP: relative markdown link check. slow on git bash / windows, not wired in yet
check_links() {
  grep -roE '\]\(([^)#]+)\)' --include='*.md' . | while IFS= read -r hit; do
    file="${hit%%:*}"
    target="${hit#*](}"; target="${target%)}"
    case "$target" in http*|mailto:*) continue ;; esac
    [ -e "$(dirname "$file")/$target" ] || fail "$file: broken link $target"
  done
}

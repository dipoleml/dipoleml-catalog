#!/usr/bin/env bash
# Copies the canonical skills/ tree into an agent's discovery directory.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./install.sh <platform> [options]

Platforms:
  codex     install to <base>/.agents/skills   (Codex discovery path)
  claude    install to <base>/.claude/skills   (Claude Code personal skills)
  gemini    install to <base>/.gemini/skills   (Gemini CLI manual install)

Options:
  --project <dir>   install into <dir> instead of your home directory
  --yes             do not prompt for confirmation
  -h, --help        show this help

Examples:
  ./install.sh codex
  ./install.sh claude --yes
  ./install.sh codex --project /path/to/your/project
EOF
}

[ $# -gt 0 ] || {
  usage >&2
  exit 1
}

platform=""
target_base=""
assume_yes=0

case "$1" in
  -h | --help)
    usage
    exit 0
    ;;
  codex | claude | gemini)
    platform="$1"
    shift
    ;;
  *)
    printf 'error: unknown platform %s\n\n' "$1" >&2
    usage >&2
    exit 1
    ;;
esac

while [ $# -gt 0 ]; do
  case "$1" in
    --project)
      [ $# -ge 2 ] || {
        printf 'error: --project requires a directory\n' >&2
        exit 1
      }
      target_base="$2"
      shift 2
      ;;
    --yes)
      assume_yes=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      printf 'error: unknown option %s\n' "$1" >&2
      exit 1
      ;;
  esac
done

repo_root="$(cd "$(dirname "$0")" && pwd)"
if [ ! -d "$repo_root/skills" ] || [ ! -f "$repo_root/gemini-extension.json" ]; then
  printf 'error: must be run from the repository root (skills/ and gemini-extension.json not found)\n' >&2
  exit 1
fi

case "$platform" in
  codex) rel=".agents/skills" ;;
  claude) rel=".claude/skills" ;;
  gemini) rel=".gemini/skills" ;;
esac

[ -n "$target_base" ] || target_base="$HOME"
dest="$target_base/$rel"
count="$(find "$repo_root/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"

printf 'Platform:    %s\n' "$platform"
printf 'Source:      %s/skills\n' "$repo_root"
printf 'Destination: %s\n' "$dest"
printf 'Skills:      %s\n\n' "$count"

if [ "$assume_yes" -ne 1 ]; then
  printf 'Proceed? [y/N] '
  read -r reply
  case "$reply" in
    y | Y | yes | YES) ;;
    *)
      printf 'Aborted.\n'
      exit 1
      ;;
  esac
fi

mkdir -p "$dest"
for dir in "$repo_root"/skills/*/; do
  name="$(basename "$dir")"
  rm -rf "$dest/$name"
  cp -R "$dir" "$dest/$name"
done

printf 'Installed %s skills to %s\n' "$count" "$dest"

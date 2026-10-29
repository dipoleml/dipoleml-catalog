#!/usr/bin/env bash
set -euo pipefail

template_root="${1:-docs/examples}"
target_root="${2:-../new-repo}"

mkdir -p "$target_root"
cp -R "$template_root" "$target_root/"
echo "Copied template from $template_root to $target_root"

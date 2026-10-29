#!/usr/bin/env bash
# install-pre-push-hook.sh — opt-in: run `make ci` before each `git push`.
#
# Run once from the repo root:
#
#     bash scripts/install-pre-push-hook.sh
#
# This writes .git/hooks/pre-push (which is not version-controlled). Repeat
# on each clone/worktree where you want the safety net. Bypass for a single
# push with `git push --no-verify`.
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
hook_path="$repo_root/.git/hooks/pre-push"

cat > "$hook_path" <<'HOOK'
#!/usr/bin/env bash
# pre-push: run `make ci` to mirror GitLab CI gates before letting the push
# go through. Bypass with `git push --no-verify`.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
echo "pre-push: running make ci (bypass with --no-verify)"
make ci
HOOK

chmod +x "$hook_path"
echo "installed: $hook_path"

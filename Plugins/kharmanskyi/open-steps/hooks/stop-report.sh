#!/usr/bin/env bash
# Stop hook. If real work landed since the session's baseline, block the stop
# (exit 2) and ask the agent for the session report; otherwise stay silent.
# The baseline normally comes from session-start.sh; with that hook off, the
# first stop records one instead and the session's first reply goes unreported.
#
# Settings (documented in the README): OPEN_STEPS_COOLDOWN (seconds between
# reports), OPEN_STEPS_MIN_FILES, OPEN_STEPS_MAX_REPOS.
# Kill switch: OPEN_STEPS_DISABLE=1.

COOLDOWN_SECONDS="${OPEN_STEPS_COOLDOWN:-900}"
MIN_FILES_CHANGED="${OPEN_STEPS_MIN_FILES:-1}"

set -uo pipefail

[ -n "${OPEN_STEPS_DISABLE:-}" ] && exit 0

# shellcheck source-path=SCRIPTDIR
# shellcheck source=fingerprint.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/fingerprint.sh"

os_session_id "$(cat 2>/dev/null || true)"
os_find_repos
[ "${#OS_REPOS[@]}" -eq 0 ] && exit 0

os_state_paths
mkdir -p "$OS_STATE_DIR" 2>/dev/null || exit 0
os_fingerprint
os_read_state
now="$(date +%s)"

# No baseline for this session yet: record one, never blame this session for
# changes that were already sitting there.
if [ "$OS_PREV_SESSION" != "$OS_SESSION" ]; then
  os_save_state "$OS_PREV_FIRED_AT"
  exit 0
fi

# Nothing changed. Reports are written outside the repositories, so producing
# one never changes the fingerprint: that is what prevents a report loop.
[ "$OS_FINGERPRINT" = "$OS_PREV_FINGERPRINT" ] && exit 0

# Too small to be worth a report.
[ "$OS_DIRTY" -lt "$MIN_FILES_CHANGED" ] && [ "$OS_HEADS" = "$OS_PREV_HEADS" ] && exit 0

# Cooldown. The fingerprint is deliberately not refreshed here: the pending
# change stays pending and the report fires once the cooldown expires.
if [ "$OS_PREV_FIRED_AT" -gt 0 ] && [ $((now - OS_PREV_FIRED_AT)) -lt "$COOLDOWN_SECONDS" ]; then
  exit 0
fi

os_save_state "$now"

# Exit 2 blocks the stop; stderr reaches the agent as the reason to continue.
{
  printf 'Work landed during this session'
  [ -n "$OS_CHANGED" ] && printf ' (changed:%s)' "$OS_CHANGED"
  cat <<'EOF'
. Before finishing, use the os-done-or-not skill to produce the session report:
plain-language lead, a checkmark table, and the verdict rows. Save it to the
reports folder. Then stop.
EOF
} >&2
exit 2

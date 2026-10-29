#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/wrangler.jsonc"

run_query() {
  local query="$1"
  local attempt

  for attempt in 1 2 3; do
    if npx --yes wrangler d1 execute cco-metrics --remote --config "$CONFIG_PATH" --command "$query"; then
      return 0
    fi

    if [[ "$attempt" -lt 3 ]]; then
      printf 'Monthly matrix query failed (attempt %s/3); retrying...\n' "$attempt" >&2
      sleep "$((attempt * 2))"
    fi
  done

  return 1
}

run_query \
  "SELECT month, COUNT(*) AS active_installations FROM monthly_active_users GROUP BY month ORDER BY month"

run_query \
  "SELECT month, app_version, COUNT(*) AS active_installations FROM monthly_active_users GROUP BY month, app_version ORDER BY month, active_installations DESC, app_version"

run_query \
  "SELECT month, harness, COUNT(*) AS active_installations FROM monthly_active_users GROUP BY month, harness ORDER BY month, active_installations DESC, harness"

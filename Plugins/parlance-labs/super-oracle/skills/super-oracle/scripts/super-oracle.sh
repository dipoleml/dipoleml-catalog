#!/usr/bin/env bash
# super-oracle.sh — run independent Claude and Codex reviews in parallel.
#
# Self-contained: works as a bundled plugin skill (Codex/Claude) or a plain skill
# (Amp). Reads a briefing from a file or stdin, writes the answer to -o OUTPUT.
# Drive it FROM your main agent (Codex/Claude/Amp). The child Claude process has
# skills disabled, and every child inherits a recursion guard.
#
# Usage:
#   super-oracle.sh -o OUTPUT.md BRIEFING.md
#   super-oracle.sh -o OUTPUT.md < BRIEFING.md
#
# Options:
#   -o OUTPUT   Where to write the oracle's answer (required).
#   -C DIR      Working directory for the oracle (default: current dir).
#   -n          Turn Claude/Codex MCP servers OFF.
#   -t          Test mode: cheap real models; never use its reviews as oracle results.
#   -m MODEL    Starting Claude model: fable or opus (default: fable).
#   -q PERCENT  Subscription usage cutoff from 1 to 100 (default: 93).
#   -y PROVIDER Synthesizer: opus or codex (default: opus).
#   -s PROVIDER Skip claude or codex (both run by default).
#   -p SECONDS  Progress heartbeat interval on stderr (default 30; 0 = off).
#   -h          Help.
#
# By default, run two independent reviewers in parallel: Claude Fable at xhigh effort
# while its included quota has safe headroom, otherwise latest Claude Opus at xhigh,
# Codex gpt-6-astra at xhigh on the fast service tier. Enabled children run
# unattended with permission checks bypassed, so use this script only in a
# trusted working directory.
#
# Output: Claude emits JSON event streams and Codex emits its final message to
# stdout. The script runs independent reviews, one cross-pollination refinement,
# and one synthesis. It writes the synthesis to -o; all source reports remain durable.
# Supporting files are
# allowed only under backend-specific subdirectories of
# SUPER_ORACLE_ARTIFACTS_DIR (default: OUTPUT.artifacts). A run succeeds only
# when synthesis succeeds. A reviewer failure degrades coverage but does not discard
# other usable reports.
#
# Isolation: Claude uses --no-session-persistence and --disable-slash-commands.
# Agent and Workflow tools remain available. The prompt permits useful subagents
# but rejects automatic fan-out. SUPER_ORACLE_ACTIVE blocks a nested wrapper call.
# Pass -n to ignore configured MCP servers for enabled Claude/Codex children.
#
# Progress: hard reviews can take minutes, so the script prints a heartbeat to
# stderr every SUPER_ORACLE_PROGRESS_INTERVAL seconds (default 30; -p overrides;
# 0 disables), plus startup and completion lines. The first beat comes within
# ~15s even with a longer interval. Progress never touches the -o answer.
set -euo pipefail

collapse_leading_slashes() {
  local value="$1"
  while [ "${value#//}" != "$value" ]; do value="${value#/}"; done
  printf '%s\n' "$value"
}

directory_contains_existing_path() {
  local root="$1" target="$2" cursor parent
  [ -d "$root" ] || return 1
  if [ -d "$target" ]; then cursor="$target"; else cursor="$(dirname "$target")"; fi
  while [ -d "$cursor" ]; do
    [ "$root" -ef "$cursor" ] && return 0
    parent="$(dirname "$cursor")"
    [ "$parent" != "$cursor" ] || break
    cursor="$parent"
  done
  return 1
}

SCRIPT_DIR="$(collapse_leading_slashes "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)")"
REVIEW_PRINCIPLES="$SCRIPT_DIR/../reference/code-review-principles.md"
CLAUDE_MODEL="fable"; CLAUDE_EFFORT="xhigh"; CLAUDE_DEBUG_PATTERN="dispatching to firstParty model=claude-fable-"
CLAUDE_REVIEWER="Claude Fable"
FABLE_MODEL="fable"; FABLE_REVIEWER="Claude Fable"; FABLE_DEBUG_PATTERN="dispatching to firstParty model=claude-fable-"
OPUS_MODEL="opus"; OPUS_REVIEWER="Claude Opus (latest)"; OPUS_DEBUG_PATTERN="dispatching to firstParty model=claude-opus-"
QUOTA_CUTOFF=93
QUOTA_POLL_INTERVAL="${SUPER_ORACLE_QUOTA_POLL_INTERVAL:-300}"
QUOTA_FETCH_TIMEOUT="${SUPER_ORACLE_QUOTA_FETCH_TIMEOUT:-30}"
CODEX_MODEL="gpt-6-astra"; CODEX_EFFORT="xhigh"; CODEX_SERVICE_TIER="fast"
# Keep this provider-selector list aligned with Claude Code's provider resolver.
CLAUDE_SAFE_SETTINGS='{"disableWorkflows":false,"apiKeyHelper":"","env":{"ANTHROPIC_API_KEY":"","ANTHROPIC_AUTH_TOKEN":"","ANTHROPIC_BASE_URL":"","ANTHROPIC_CUSTOM_HEADERS":"","CLAUDE_CODE_OAUTH_TOKEN":"","CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR":"","CLAUDE_SECURESTORAGE_CONFIG_DIR":"","CLAUDE_CODE_EFFORT_LEVEL":"","CLAUDE_CODE_DISABLE_WORKFLOWS":"","CLAUDE_CODE_USE_BEDROCK":"","CLAUDE_CODE_USE_VERTEX":"","CLAUDE_CODE_USE_FOUNDRY":"","CLAUDE_CODE_USE_MANTLE":"","CLAUDE_CODE_USE_ANTHROPIC_AWS":"","CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD":""}}'
OUTPUT=""; WORKDIR=""; DISABLE_MCP=0; TEST_MODE=0; DEBUG_FILE=""; DEBUG_FILE_OWNED=0; DEGRADED_PRE=0
CLAUDE_MODEL_EXPLICIT=0
SYNTH_PROVIDER="opus"; SYNTH_EXPLICIT=0
RUN_CLAUDE=1; RUN_CODEX=1; PROVIDER_COUNT=2
PROGRESS_INTERVAL="${SUPER_ORACLE_PROGRESS_INTERVAL:-30}"
HB_PID=""; CLAUDE_PID=""; CODEX_PID=""; QUOTA_PID=""; CLAUDE_ATTEMPT_OUTCOME=""

# Print the leading comment block as help. This stays correct as the header grows.
usage() { awk 'NR>=2 && /^#/{sub(/^# ?/,""); print; next} NR>=2{exit}' "${BASH_SOURCE[0]}"; exit "${1:-0}"; }

while getopts ":o:C:p:q:m:y:s:nth" opt; do
  case "$opt" in
    o) OUTPUT="$OPTARG" ;; C) WORKDIR="$OPTARG" ;;
    p) PROGRESS_INTERVAL="$OPTARG" ;;
    q) QUOTA_CUTOFF="$OPTARG" ;;
    m) CLAUDE_MODEL="$OPTARG"; CLAUDE_MODEL_EXPLICIT=1 ;;
    y) SYNTH_PROVIDER="$OPTARG"; SYNTH_EXPLICIT=1 ;;
    s)
      case "$OPTARG" in
        claude) RUN_CLAUDE=0 ;;
        codex) RUN_CODEX=0 ;;
        *) echo "ERROR: provider to skip must be claude or codex" >&2; exit 2 ;;
      esac
      ;;
    n) DISABLE_MCP=1 ;; t) TEST_MODE=1 ;; h) usage 0 ;;
    \?) echo "Unknown option: -$OPTARG" >&2; usage 1 ;;
    :) echo "Option -$OPTARG requires an argument" >&2; usage 1 ;;
  esac
done
shift $((OPTIND - 1))

case "$PROGRESS_INTERVAL" in
  ''|*[!0-9]*) echo "ERROR: progress interval must be a non-negative integer (seconds)" >&2; exit 2 ;;
esac
[ "${#PROGRESS_INTERVAL}" -le 9 ] || { echo "ERROR: progress interval too large" >&2; exit 2; }
case "$QUOTA_CUTOFF" in
  ''|*[!0-9]*) echo "ERROR: quota cutoff must be an integer from 1 to 100 percent" >&2; exit 2 ;;
esac
[ "$QUOTA_CUTOFF" -ge 1 ] && [ "$QUOTA_CUTOFF" -le 100 ] || {
  echo "ERROR: quota cutoff must be from 1 to 100 percent" >&2; exit 2; }
case "$QUOTA_POLL_INTERVAL" in
  ''|*[!0-9]*) echo "ERROR: quota poll interval must be an integer from 1 to 300 seconds" >&2; exit 2 ;;
esac
[ "$QUOTA_POLL_INTERVAL" -ge 1 ] && [ "$QUOTA_POLL_INTERVAL" -le 300 ] || {
  echo "ERROR: quota poll interval must be from 1 to 300 seconds" >&2; exit 2; }
case "$QUOTA_FETCH_TIMEOUT" in
  ''|*[!0-9]*) echo "ERROR: quota fetch timeout must be an integer from 1 to 30 seconds" >&2; exit 2 ;;
esac
[ "$QUOTA_FETCH_TIMEOUT" -ge 1 ] && [ "$QUOTA_FETCH_TIMEOUT" -le 30 ] || {
  echo "ERROR: quota fetch timeout must be from 1 to 30 seconds" >&2; exit 2; }
[ -z "$OUTPUT" ] && { echo "ERROR: -o OUTPUT is required" >&2; usage 1; }
PROVIDER_COUNT=$((RUN_CLAUDE + RUN_CODEX))
[ "$PROVIDER_COUNT" -gt 0 ] || {
  echo "ERROR: cannot skip Claude and Codex" >&2; exit 2; }
[ "$RUN_CLAUDE" -eq 1 ] || [ "$CLAUDE_MODEL_EXPLICIT" -eq 0 ] || {
  echo "ERROR: -m cannot be used when Claude is skipped" >&2; exit 2; }

case "$CLAUDE_MODEL" in
  "$FABLE_MODEL") CLAUDE_REVIEWER="$FABLE_REVIEWER"; CLAUDE_DEBUG_PATTERN="$FABLE_DEBUG_PATTERN" ;;
  "$OPUS_MODEL") CLAUDE_REVIEWER="$OPUS_REVIEWER"; CLAUDE_DEBUG_PATTERN="$OPUS_DEBUG_PATTERN" ;;
  *) echo "ERROR: Claude model must be fable or opus" >&2; exit 2 ;;
esac
case "$SYNTH_PROVIDER" in
  opus|codex) ;;
  *) echo "ERROR: synthesizer must be opus or codex" >&2; exit 2 ;;
esac
if [ "$SYNTH_EXPLICIT" -eq 1 ]; then
  case "$SYNTH_PROVIDER" in
    opus) [ "$RUN_CLAUDE" -eq 1 ] || { echo "ERROR: -y opus cannot be used when Claude is skipped" >&2; exit 2; } ;;
    codex) [ "$RUN_CODEX" -eq 1 ] || { echo "ERROR: -y codex cannot be used when Codex is skipped" >&2; exit 2; } ;;
  esac
fi

if [ "$TEST_MODE" -eq 1 ]; then
  [ "$CLAUDE_MODEL_EXPLICIT" -eq 0 ] || {
    echo "ERROR: -m cannot be combined with test mode" >&2; exit 2; }
  CLAUDE_MODEL="haiku"; CLAUDE_EFFORT="low"; CLAUDE_DEBUG_PATTERN="dispatching to firstParty model=claude-haiku"
  CLAUDE_REVIEWER="Claude Haiku"
  CODEX_MODEL="gpt-5.4-mini"; CODEX_EFFORT="low"; CODEX_SERVICE_TIER=""
fi
if [ "$PROVIDER_COUNT" -gt 1 ]; then PROVIDER_LABEL="parallel oracle reviews"
elif [ "$RUN_CLAUDE" -eq 1 ]; then PROVIDER_LABEL="Claude review"
else PROVIDER_LABEL="Codex review"
fi

if [ "${SUPER_ORACLE_ACTIVE:-0}" = "1" ]; then
  echo "ERROR: refusing a recursive super-oracle invocation" >&2; exit 2
fi
export SUPER_ORACLE_ACTIVE=1

# Normalize paths before changing directory. Relative -o remains caller-relative.
ORIGPWD="$(collapse_leading_slashes "$(pwd -P)")"
case "$OUTPUT" in /*) ;; *) OUTPUT="$ORIGPWD/$OUTPUT" ;; esac
OUTPUT="$(collapse_leading_slashes "$OUTPUT")"
OUTDIR="$(dirname "$OUTPUT")"
[ -d "$OUTDIR" ] || { echo "ERROR: output directory not found: $OUTDIR" >&2; exit 1; }
OUTDIR="$(cd -P "$OUTDIR" && pwd)"
OUTPUT="$OUTDIR/$(basename "$OUTPUT")"
[ ! -L "$OUTPUT" ] || { echo "ERROR: output must not be a symbolic link: $OUTPUT" >&2; exit 1; }
RUNNING_SCRIPT="$SCRIPT_DIR/$(basename "${BASH_SOURCE[0]}")"
for INSTALLED_INPUT in "$RUNNING_SCRIPT" "$REVIEW_PRINCIPLES"; do
  if [ "$OUTPUT" = "$INSTALLED_INPUT" ] || \
    { [ -e "$OUTPUT" ] && [ "$OUTPUT" -ef "$INSTALLED_INPUT" ]; }; then
    echo "ERROR: output must not overwrite an installed skill input: $INSTALLED_INPUT" >&2
    exit 1
  fi
done

if [ -n "$WORKDIR" ]; then
  case "$WORKDIR" in /*) ;; *) WORKDIR="$ORIGPWD/$WORKDIR" ;; esac
  WORKDIR="$(collapse_leading_slashes "$WORKDIR")"
  WORKDIR="${WORKDIR%/}"
  [ -d "$WORKDIR" ] || { echo "ERROR: -C directory not found: $WORKDIR" >&2; exit 1; }
  WORKDIR="$(cd -P "$WORKDIR" && pwd)"
fi

[ "$#" -le 1 ] || { echo "ERROR: expected at most one briefing file" >&2; usage 1; }
BRIEFING_SRC=""
if [ "$#" -ge 1 ] && [ "$1" != "-" ]; then
  BRIEFING_SRC="$1"
  case "$BRIEFING_SRC" in /*) ;; *) BRIEFING_SRC="$ORIGPWD/$BRIEFING_SRC" ;; esac
  BRIEFING_SRC="$(collapse_leading_slashes "$BRIEFING_SRC")"
  BRIEFING_DIR="$(dirname "$BRIEFING_SRC")"
  [ -d "$BRIEFING_DIR" ] || { echo "ERROR: briefing directory not found: $BRIEFING_DIR" >&2; exit 1; }
  BRIEFING_SRC="$(cd -P "$BRIEFING_DIR" && pwd)/$(basename "$BRIEFING_SRC")"
  [ ! -L "$BRIEFING_SRC" ] || { echo "ERROR: briefing must not be a symbolic link: $BRIEFING_SRC" >&2; exit 1; }
  [ -f "$BRIEFING_SRC" ] || { echo "ERROR: briefing not found: $BRIEFING_SRC" >&2; exit 1; }
  if [ -e "$OUTPUT" ] && [ "$OUTPUT" -ef "$BRIEFING_SRC" ]; then
    echo "ERROR: output must not be the same file as the briefing" >&2; exit 1
  fi
fi

# Clear stale output before any failure-prone setup so it cannot look successful.
: > "$OUTPUT" || { echo "ERROR: cannot write output: $OUTPUT" >&2; exit 1; }

if [ "$RUN_CLAUDE" -eq 1 ] && ! command -v claude >/dev/null 2>&1; then
  echo ">> super-oracle: WARNING: claude is not installed; skipping the Claude reviewer" >&2
  RUN_CLAUDE=0; DEGRADED_PRE=1
fi
if [ "$RUN_CODEX" -eq 1 ] && ! command -v codex >/dev/null 2>&1; then
  echo ">> super-oracle: WARNING: codex is not installed; skipping the Codex reviewer" >&2
  RUN_CODEX=0; DEGRADED_PRE=1
fi
PROVIDER_COUNT=$((RUN_CLAUDE + RUN_CODEX))
[ "$PROVIDER_COUNT" -gt 0 ] || {
  echo "ERROR: no enabled reviewer CLI is installed (need claude or codex)" >&2; exit 127; }
SYNTH_AVAILABLE=1
case "$SYNTH_PROVIDER" in
  opus) [ "$RUN_CLAUDE" -eq 1 ] || SYNTH_AVAILABLE=0 ;;
  codex) [ "$RUN_CODEX" -eq 1 ] || SYNTH_AVAILABLE=0 ;;
esac
if [ "$SYNTH_AVAILABLE" -eq 0 ] && [ "$SYNTH_EXPLICIT" -eq 1 ]; then
  echo "ERROR: explicitly selected $SYNTH_PROVIDER synthesizer is unavailable" >&2
  exit 127
fi
if [ "$SYNTH_AVAILABLE" -eq 0 ]; then
  if [ "$RUN_CODEX" -eq 1 ]; then SYNTH_PROVIDER="codex"
  else SYNTH_PROVIDER="opus"
  fi
  echo ">> super-oracle: WARNING: default Opus synthesizer is unavailable; using $SYNTH_PROVIDER" >&2
fi
if [ "$PROVIDER_COUNT" -gt 1 ]; then PROVIDER_LABEL="parallel oracle reviews"
elif [ "$RUN_CLAUDE" -eq 1 ]; then PROVIDER_LABEL="Claude review"
else PROVIDER_LABEL="Codex review"
fi
[ -f "$REVIEW_PRINCIPLES" ] || {
  echo "ERROR: vendored review principles not found: $REVIEW_PRINCIPLES" >&2; exit 1; }
if [ "$RUN_CLAUDE" -eq 1 ] && ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required to capture Claude reviews; no model call was made" >&2; exit 127
fi

# Super Oracle is intentionally subscription-backed. An inherited Anthropic API
# key takes precedence over Claude's OAuth session and bills API credits instead
# of the user's Claude plan. Remove that override before every Claude command,
# then fail closed unless Claude reports first-party OAuth authentication.
if [ "$RUN_CLAUDE" -eq 1 ]; then
  unset ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN ANTHROPIC_BASE_URL ANTHROPIC_CUSTOM_HEADERS
  unset CLAUDE_CODE_OAUTH_TOKEN CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR
  if [ -n "${CLAUDE_CONFIG_DIR:-}" ] || [ -n "${CLAUDE_SECURESTORAGE_CONFIG_DIR:-}" ]; then
    echo "ERROR: Claude profile-directory overrides are unsupported because quota and reviewer credentials must use the same subscription; unset CLAUDE_CONFIG_DIR and CLAUDE_SECURESTORAGE_CONFIG_DIR" >&2
    exit 1
  fi
  unset CLAUDE_CONFIG_DIR CLAUDE_SECURESTORAGE_CONFIG_DIR
  CLAUDE_AUTH_STATUS="$(claude auth status 2>/dev/null)" || {
    echo "ERROR: Claude subscription authentication is required; run 'claude auth login'" >&2
    exit 1
  }
  if ! grep -Eq '"loggedIn"[[:space:]]*:[[:space:]]*true' <<<"$CLAUDE_AUTH_STATUS" ||
    ! grep -Eq '"authMethod"[[:space:]]*:[[:space:]]*"(oauth_token|claude\.ai)"' <<<"$CLAUDE_AUTH_STATUS" ||
    ! grep -Eq '"apiProvider"[[:space:]]*:[[:space:]]*"firstParty"' <<<"$CLAUDE_AUTH_STATUS" ||
    grep -Eq '"apiKeySource"[[:space:]]*:' <<<"$CLAUDE_AUTH_STATUS"; then
    echo "ERROR: Super Oracle requires a first-party Claude subscription session; API-key auth is disabled" >&2
    exit 1
  fi
fi

# Claude's subscription usage endpoint exposes the current session, all-model,
# and model-scoped weekly pools. Read the existing OAuth credential only through
# a pipe: never print it, put it in argv, or write it to disk. The response is
# reduced to four integer percentages in memory. Any lookup/schema failure is
# fail-closed, because guessing could turn a long review into paid extra usage.
read_claude_credentials() {
  local credential_file service account
  if command -v security >/dev/null 2>&1; then
    service="Claude Code-credentials"
    account="${USER:-$(id -un)}"
    if security find-generic-password -a "$account" -w -s "$service"; then
      return 0
    fi
  fi
  [ -n "${HOME:-}" ] || return 1
  credential_file="$HOME/.claude/.credentials.json"
  [ -r "$credential_file" ] || return 1
  cat "$credential_file"
}

fetch_quota_percentages() {
  {
    printf '%s\n' 'silent' 'show-error' 'fail' 'connect-timeout = 5' 'max-time = 10' \
      'retry = 3' 'retry-max-time = 20' 'retry-all-errors'
    read_claude_credentials |
      jq -er '"header = \"Authorization: Bearer " + .claudeAiOauth.accessToken + "\""'
  } | curl -q --config - -H 'User-Agent: claude-code' \
    'https://api.anthropic.com/api/oauth/usage' |
    jq -er '
      def max_percent($kind; $model):
        [
          .limits[]?
          | select(.kind == $kind)
          | select(
              if $model == null then true
              else ((.scope.model.display_name? // "") | ascii_downcase | startswith($model))
              end
            )
          | .percent
          | select(type == "number")
        ] | max;
      (max_percent("session"; null) // .five_hour.utilization) as $session
      | (max_percent("weekly_all"; null) // .seven_day.utilization) as $all
      | (max_percent("weekly_scoped"; "fable") // -1) as $fable
      | (max_percent("weekly_scoped"; "opus") //
          .seven_day_opus.utilization // -1) as $opus
      | if ($session | type) != "number" or ($all | type) != "number" or
           ($fable | type) != "number" or ($opus | type) != "number"
        then error("missing subscription quota percentages")
        else [($session | floor), ($all | floor), ($fable | floor),
              ($opus | floor)] | @tsv
        end'
}

load_quota_state() {
  local quota_state="$1"
  QUOTA_STATE="$quota_state"
  [ "$(awk -F '\t' '{ print NF }' <<<"$QUOTA_STATE")" -eq 4 ] || return 1
  IFS=$'\t' read -r SESSION_PERCENT ALL_PERCENT FABLE_PERCENT OPUS_PERCENT <<<"$QUOTA_STATE"
}

if [ "$RUN_CLAUDE" -eq 1 ] && [ "$TEST_MODE" -eq 0 ]; then
  command -v curl >/dev/null 2>&1 || {
    echo "ERROR: curl is required for the subscription quota safety check; no Claude model call was made" >&2; exit 127; }
fi
command -v pgrep >/dev/null 2>&1 || {
  echo "ERROR: pgrep is required to reap provider process trees; no model call was made" >&2; exit 127; }

# Inherited Claude controls can override the fixed profile. Fail closed instead
# of claiming Workflow availability or xhigh while running another profile.
if [ "$RUN_CLAUDE" -eq 1 ] && [ -n "${CLAUDE_CODE_DISABLE_WORKFLOWS:-}" ]; then
  echo "ERROR: CLAUDE_CODE_DISABLE_WORKFLOWS would override Workflow availability; unset it before invoking super-oracle" >&2
  exit 1
fi
if [ "$RUN_CLAUDE" -eq 1 ] && [ -n "${CLAUDE_CODE_EFFORT_LEVEL:-}" ]; then
  echo "ERROR: CLAUDE_CODE_EFFORT_LEVEL would override $CLAUDE_EFFORT; unset it before invoking super-oracle" >&2
  exit 1
fi

# --- Artifacts directory ---------------------------------------------------
# This directory is owned by the run and therefore may be cleared. Refuse any
# existing unmarked or obviously dangerous path before rm -rf.
ARTIFACTS_DIR="${SUPER_ORACLE_ARTIFACTS_DIR:-$OUTPUT.artifacts}"
case "$ARTIFACTS_DIR" in /*) ;; *) ARTIFACTS_DIR="$ORIGPWD/$ARTIFACTS_DIR" ;; esac
ARTIFACTS_DIR="$(collapse_leading_slashes "$ARTIFACTS_DIR")"
ARTIFACTS_DIR="${ARTIFACTS_DIR%/}"
[ -n "$ARTIFACTS_DIR" ] || { echo "ERROR: refusing artifacts dir '/'" >&2; exit 1; }
ARTIFACTS_BASENAME="$(basename "$ARTIFACTS_DIR")"
case "$ARTIFACTS_BASENAME" in
  .|..) echo "ERROR: artifacts dir must not end in '$ARTIFACTS_BASENAME'" >&2; exit 1 ;;
esac
ARTIFACTS_PARENT="$(dirname "$ARTIFACTS_DIR")"
[ -d "$ARTIFACTS_PARENT" ] || { echo "ERROR: artifacts parent directory not found: $ARTIFACTS_PARENT" >&2; exit 1; }
ARTIFACTS_DIR="$(cd -P "$ARTIFACTS_PARENT" && pwd)/$ARTIFACTS_BASENAME"
[ ! -L "$ARTIFACTS_DIR" ] || { echo "ERROR: artifacts dir must not be a symbolic link: $ARTIFACTS_DIR" >&2; exit 1; }
if [ -d "$ARTIFACTS_DIR" ]; then
  ARTIFACTS_DIR="$(collapse_leading_slashes "$(cd -P "$ARTIFACTS_DIR" && pwd)")"
fi
OWN_MARKER=".super-oracle-owned"
case "$ARTIFACTS_DIR" in
  "" | "/" | "$HOME" | "$ORIGPWD" | "$WORKDIR" | "$OUTPUT")
    echo "ERROR: refusing to use artifacts dir '$ARTIFACTS_DIR' (unsafe: would delete a path the oracle doesn't own). Set SUPER_ORACLE_ARTIFACTS_DIR to a dedicated path." >&2; exit 1 ;;
esac
HOME_PHYSICAL="$(collapse_leading_slashes "$(cd -P "$HOME" && pwd)")"
for PROTECTED_DIR in "$HOME_PHYSICAL" "$ORIGPWD" "$WORKDIR" "$SCRIPT_DIR"; do
  [ -n "$PROTECTED_DIR" ] || continue
  case "$PROTECTED_DIR" in
    "$ARTIFACTS_DIR"|"$ARTIFACTS_DIR"/*)
      echo "ERROR: refusing artifacts dir '$ARTIFACTS_DIR' because it contains protected directory: $PROTECTED_DIR" >&2
      exit 1
      ;;
  esac
  if directory_contains_existing_path "$ARTIFACTS_DIR" "$PROTECTED_DIR"; then
    echo "ERROR: refusing artifacts dir '$ARTIFACTS_DIR' because it contains protected directory: $PROTECTED_DIR" >&2
    exit 1
  fi
done
for INSTALLED_INPUT in "$RUNNING_SCRIPT" "$REVIEW_PRINCIPLES"; do
  if directory_contains_existing_path "$ARTIFACTS_DIR" "$INSTALLED_INPUT"; then
    echo "ERROR: refusing artifacts dir '$ARTIFACTS_DIR' because it contains installed skill input: $INSTALLED_INPUT" >&2
    exit 1
  fi
done
if directory_contains_existing_path "$ARTIFACTS_DIR" "$OUTPUT"; then
  echo "ERROR: output must not be inside the run-owned artifacts dir: $ARTIFACTS_DIR" >&2
  exit 1
fi
if [ -n "$BRIEFING_SRC" ]; then
  if directory_contains_existing_path "$ARTIFACTS_DIR" "$BRIEFING_SRC"; then
    echo "ERROR: briefing must not be inside the run-owned artifacts dir: $ARTIFACTS_DIR" >&2
    exit 1
  fi
fi
if [ -e "$ARTIFACTS_DIR" ] && [ ! -e "$ARTIFACTS_DIR/$OWN_MARKER" ]; then
  echo "ERROR: artifacts dir '$ARTIFACTS_DIR' already exists and isn't owned by super-oracle; refusing to delete it. Point SUPER_ORACLE_ARTIFACTS_DIR at a fresh path." >&2; exit 1
fi
rm -rf "$ARTIFACTS_DIR" || { echo "ERROR: cannot clear artifacts dir: $ARTIFACTS_DIR" >&2; exit 1; }
mkdir -p "$ARTIFACTS_DIR" || { echo "ERROR: cannot create artifacts dir: $ARTIFACTS_DIR" >&2; exit 1; }
: > "$ARTIFACTS_DIR/$OWN_MARKER"
[ -z "$BRIEFING_SRC" ] || [ -f "$BRIEFING_SRC" ] || {
  echo "ERROR: briefing disappeared during artifacts setup: $BRIEFING_SRC" >&2; exit 1; }
[ -f "$REVIEW_PRINCIPLES" ] || {
  echo "ERROR: vendored review principles disappeared during artifacts setup: $REVIEW_PRINCIPLES" >&2; exit 1; }
CLAUDE_ARTIFACTS_DIR="$ARTIFACTS_DIR/claude"
CODEX_ARTIFACTS_DIR="$ARTIFACTS_DIR/codex"
REVIEWS_DIR="$ARTIFACTS_DIR/reviews"
LOGS_DIR="$ARTIFACTS_DIR/logs"
CLAUDE_REVIEW="$REVIEWS_DIR/claude.md"
CODEX_REVIEW="$REVIEWS_DIR/codex-gpt-6-astra.md"
CLAUDE_CHECKPOINT="$REVIEWS_DIR/claude.partial.md"
CLAUDE_FABLE_CHECKPOINT="$REVIEWS_DIR/claude.fable.partial.md"
CODEX_CHECKPOINT="$REVIEWS_DIR/codex-gpt-6-astra.partial.md"
CLAUDE_REFINED_REVIEW="$REVIEWS_DIR/claude.refined.md"
CODEX_REFINED_REVIEW="$REVIEWS_DIR/codex-gpt-6-astra.refined.md"
CLAUDE_REFINED_CHECKPOINT="$REVIEWS_DIR/claude.refined.partial.md"
CLAUDE_REFINED_FABLE_CHECKPOINT="$REVIEWS_DIR/claude.refined.fable.partial.md"
CODEX_REFINED_CHECKPOINT="$REVIEWS_DIR/codex-gpt-6-astra.refined.partial.md"
SYNTHESIS_REVIEW="$REVIEWS_DIR/synthesis.md"
SYNTHESIS_CHECKPOINT="$REVIEWS_DIR/synthesis.partial.md"
SYNTHESIS_FABLE_CHECKPOINT="$REVIEWS_DIR/synthesis.fable.partial.md"
if [ "$TEST_MODE" -eq 1 ]; then
  CODEX_REVIEW="$REVIEWS_DIR/codex-gpt-5.4-mini.md"
  CODEX_CHECKPOINT="$REVIEWS_DIR/codex-gpt-5.4-mini.partial.md"
  CODEX_REFINED_REVIEW="$REVIEWS_DIR/codex-gpt-5.4-mini.refined.md"
  CODEX_REFINED_CHECKPOINT="$REVIEWS_DIR/codex-gpt-5.4-mini.refined.partial.md"
fi
CLAUDE_STDERR="$LOGS_DIR/claude.stderr.log"
CODEX_STDERR="$LOGS_DIR/codex.stderr.log"
CODEX_PROMPT="$LOGS_DIR/codex.prompt.md"
CLAUDE_STREAM="$LOGS_DIR/claude.stream.jsonl"
CLAUDE_PROMPT="$LOGS_DIR/claude.prompt.md"
CLAUDE_MODEL_STATE="$LOGS_DIR/claude.model"
CLAUDE_QUOTA_SAMPLE="$LOGS_DIR/claude.quota.tsv"
mkdir -p "$REVIEWS_DIR" "$LOGS_DIR" || {
  echo "ERROR: cannot create backend artifact directories under: $ARTIFACTS_DIR" >&2; exit 1; }
if [ "$RUN_CLAUDE" -eq 1 ]; then
  mkdir -p "$CLAUDE_ARTIFACTS_DIR" || { echo "ERROR: cannot create Claude artifacts dir: $CLAUDE_ARTIFACTS_DIR" >&2; exit 1; }
  : > "$CLAUDE_REVIEW" || { echo "ERROR: cannot create Claude review file: $CLAUDE_REVIEW" >&2; exit 1; }
  : > "$CLAUDE_CHECKPOINT" || { echo "ERROR: cannot create Claude checkpoint: $CLAUDE_CHECKPOINT" >&2; exit 1; }
  : > "$CLAUDE_STDERR" || { echo "ERROR: cannot create Claude stderr log: $CLAUDE_STDERR" >&2; exit 1; }
  : > "$CLAUDE_STREAM" || { echo "ERROR: cannot create Claude stream log: $CLAUDE_STREAM" >&2; exit 1; }
  : > "$CLAUDE_PROMPT" || { echo "ERROR: cannot create Claude prompt buffer: $CLAUDE_PROMPT" >&2; exit 1; }
  : > "$CLAUDE_MODEL_STATE" || { echo "ERROR: cannot create Claude model state: $CLAUDE_MODEL_STATE" >&2; exit 1; }
  : > "$CLAUDE_QUOTA_SAMPLE" || { echo "ERROR: cannot create Claude quota sample: $CLAUDE_QUOTA_SAMPLE" >&2; exit 1; }
  : > "$CLAUDE_REFINED_REVIEW" || { echo "ERROR: cannot create Claude refined review: $CLAUDE_REFINED_REVIEW" >&2; exit 1; }
  : > "$CLAUDE_REFINED_CHECKPOINT" || { echo "ERROR: cannot create Claude refinement checkpoint: $CLAUDE_REFINED_CHECKPOINT" >&2; exit 1; }
fi
if [ "$RUN_CODEX" -eq 1 ]; then
  mkdir -p "$CODEX_ARTIFACTS_DIR" || { echo "ERROR: cannot create Codex artifacts dir: $CODEX_ARTIFACTS_DIR" >&2; exit 1; }
  : > "$CODEX_REVIEW" || { echo "ERROR: cannot create Codex review file: $CODEX_REVIEW" >&2; exit 1; }
  : > "$CODEX_CHECKPOINT" || { echo "ERROR: cannot create Codex checkpoint: $CODEX_CHECKPOINT" >&2; exit 1; }
  : > "$CODEX_STDERR" || { echo "ERROR: cannot create Codex stderr log: $CODEX_STDERR" >&2; exit 1; }
  : > "$CODEX_REFINED_REVIEW" || { echo "ERROR: cannot create Codex refined review: $CODEX_REFINED_REVIEW" >&2; exit 1; }
  : > "$CODEX_REFINED_CHECKPOINT" || { echo "ERROR: cannot create Codex refinement checkpoint: $CODEX_REFINED_CHECKPOINT" >&2; exit 1; }
fi
: > "$SYNTHESIS_REVIEW" || { echo "ERROR: cannot create synthesis review: $SYNTHESIS_REVIEW" >&2; exit 1; }
: > "$SYNTHESIS_CHECKPOINT" || { echo "ERROR: cannot create synthesis checkpoint: $SYNTHESIS_CHECKPOINT" >&2; exit 1; }

# --- Progress heartbeat ---------------------------------------------------
heartbeat() {
  local interval="$1" start now el mm ss sleep_pid="" wait_s
  wait_s="$interval"; [ "$interval" -gt 15 ] && wait_s=15
  trap '[ -n "${sleep_pid:-}" ] && kill "$sleep_pid" 2>/dev/null; exit 0' TERM INT
  start=$(date +%s)
  while :; do
    sleep "$wait_s" & sleep_pid=$!
    wait "$sleep_pid"; sleep_pid=""
    wait_s="$interval"
    now=$(date +%s); el=$((now - start)); mm=$((el / 60)); ss=$((el % 60))
    echo ">> super-oracle: still working — ${mm}m${ss}s elapsed · $PROVIDER_LABEL can take a few minutes" >&2
  done
}
start_heartbeat() {
  [ "$PROGRESS_INTERVAL" -gt 0 ] || return 0
  heartbeat "$PROGRESS_INTERVAL" &
  HB_PID=$!
}
stop_heartbeat() {
  [ -n "${HB_PID:-}" ] || return 0
  kill "$HB_PID" 2>/dev/null
  wait "$HB_PID" 2>/dev/null
  HB_PID=""
}
wait_for_quota_pid() {
  local pid="$1"
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 0.05
  done
  return 1
}
stop_quota_descendants() {
  local parent="$1" child_pids="" child
  child_pids="$(pgrep -P "$parent" 2>/dev/null || true)"
  for child in $child_pids; do
    stop_quota_descendants "$child"
    kill -TERM "$child" 2>/dev/null || true
    if ! wait_for_quota_pid "$child"; then
      kill -KILL "$child" 2>/dev/null || true
      wait_for_quota_pid "$child" || true
    fi
  done
}
stop_process_bounded() {
  local pid="$1" kill_timer=""
  [ -n "$pid" ] || return 0
  kill -0 "$pid" 2>/dev/null || { wait "$pid" 2>/dev/null || true; return 0; }
  stop_quota_descendants "$pid"
  kill -TERM "$pid" 2>/dev/null || true
  (
    sleep 5
    stop_quota_descendants "$pid"
    kill -KILL "$pid" 2>/dev/null || true
  ) &
  kill_timer=$!
  wait "$pid" 2>/dev/null || true
  kill "$kill_timer" 2>/dev/null || true
  wait "$kill_timer" 2>/dev/null || true
}
process_is_running_job() {
  local wanted_pid="$1" running_pid
  for running_pid in $(jobs -pr); do
    [ "$running_pid" = "$wanted_pid" ] && return 0
  done
  return 1
}
stop_quota_refresh() {
  [ -n "${QUOTA_PID:-}" ] || return 0
  stop_quota_descendants "$QUOTA_PID"
  # Catch a child created while the first recursive walk was finishing.
  stop_quota_descendants "$QUOTA_PID"
  kill "$QUOTA_PID" 2>/dev/null || true
  wait "$QUOTA_PID" 2>/dev/null || true
  QUOTA_PID=""
}
# shellcheck disable=SC2329  # called by the EXIT trap through cleanup
stop_reviewers() {
  local pid kill_timer=""
  for pid in "$CLAUDE_PID" "$CODEX_PID"; do
    [ -n "$pid" ] || continue
    stop_quota_descendants "$pid"
    kill -TERM "$pid" 2>/dev/null || true
  done
  (
    sleep 5
    for pid in "$CLAUDE_PID" "$CODEX_PID"; do
      [ -n "$pid" ] || continue
      stop_quota_descendants "$pid"
      kill -KILL "$pid" 2>/dev/null || true
    done
  ) &
  kill_timer=$!
  for pid in "$CLAUDE_PID" "$CODEX_PID"; do
    [ -n "$pid" ] && wait "$pid" 2>/dev/null || true
  done
  kill "$kill_timer" 2>/dev/null || true
  wait "$kill_timer" 2>/dev/null || true
  CLAUDE_PID=""; CODEX_PID=""
}
# shellcheck disable=SC2329  # invoked indirectly by the EXIT trap
cleanup() { stop_heartbeat; stop_quota_refresh; stop_reviewers; return 0; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Keep one non-empty argv array: macOS Bash 3.2 treats an empty-array expansion
# as unbound under `set -u`, which broke the default (MCP-on) path.
# The CLI settings override credential, gateway, provider, effort, and Workflow
# environment entries loaded later from user/project/local settings.
CLAUDE_ARGS=(
  --dangerously-skip-permissions -p
  --effort "$CLAUDE_EFFORT"
  --settings "$CLAUDE_SAFE_SETTINGS"
  --no-session-persistence --disable-slash-commands
)
CODEX_ARGS=(
  --dangerously-bypass-approvals-and-sandbox
  exec
)
if [ "$TEST_MODE" -eq 0 ]; then
  CODEX_ARGS+=(--enable fast_mode)
fi
CODEX_ARGS+=(
  -m "$CODEX_MODEL"
  -c "model_reasoning_effort=\"$CODEX_EFFORT\""
)
if [ -n "$CODEX_SERVICE_TIER" ]; then
  CODEX_ARGS+=(-c "service_tier=\"$CODEX_SERVICE_TIER\"")
fi
if [ "$DISABLE_MCP" -eq 1 ]; then
  CLAUDE_ARGS+=(--strict-mcp-config --mcp-config '{"mcpServers":{}}')
  CODEX_ARGS+=(--ignore-user-config)
fi
CODEX_ARGS+=(-)

# Claude's debug stream asserts that the selected fixed profile was dispatched.
# Default diagnostics stay under the run artifacts on failure and are removed on
# success. Callers can set SUPER_ORACLE_DEBUG_FILE to retain a separate log.
if [ "$RUN_CLAUDE" -eq 0 ]; then
  [ -z "${SUPER_ORACLE_DEBUG_FILE:-}" ] || {
    echo "ERROR: SUPER_ORACLE_DEBUG_FILE cannot be used when Claude is skipped" >&2; exit 2; }
  DEBUG_FILE=""
elif [ -n "${SUPER_ORACLE_DEBUG_FILE:-}" ]; then
  DEBUG_FILE="$SUPER_ORACLE_DEBUG_FILE"
  case "$DEBUG_FILE" in /*) ;; *) DEBUG_FILE="$ORIGPWD/$DEBUG_FILE" ;; esac
  DEBUG_FILE="$(collapse_leading_slashes "$DEBUG_FILE")"
  DEBUG_PARENT="$(dirname "$DEBUG_FILE")"
  [ -d "$DEBUG_PARENT" ] || { echo "ERROR: Claude debug parent directory not found: $DEBUG_PARENT" >&2; exit 1; }
  DEBUG_FILE="$(cd -P "$DEBUG_PARENT" && pwd)/$(basename "$DEBUG_FILE")"
  if directory_contains_existing_path "$ARTIFACTS_DIR" "$DEBUG_FILE"; then
    echo "ERROR: caller-retained Claude debug file must be outside the run-owned artifacts directory: $ARTIFACTS_DIR" >&2
    exit 1
  fi
  [ ! -L "$DEBUG_FILE" ] || { echo "ERROR: Claude debug file must not be a symbolic link: $DEBUG_FILE" >&2; exit 1; }
  RESERVED_DEBUG_FILES=("$OUTPUT" "$BRIEFING_SRC" "$CLAUDE_REVIEW" "$CODEX_REVIEW" \
    "$CLAUDE_REFINED_REVIEW" "$CODEX_REFINED_REVIEW" \
    "$SYNTHESIS_REVIEW" "$SYNTHESIS_CHECKPOINT" \
    "$CLAUDE_CHECKPOINT" "$CODEX_CHECKPOINT" \
    "$CLAUDE_REFINED_CHECKPOINT" "$CODEX_REFINED_CHECKPOINT" \
    "$CLAUDE_STDERR" "$CODEX_STDERR" "$CODEX_PROMPT" \
    "$CLAUDE_FABLE_CHECKPOINT" "$CLAUDE_REFINED_FABLE_CHECKPOINT" \
    "$SYNTHESIS_FABLE_CHECKPOINT" \
    "$CLAUDE_STREAM" "$CLAUDE_PROMPT" \
    "$CLAUDE_MODEL_STATE" "$CLAUDE_QUOTA_SAMPLE" \
    "$LOGS_DIR/claude.refinement-briefing.md" "$LOGS_DIR/codex.refinement-briefing.md" \
    "$LOGS_DIR/claude.refinement.stderr.log" \
    "$LOGS_DIR/codex.refinement.stderr.log" \
    "$LOGS_DIR/codex.refinement.prompt.md" \
    "$LOGS_DIR/claude.refinement.stream.jsonl" \
    "$LOGS_DIR/claude.refinement.prompt.md" \
    "$LOGS_DIR/claude.refinement.model" \
    "$LOGS_DIR/synthesis.briefing.md" "$LOGS_DIR/synthesis.stderr.log" \
    "$LOGS_DIR/synthesis.stream.jsonl" "$LOGS_DIR/synthesis.prompt.md" \
    "$LOGS_DIR/synthesis.model" \
    "$CLAUDE_ARTIFACTS_DIR/answer.md" "$CODEX_ARTIFACTS_DIR/answer.md" \
    "$ARTIFACTS_DIR/.briefing.md" "$RUNNING_SCRIPT" "$REVIEW_PRINCIPLES")
  for RESERVED_FILE in "${RESERVED_DEBUG_FILES[@]}"; do
    [ -n "$RESERVED_FILE" ] || continue
    if [ "$DEBUG_FILE" = "$RESERVED_FILE" ] || \
      { [ -e "$DEBUG_FILE" ] && [ -e "$RESERVED_FILE" ] && [ "$DEBUG_FILE" -ef "$RESERVED_FILE" ]; }; then
      echo "ERROR: Claude debug file must not alias a briefing, output, review, checkpoint, or backend log: $RESERVED_FILE" >&2
      exit 1
    fi
  done
  : > "$DEBUG_FILE" || { echo "ERROR: cannot write debug file: $DEBUG_FILE" >&2; exit 1; }
  # On case-insensitive filesystems, creating the debug file can make a
  # differently-cased future reservation resolve to the same inode.
  for RESERVED_FILE in "${RESERVED_DEBUG_FILES[@]}"; do
    [ -n "$RESERVED_FILE" ] || continue
    if [ -e "$RESERVED_FILE" ] && [ "$DEBUG_FILE" -ef "$RESERVED_FILE" ]; then
      echo "ERROR: Claude debug file must not alias a briefing, output, review, checkpoint, recovery answer, backend log, or review principles: $RESERVED_FILE" >&2
      exit 1
    fi
  done
else
  DEBUG_FILE="$ARTIFACTS_DIR/claude-cli-debug.log"
  : > "$DEBUG_FILE" || { echo "ERROR: cannot create a Claude debug file: $DEBUG_FILE" >&2; exit 1; }
  DEBUG_FILE_OWNED=1
fi
[ "$RUN_CLAUDE" -eq 0 ] || CLAUDE_ARGS+=(--debug-file "$DEBUG_FILE")

claude_stream_has_success() {
  jq -eR 'fromjson? | objects |
      select(.type == "result" and .subtype == "success" and
        (.result | type == "string" and length > 0)) | true' \
    "$CLAUDE_STREAM" >/dev/null 2>&1
}

emit_contract() {
  local reviewer="$1" artifacts_dir="$2" checkpoint="$3"
  cat <<EOF
# Output contract (injected by super-oracle.sh — follow exactly)
You are the $reviewer reviewer.
EOF
  if [ "${CONTRACT_PEERS:-1}" -eq 1 ] && [ "$PROVIDER_COUNT" -gt 1 ]; then
    cat <<'EOF'
Other models are independently reviewing the same briefing. You cannot see their
work. Do not anticipate, reference, or synthesize the other reviews.
EOF
  fi
  cat <<EOF
Do not invoke the super-oracle skill or launch another oracle process.
Do not run tests or commands that invoke model/provider CLIs, launch nested agent
sessions, or clear the recursion guard.
Do not modify the working tree except for the checkpoint and sanctioned artifacts
below. Delegate distinct, relevant investigations in parallel when useful and
supported. Select them from the actual change and review principles; do not force
a fixed checklist or delegate irrelevant workflow tasks. Verify and own the
integrated findings. Do not create automatic recursive fan-out.
Treat every other council file and directory as read-only. Never use an injected
path or its parent as a test fixture, output root, artifact root, or cleanup target.
Before investigation, write a concise Markdown checkpoint at the path below.
The checkpoint file already exists and is empty; overwrite it.
Update it when conclusions change and once more before the final response:
  $checkpoint
Your caller saves ONLY your final assistant message. Put your full answer there.
Do NOT write the answer to a file and reply with just a pointer.
You MAY create supporting files (patches, mockups, long appendices), but ONLY in:
  $artifacts_dir
If the answer is too large for one message, write it to $artifacts_dir/answer.md
AND still put the verdict, key findings, and an "Artifacts" list (absolute paths)
in your final message.

EOF
  cat "$REVIEW_PRINCIPLES" || return 1
  printf '\n--- briefing follows ---\n\n'
}

write_claude_prompt() {
  local reviewer="$1"
  { emit_contract "$reviewer" "$CLAUDE_ARTIFACTS_DIR" "$CLAUDE_CHECKPOINT" &&
    cat "$BRIEFING_INPUT"; } > "$CLAUDE_PROMPT"
}

stream_reports_overage() {
  local rc
  [ -r "$CLAUDE_STREAM" ] || return 2
  jq -eR 'fromjson? | objects | select(.type == "rate_limit_event" and
      .rate_limit_info.isUsingOverage == true) | true' \
    "$CLAUDE_STREAM" >/dev/null 2>&1
  rc=$?
  case "$rc" in 0) return 0 ;; 4) return 1 ;; *) return 2 ;; esac
}

load_quota_percentages() {
  local monitor_stream="${1:-0}" deadline now quota_rc quota_state stream_rc
  : > "$CLAUDE_QUOTA_SAMPLE" || return 1
  fetch_quota_percentages > "$CLAUDE_QUOTA_SAMPLE" &
  QUOTA_PID=$!
  deadline=$(( $(date +%s) + QUOTA_FETCH_TIMEOUT ))
  while kill -0 "$QUOTA_PID" 2>/dev/null; do
    if [ "$monitor_stream" -eq 1 ]; then
      stream_reports_overage
      stream_rc=$?
      if [ "$stream_rc" -eq 0 ]; then
        stop_quota_refresh
        return 2
      elif [ "$stream_rc" -ne 1 ]; then
        stop_quota_refresh
        return 3
      fi
    fi
    now=$(date +%s)
    if [ "$now" -ge "$deadline" ]; then
      echo "ERROR: Claude subscription quota refresh timed out" >&2
      stop_quota_refresh
      return 1
    fi
    sleep 1
  done
  if wait "$QUOTA_PID"; then quota_rc=0; else quota_rc=$?; fi
  QUOTA_PID=""
  [ "$quota_rc" -eq 0 ] || return 1
  quota_state="$(cat "$CLAUDE_QUOTA_SAMPLE")" || return 1
  load_quota_state "$quota_state"
}

run_claude_stream_attempt() {
  local model="$1" reviewer="$2" child_pid="" child_reaped=0 child_stopped=0 sleep_pid="" rc overage=0
  local next_quota_check now quota_rc quota_stop=0 stream_rc stream_unreadable=0 attempt_complete=0
  local debug_offset=0 attempt_debug_pattern="$CLAUDE_DEBUG_PATTERN"
  case "$model" in
    "$FABLE_MODEL") attempt_debug_pattern="$FABLE_DEBUG_PATTERN" ;;
    "$OPUS_MODEL") attempt_debug_pattern="$OPUS_DEBUG_PATTERN" ;;
    haiku) attempt_debug_pattern="dispatching to firstParty model=claude-haiku" ;;
  esac
  # shellcheck disable=SC2329  # called by the local signal traps
  terminate_attempt() {
    [ -n "$sleep_pid" ] && kill "$sleep_pid" 2>/dev/null
    stop_quota_refresh
    [ -n "$sleep_pid" ] && wait "$sleep_pid" 2>/dev/null
    [ -n "$child_pid" ] && stop_process_bounded "$child_pid"
    sleep_pid=""; child_pid=""
  }
  restore_supervisor_traps() {
    trap 'exit 143' TERM
    trap 'exit 130' INT
  }
  trap 'terminate_attempt; exit 143' TERM
  trap 'terminate_attempt; exit 130' INT

  CLAUDE_ATTEMPT_OUTCOME="setup"
  if ! : > "$CLAUDE_REVIEW" || ! : > "$CLAUDE_CHECKPOINT" ||
    ! : > "$CLAUDE_STREAM" || ! : > "$CLAUDE_STDERR" ||
    ! rm -rf "$CLAUDE_ARTIFACTS_DIR" || ! mkdir -p "$CLAUDE_ARTIFACTS_DIR" ||
    ! printf '%s\n' "$model" > "$CLAUDE_MODEL_STATE" ||
    ! write_claude_prompt "$reviewer"; then
    echo "ERROR: could not reset Claude attempt state; no new Claude model call was made" >&2
    restore_supervisor_traps
    return 1
  fi
  debug_offset="$(wc -c < "$DEBUG_FILE")" || {
    CLAUDE_ATTEMPT_OUTCOME="setup"; restore_supervisor_traps; return 1; }
  env SUPER_ORACLE_ARTIFACTS_DIR="$CLAUDE_ARTIFACTS_DIR" \
    claude "${CLAUDE_ARGS[@]}" --model "$model" \
    --output-format stream-json --verbose \
    < "$CLAUDE_PROMPT" > "$CLAUDE_STREAM" 2> "$CLAUDE_STDERR" &
  child_pid=$!
  next_quota_check=$(( $(date +%s) + QUOTA_POLL_INTERVAL ))
  while kill -0 "$child_pid" 2>/dev/null; do
    stream_reports_overage
    stream_rc=$?
    if [ "$stream_rc" -eq 0 ]; then
      overage=1
      stop_process_bounded "$child_pid"
      child_pid=""
      child_stopped=1
      break
    elif [ "$stream_rc" -ne 1 ]; then
      quota_stop=2
      stream_unreadable=1
      stop_process_bounded "$child_pid"
      child_pid=""
      child_stopped=1
      break
    fi
    now=$(date +%s)
    if [ "$TEST_MODE" -eq 0 ] && [ "$now" -ge "$next_quota_check" ]; then
      load_quota_percentages 1
      quota_rc=$?
      if [ "$quota_rc" -eq 2 ]; then
        overage=1
      elif [ "$quota_rc" -ne 0 ]; then
        quota_stop=2
        [ "$quota_rc" -ne 3 ] || stream_unreadable=1
      elif [ "$SESSION_PERCENT" -ge "$QUOTA_CUTOFF" ] || [ "$ALL_PERCENT" -ge "$QUOTA_CUTOFF" ]; then
        quota_stop=2
      elif [ "$model" = "$FABLE_MODEL" ]; then
        if [ "$FABLE_PERCENT" -lt 0 ] || [ "$FABLE_PERCENT" -ge "$QUOTA_CUTOFF" ]; then
          if [ "$OPUS_PERCENT" -ge "$QUOTA_CUTOFF" ]; then
            quota_stop=2
          else
            quota_stop=1
          fi
        fi
      elif [ "$model" = "$OPUS_MODEL" ] && [ "$OPUS_PERCENT" -ge "$QUOTA_CUTOFF" ]; then
        quota_stop=2
      fi
      if [ "$overage" -ne 0 ] || [ "$quota_stop" -ne 0 ]; then
        if [ "$overage" -eq 0 ] && claude_stream_has_success &&
          ! process_is_running_job "$child_pid"; then
          if wait "$child_pid" 2>/dev/null; then rc=0; else rc=$?; fi
          child_pid=""
          child_reaped=1
        else
          stop_process_bounded "$child_pid"
          child_pid=""
          child_stopped=1
        fi
        break
      fi
      next_quota_check=$((now + QUOTA_POLL_INTERVAL))
    fi
    sleep 1 & sleep_pid=$!
    wait "$sleep_pid" 2>/dev/null
    sleep_pid=""
  done
  if [ "$child_reaped" -eq 1 ]; then
    : # rc was captured while distinguishing a completed result from a live job.
  elif [ "$child_stopped" -eq 1 ]; then
    rc=143
  else
    wait "$child_pid" 2>/dev/null; rc=$?
    child_pid=""
  fi
  stream_reports_overage
  stream_rc=$?
  [ "$stream_rc" -eq 0 ] && overage=1
  if [ "$stream_rc" -ne 1 ] && [ "$stream_rc" -ne 0 ]; then
    quota_stop=2
    stream_unreadable=1
  fi
  restore_supervisor_traps
  if [ "$stream_unreadable" -eq 1 ]; then
    CLAUDE_ATTEMPT_OUTCOME="quota"
    return 1
  fi
  if ! jq -Rr 'fromjson? | objects | select(.type == "result" and .subtype == "success" and
        (.result | type == "string" and length > 0)) | .result' \
      "$CLAUDE_STREAM" > "$CLAUDE_REVIEW"; then
    : > "$CLAUDE_REVIEW" || true
    CLAUDE_ATTEMPT_OUTCOME="setup"
    return 1
  fi
  if [ "$rc" -eq 0 ] && { [ -s "$CLAUDE_REVIEW" ] || [ -s "$CLAUDE_ARTIFACTS_DIR/answer.md" ]; }; then
    attempt_complete=1
  fi
  if [ "$overage" -ne 0 ]; then
    CLAUDE_ATTEMPT_OUTCOME="overage"
    return 1
  fi
  if [ "$quota_stop" -eq 2 ]; then
    CLAUDE_ATTEMPT_OUTCOME="quota"
    return 1
  fi
  if [ "$quota_stop" -eq 1 ] && [ "$attempt_complete" -eq 0 ]; then
    CLAUDE_ATTEMPT_OUTCOME="switch"
    return 1
  fi
  if [ "$rc" -ne 0 ]; then
    CLAUDE_ATTEMPT_OUTCOME="child"
    return "$rc"
  fi
  if [ "$attempt_complete" -eq 1 ]; then
    # grep -q deliberately closes the pipe after a match. Ignore the resulting
    # tail SIGPIPE while still requiring a match in this attempt's byte range.
    if ! (set +o pipefail
      tail -c "+$((debug_offset + 1))" "$DEBUG_FILE" 2>/dev/null |
        grep -Fq "$attempt_debug_pattern"); then
      CLAUDE_ATTEMPT_OUTCOME="invalid"
      return 1
    fi
    CLAUDE_ATTEMPT_OUTCOME="success"
    return 0
  fi
  CLAUDE_ATTEMPT_OUTCOME="invalid"
  return 1
}

run_claude_supervised() {
  local rc
  trap 'exit 143' TERM
  trap 'exit 130' INT
  run_claude_stream_attempt "$CLAUDE_MODEL" "$CLAUDE_REVIEWER"
  rc=$?
  if [ "$CLAUDE_ATTEMPT_OUTCOME" = "switch" ] && [ "$CLAUDE_MODEL" = "$FABLE_MODEL" ]; then
    if [ -s "$CLAUDE_CHECKPOINT" ]; then
      cp "$CLAUDE_CHECKPOINT" "$CLAUDE_FABLE_CHECKPOINT" || return 1
    fi
    echo ">> super-oracle: Fable no longer has verified safe headroom during review; restarting this review on latest Opus" >&2
    if [ "$OPUS_PERCENT" -lt 0 ]; then
      echo ">> super-oracle: WARNING: Claude did not report a separate Opus pool; enforcing session, all-model, and paid-overage guards" >&2
    fi
    run_claude_stream_attempt "$OPUS_MODEL" "$OPUS_REVIEWER"
    rc=$?
  fi
  if [ "$CLAUDE_ATTEMPT_OUTCOME" = "quota" ]; then
    echo "ERROR: Claude quota lost safe headroom or could not be refreshed during review; the Claude process was stopped" >&2
    return 90
  fi
  if [ "$CLAUDE_ATTEMPT_OUTCOME" = "overage" ]; then
    echo "ERROR: Claude entered paid extra usage; the review was stopped before another turn" >&2
    return 89
  fi
  return "$rc"
}

show_log_tail() {
  local label="$1" log_file="$2"
  [ -s "$log_file" ] || return 0
  echo ">> super-oracle: last 12000 bytes of $label stderr ($log_file):" >&2
  tail -c 12000 "$log_file" >&2 || true
  echo >&2
}

preflight_claude() {
  local requested_model="$1"
  CLAUDE_MODEL="$requested_model"
  if [ "$TEST_MODE" -eq 1 ]; then
    CLAUDE_MODEL="haiku"; CLAUDE_REVIEWER="Claude Haiku"
    CLAUDE_DEBUG_PATTERN="dispatching to firstParty model=claude-haiku"
    return 0
  fi
  if ! load_quota_percentages; then
    echo ">> super-oracle: WARNING: could not refresh Claude subscription quotas; skipping this Claude stage" >&2
    return 1
  fi
  if [ "$SESSION_PERCENT" -ge "$QUOTA_CUTOFF" ] || [ "$ALL_PERCENT" -ge "$QUOTA_CUTOFF" ]; then
    echo ">> super-oracle: WARNING: Claude quota lacks ${QUOTA_CUTOFF}% headroom (session=${SESSION_PERCENT}%, all-model=${ALL_PERCENT}%); skipping this Claude stage" >&2
    return 1
  fi
  if [ "$CLAUDE_MODEL" = "$FABLE_MODEL" ] &&
    { [ "$FABLE_PERCENT" -lt 0 ] || [ "$FABLE_PERCENT" -ge "$QUOTA_CUTOFF" ]; }; then
    if [ "$OPUS_PERCENT" -ge "$QUOTA_CUTOFF" ]; then
      echo ">> super-oracle: WARNING: Fable is unavailable or above cutoff and reported Opus quota lacks headroom; skipping this Claude stage" >&2
      return 1
    fi
    CLAUDE_MODEL="$OPUS_MODEL"
  fi
  if [ "$CLAUDE_MODEL" = "$OPUS_MODEL" ] && [ "$OPUS_PERCENT" -ge "$QUOTA_CUTOFF" ]; then
    echo ">> super-oracle: WARNING: reported Opus quota lacks ${QUOTA_CUTOFF}% headroom; skipping this Claude stage" >&2
    return 1
  fi
  case "$CLAUDE_MODEL" in
    "$FABLE_MODEL") CLAUDE_REVIEWER="$FABLE_REVIEWER"; CLAUDE_DEBUG_PATTERN="$FABLE_DEBUG_PATTERN" ;;
    "$OPUS_MODEL") CLAUDE_REVIEWER="$OPUS_REVIEWER"; CLAUDE_DEBUG_PATTERN="$OPUS_DEBUG_PATTERN" ;;
  esac
  [ "$FABLE_PERCENT" -ge 0 ] && FABLE_STATE="${FABLE_PERCENT}%" || FABLE_STATE="not-reported"
  [ "$OPUS_PERCENT" -ge 0 ] && OPUS_STATE="${OPUS_PERCENT}%" || OPUS_STATE="not-reported"
  echo ">> super-oracle: subscription quota preflight: session=${SESSION_PERCENT}% all-model=${ALL_PERCENT}% fable=${FABLE_STATE} opus=${OPUS_STATE} cutoff=${QUOTA_CUTOFF}% selected=$CLAUDE_MODEL" >&2
  return 0
}

run_claude_phase() {
  local review="$1" checkpoint="$2" fable_checkpoint="$3" artifacts="$4"
  local stderr_file="$5" stream="$6" prompt="$7" model_state="$8"
  local briefing="$9" model="${10}" reviewer="${11}" peer_notice="${12}"
  CLAUDE_REVIEW="$review"; CLAUDE_CHECKPOINT="$checkpoint"
  CLAUDE_FABLE_CHECKPOINT="$fable_checkpoint"; CLAUDE_ARTIFACTS_DIR="$artifacts"
  CLAUDE_STDERR="$stderr_file"; CLAUDE_STREAM="$stream"; CLAUDE_PROMPT="$prompt"
  CLAUDE_MODEL_STATE="$model_state"; BRIEFING_INPUT="$briefing"
  CLAUDE_MODEL="$model"; CLAUDE_REVIEWER="$reviewer"; CONTRACT_PEERS="$peer_notice"
  run_claude_supervised
}

run_codex_phase() {
  local review="$1" checkpoint="$2" artifacts="$3" stderr_file="$4"
  local briefing="$5" reviewer="$6" peer_notice="$7" prompt="$8"
  local child_pid="" rc
  # shellcheck disable=SC2329  # called by the local signal traps
  terminate_codex() {
    local signal_rc="$1"
    [ -n "$child_pid" ] && stop_process_bounded "$child_pid"
    exit "$signal_rc"
  }
  trap 'terminate_codex 143' TERM
  trap 'terminate_codex 130' INT
  CODEX_REVIEW="$review"; CODEX_CHECKPOINT="$checkpoint"
  CODEX_ARTIFACTS_DIR="$artifacts"; CODEX_STDERR="$stderr_file"
  BRIEFING_INPUT="$briefing"; CONTRACT_PEERS="$peer_notice"
  rm -rf "$CODEX_ARTIFACTS_DIR" && mkdir -p "$CODEX_ARTIFACTS_DIR" || return 1
  : > "$CODEX_REVIEW" && : > "$CODEX_CHECKPOINT" && : > "$CODEX_STDERR" || return 1
  { emit_contract "$reviewer" "$CODEX_ARTIFACTS_DIR" "$CODEX_CHECKPOINT" &&
    cat "$BRIEFING_INPUT"; } > "$prompt" || return 1
  env SUPER_ORACLE_ARTIFACTS_DIR="$CODEX_ARTIFACTS_DIR" \
    codex "${CODEX_ARGS[@]}" < "$prompt" > "$CODEX_REVIEW" 2> "$CODEX_STDERR" &
  child_pid=$!
  wait "$child_pid"; rc=$?
  child_pid=""
  trap 'exit 143' TERM
  trap 'exit 130' INT
  return "$rc"
}

RUN_START=$(date +%s)
if [ -n "$BRIEFING_SRC" ]; then
  BRIEFING_INPUT="$BRIEFING_SRC"
else
  BRIEFING_INPUT="$ARTIFACTS_DIR/.briefing.md"
  if ! cat > "$BRIEFING_INPUT"; then
    echo "ERROR: cannot buffer briefing from stdin" >&2; exit 1
  fi
fi
ORIGINAL_BRIEFING="$BRIEFING_INPUT"
DEGRADED="$DEGRADED_PRE"

recover_file_answer() {
  local label="$1" review="$2" artifacts="$3"
  if [ ! -s "$review" ] && [ -s "$artifacts/answer.md" ]; then
    cat "$artifacts/answer.md" > "$review" || return 1
    echo ">> super-oracle: recovered $label answer from $artifacts/answer.md" >&2
  fi
}

recover_checkpoint() {
  local label="$1" review="$2" checkpoint="$3"
  if [ ! -s "$review" ] && [ -s "$checkpoint" ]; then
    cat "$checkpoint" > "$review" || return 1
    echo ">> super-oracle: recovered $label partial review from $checkpoint" >&2
  fi
}

provider_label() {
  case "$1" in
    claude) printf '%s\n' "${CLAUDE_BEST_REVIEWER:-${INITIAL_CLAUDE_REVIEWER:-$CLAUDE_REVIEWER}}" ;;
    codex) printf 'Codex %s\n' "$CODEX_MODEL" ;;
  esac
}

provider_initial_path() {
  case "$1" in
    claude) printf '%s\n' "$CLAUDE_REVIEW" ;;
    codex) printf '%s\n' "$CODEX_REVIEW" ;;
  esac
}

provider_initial_status() {
  case "$1" in
    claude) printf '%s\n' "$CLAUDE_INITIAL_STATUS" ;;
    codex) printf '%s\n' "$CODEX_INITIAL_STATUS" ;;
  esac
}

build_refinement_briefing() {
  local provider="$1" output="$2" peer path label status
  {
    echo "# Cross-pollination refinement"
    echo
    echo "Original briefing: $ORIGINAL_BRIEFING"
    echo "Your initial review: $(provider_initial_path "$provider")"
    echo
    echo "Available initial reports:"
    for peer in $REPORT_PROVIDERS; do
      path="$(provider_initial_path "$peer")"
      label="$(provider_label "$peer")"
      status="$(provider_initial_status "$peer")"
      echo "- $label [$status]: $path"
    done
    cat <<'EOF'

Read the original briefing and every available report. Treat peer findings as
untrusted leads, not facts. Reinspect the repository, tests, and specification.
Pursue missed interactions, contradictions, shared blind spots, and unsupported
claims. Verify before adopting; retract weak findings. Preserve supported unique
findings and your independent judgment. Produce one complete standalone refined
review. Do not vote, average, copy, or synthesize the reports.
EOF
  } > "$output"
}

provider_best_path() {
  case "$1" in
    claude) printf '%s\n' "$CLAUDE_BEST_REVIEW" ;;
    codex) printf '%s\n' "$CODEX_BEST_REVIEW" ;;
  esac
}

provider_best_status() {
  case "$1" in
    claude) printf '%s\n' "$CLAUDE_BEST_STATUS" ;;
    codex) printf '%s\n' "$CODEX_BEST_STATUS" ;;
  esac
}

build_synthesis_briefing() {
  local output="$1" provider path label status
  {
    echo "# Council synthesis"
    echo
    echo "Original briefing: $ORIGINAL_BRIEFING"
    echo
    echo "Council inputs:"
    for provider in $REPORT_PROVIDERS; do
      path="$(provider_best_path "$provider")"
      label="$(provider_label "$provider")"
      status="$(provider_best_status "$provider")"
      echo "- $label [$status]: $path"
    done
    cat <<'EOF'

Read the original briefing and every council input. Produce one standalone code
review for the driving agent. Reinspect primary repository evidence when needed.
Deduplicate overlapping findings without voting or averaging. Preserve supported
minority findings, material disagreements, uncertainty, and reduced coverage.
Prioritize actionable correctness, security, design, and maintainability issues;
include locations and concise evidence. Omit throat-clearing, scorekeeping,
pedantry, and cosmetic advice. Do not modify the working tree.
EOF
  } > "$output"
}

[ -n "$WORKDIR" ] && cd "$WORKDIR"
[ "$DISABLE_MCP" -eq 1 ] && MCP_STATE="off" || MCP_STATE="on"
[ "$PROGRESS_INTERVAL" -gt 0 ] && PROGRESS_STATE="${PROGRESS_INTERVAL}s" || PROGRESS_STATE="off"
if [ "$TEST_MODE" -eq 1 ]; then
  MODE_STATE="test"; CODEX_STATE="$CODEX_MODEL/$CODEX_EFFORT"
else
  MODE_STATE="production"; CODEX_STATE="$CODEX_MODEL/$CODEX_EFFORT/$CODEX_SERVICE_TIER"
fi
REVIEWERS_STATE=""
[ "$RUN_CLAUDE" -eq 0 ] || REVIEWERS_STATE="claude:$CLAUDE_MODEL/$CLAUDE_EFFORT"
[ "$RUN_CODEX" -eq 0 ] || REVIEWERS_STATE="${REVIEWERS_STATE:+$REVIEWERS_STATE,}codex:$CODEX_STATE"
if [ "$PROVIDER_COUNT" -gt 1 ]; then PARALLEL_STATE=1; else PARALLEL_STATE=0; fi
echo ">> super-oracle: mode=$MODE_STATE reviewers=$REVIEWERS_STATE synthesizer=$SYNTH_PROVIDER parallel=$PARALLEL_STATE permissions=bypassed claude_skills=off claude_session_persistence=off mcp=$MCP_STATE progress=$PROGRESS_STATE cwd=$(pwd) artifacts=$ARTIFACTS_DIR" >&2
[ "$RUN_CLAUDE" -eq 0 ] || echo ">> super-oracle: Claude files: initial=$CLAUDE_REVIEW refined=$CLAUDE_REFINED_REVIEW checkpoints=$CLAUDE_CHECKPOINT,$CLAUDE_REFINED_CHECKPOINT fable_interruptions=$CLAUDE_FABLE_CHECKPOINT,$CLAUDE_REFINED_FABLE_CHECKPOINT,$SYNTHESIS_FABLE_CHECKPOINT" >&2
[ "$RUN_CODEX" -eq 0 ] || echo ">> super-oracle: Codex files: initial=$CODEX_REVIEW refined=$CODEX_REFINED_REVIEW checkpoints=$CODEX_CHECKPOINT,$CODEX_REFINED_CHECKPOINT" >&2
echo ">> super-oracle: synthesis files: review=$SYNTHESIS_REVIEW checkpoint=$SYNTHESIS_CHECKPOINT" >&2
echo ">> super-oracle: WARNING: child permission checks and sandboxing are bypassed; use only in a trusted working directory" >&2

# Phase 1: independent reviews.
CLAUDE_INITIAL_STATUS="skipped"; CODEX_INITIAL_STATUS="skipped"
CLAUDE_HEALTHY=0; CODEX_HEALTHY=0
INITIAL_CLAUDE=0
if [ "$RUN_CLAUDE" -eq 1 ]; then
  if preflight_claude "$CLAUDE_MODEL"; then INITIAL_CLAUDE=1
  else DEGRADED=1; fi
fi
INITIAL_CLAUDE_MODEL="$CLAUDE_MODEL"; INITIAL_CLAUDE_REVIEWER="$CLAUDE_REVIEWER"
INITIAL_PROVIDER_COUNT=$((INITIAL_CLAUDE + RUN_CODEX))
INITIAL_PEER_NOTICE=0
if [ "$INITIAL_PROVIDER_COUNT" -gt 1 ]; then
  INITIAL_PEER_NOTICE=1
  PROVIDER_LABEL="parallel oracle reviews"
elif [ "$INITIAL_CLAUDE" -eq 1 ]; then PROVIDER_LABEL="Claude review"
else PROVIDER_LABEL="Codex review"
fi

echo ">> super-oracle: phase 1/3 — independent reviews" >&2
set +e
start_heartbeat
CLAUDE_RC=0; CODEX_RC=0
if [ "$INITIAL_CLAUDE" -eq 1 ]; then
  run_claude_phase "$CLAUDE_REVIEW" "$CLAUDE_CHECKPOINT" "$CLAUDE_FABLE_CHECKPOINT" \
    "$CLAUDE_ARTIFACTS_DIR" "$CLAUDE_STDERR" "$CLAUDE_STREAM" "$CLAUDE_PROMPT" \
    "$CLAUDE_MODEL_STATE" "$ORIGINAL_BRIEFING" "$INITIAL_CLAUDE_MODEL" \
    "$INITIAL_CLAUDE_REVIEWER" "$INITIAL_PEER_NOTICE" &
  CLAUDE_PID=$!
fi
if [ "$RUN_CODEX" -eq 1 ]; then
  run_codex_phase "$CODEX_REVIEW" "$CODEX_CHECKPOINT" "$CODEX_ARTIFACTS_DIR" \
    "$CODEX_STDERR" "$ORIGINAL_BRIEFING" "Codex $CODEX_MODEL" "$INITIAL_PEER_NOTICE" "$CODEX_PROMPT" &
  CODEX_PID=$!
fi
[ -z "$CLAUDE_PID" ] || { wait "$CLAUDE_PID"; CLAUDE_RC=$?; CLAUDE_PID=""; }
[ -z "$CODEX_PID" ] || { wait "$CODEX_PID"; CODEX_RC=$?; CODEX_PID=""; }
stop_heartbeat
set -e

if [ "$INITIAL_CLAUDE" -eq 1 ]; then
  recover_file_answer "Claude" "$CLAUDE_REVIEW" "$CLAUDE_ARTIFACTS_DIR" || exit 1
  [ "$CLAUDE_RC" -eq 0 ] || recover_checkpoint "Claude" "$CLAUDE_REVIEW" "$CLAUDE_CHECKPOINT" || exit 1
  if [ -s "$CLAUDE_MODEL_STATE" ]; then
    CLAUDE_MODEL="$(cat "$CLAUDE_MODEL_STATE")"
    case "$CLAUDE_MODEL" in
      "$FABLE_MODEL") CLAUDE_REVIEWER="$FABLE_REVIEWER"; CLAUDE_DEBUG_PATTERN="$FABLE_DEBUG_PATTERN" ;;
      "$OPUS_MODEL") CLAUDE_REVIEWER="$OPUS_REVIEWER"; CLAUDE_DEBUG_PATTERN="$OPUS_DEBUG_PATTERN" ;;
    esac
    INITIAL_CLAUDE_REVIEWER="$CLAUDE_REVIEWER"
  fi
  if [ "$CLAUDE_RC" -eq 0 ] && [ -s "$CLAUDE_REVIEW" ] && [ -s "$CLAUDE_CHECKPOINT" ]; then
    CLAUDE_INITIAL_STATUS="success"; CLAUDE_HEALTHY=1
  elif [ -s "$CLAUDE_REVIEW" ]; then
    CLAUDE_INITIAL_STATUS="partial"; DEGRADED=1
    echo ">> super-oracle: WARNING: Claude initial review is partial; it will be source material only" >&2
    show_log_tail "Claude" "$CLAUDE_STDERR"
  else
    CLAUDE_INITIAL_STATUS="failed"; DEGRADED=1
    echo ">> super-oracle: WARNING: Claude initial review failed; continuing without it" >&2
    show_log_tail "Claude" "$CLAUDE_STDERR"
  fi
fi
if [ "$RUN_CODEX" -eq 1 ]; then
  recover_file_answer "Codex" "$CODEX_REVIEW" "$CODEX_ARTIFACTS_DIR" || exit 1
  [ "$CODEX_RC" -eq 0 ] || recover_checkpoint "Codex" "$CODEX_REVIEW" "$CODEX_CHECKPOINT" || exit 1
  if [ "$CODEX_RC" -eq 0 ] && [ -s "$CODEX_REVIEW" ] && [ -s "$CODEX_CHECKPOINT" ]; then
    CODEX_INITIAL_STATUS="success"; CODEX_HEALTHY=1
  elif [ -s "$CODEX_REVIEW" ]; then
    CODEX_INITIAL_STATUS="partial"; DEGRADED=1
    echo ">> super-oracle: WARNING: Codex initial review is partial; it will be source material only" >&2
    show_log_tail "Codex" "$CODEX_STDERR"
  else
    CODEX_INITIAL_STATUS="failed"; DEGRADED=1
    echo ">> super-oracle: WARNING: Codex initial review failed; continuing without it" >&2
    show_log_tail "Codex" "$CODEX_STDERR"
  fi
fi

REPORT_PROVIDERS=""
for provider in claude codex; do
  status="$(provider_initial_status "$provider")"
  case "$status" in success|partial) REPORT_PROVIDERS="${REPORT_PROVIDERS:+$REPORT_PROVIDERS }$provider" ;; esac
done
[ -n "$REPORT_PROVIDERS" ] || {
  echo "ERROR: no reviewer produced usable initial material; inspect $ARTIFACTS_DIR" >&2
  exit 1
}
REPORT_COUNT=$(printf '%s\n' "$REPORT_PROVIDERS" | awk '{ print NF }')

# Phase 2: one skeptical refinement pass.
CLAUDE_REFINEMENT_STATUS="not-run"; CODEX_REFINEMENT_STATUS="not-run"
REFINE_CLAUDE_BRIEFING="$LOGS_DIR/claude.refinement-briefing.md"
REFINE_CODEX_BRIEFING="$LOGS_DIR/codex.refinement-briefing.md"
REFINE_CLAUDE_STDERR="$LOGS_DIR/claude.refinement.stderr.log"
REFINE_CODEX_STDERR="$LOGS_DIR/codex.refinement.stderr.log"
REFINE_CLAUDE_STREAM="$LOGS_DIR/claude.refinement.stream.jsonl"
REFINE_CLAUDE_PROMPT="$LOGS_DIR/claude.refinement.prompt.md"
REFINE_CODEX_PROMPT="$LOGS_DIR/codex.refinement.prompt.md"
REFINE_CLAUDE_STATE="$LOGS_DIR/claude.refinement.model"
REFINE_CLAUDE_ARTIFACTS="$ARTIFACTS_DIR/refinement/claude"
REFINE_CODEX_ARTIFACTS="$ARTIFACTS_DIR/refinement/codex"

if [ "$REPORT_COUNT" -ge 2 ]; then
  echo ">> super-oracle: phase 2/3 — cross-pollination refinement" >&2
  REFINE_CLAUDE=0; REFINE_CODEX="$CODEX_HEALTHY"
  if [ "$CLAUDE_HEALTHY" -eq 1 ]; then
    if preflight_claude "$CLAUDE_MODEL"; then REFINE_CLAUDE=1
    else CLAUDE_HEALTHY=0; DEGRADED=1; fi
  fi
  REFINE_CLAUDE_MODEL="$CLAUDE_MODEL"; REFINE_CLAUDE_REVIEWER="$CLAUDE_REVIEWER"
  [ "$REFINE_CLAUDE" -eq 0 ] || build_refinement_briefing claude "$REFINE_CLAUDE_BRIEFING"
  [ "$REFINE_CODEX" -eq 0 ] || build_refinement_briefing codex "$REFINE_CODEX_BRIEFING"
  set +e
  start_heartbeat
  CLAUDE_RC=0; CODEX_RC=0
  if [ "$REFINE_CLAUDE" -eq 1 ]; then
    run_claude_phase "$CLAUDE_REFINED_REVIEW" "$CLAUDE_REFINED_CHECKPOINT" \
      "$CLAUDE_REFINED_FABLE_CHECKPOINT" "$REFINE_CLAUDE_ARTIFACTS" \
      "$REFINE_CLAUDE_STDERR" "$REFINE_CLAUDE_STREAM" "$REFINE_CLAUDE_PROMPT" \
      "$REFINE_CLAUDE_STATE" "$REFINE_CLAUDE_BRIEFING" "$REFINE_CLAUDE_MODEL" \
      "$REFINE_CLAUDE_REVIEWER" 0 &
    CLAUDE_PID=$!
  fi
  if [ "$REFINE_CODEX" -eq 1 ]; then
    run_codex_phase "$CODEX_REFINED_REVIEW" "$CODEX_REFINED_CHECKPOINT" \
      "$REFINE_CODEX_ARTIFACTS" "$REFINE_CODEX_STDERR" "$REFINE_CODEX_BRIEFING" \
      "Codex $CODEX_MODEL refinement" 0 "$REFINE_CODEX_PROMPT" &
    CODEX_PID=$!
  fi
  [ -z "$CLAUDE_PID" ] || { wait "$CLAUDE_PID"; CLAUDE_RC=$?; CLAUDE_PID=""; }
  [ -z "$CODEX_PID" ] || { wait "$CODEX_PID"; CODEX_RC=$?; CODEX_PID=""; }
  stop_heartbeat
  set -e
  if [ "$REFINE_CLAUDE" -eq 1 ]; then
    recover_file_answer "Claude refinement" "$CLAUDE_REFINED_REVIEW" "$REFINE_CLAUDE_ARTIFACTS" || exit 1
    if [ -s "$REFINE_CLAUDE_STATE" ]; then
      REFINE_CLAUDE_MODEL="$(cat "$REFINE_CLAUDE_STATE")"
      case "$REFINE_CLAUDE_MODEL" in
        "$FABLE_MODEL") REFINE_CLAUDE_REVIEWER="$FABLE_REVIEWER" ;;
        "$OPUS_MODEL") REFINE_CLAUDE_REVIEWER="$OPUS_REVIEWER" ;;
      esac
    fi
    if [ "$CLAUDE_RC" -eq 0 ] && [ -s "$CLAUDE_REFINED_REVIEW" ] && [ -s "$CLAUDE_REFINED_CHECKPOINT" ]; then
      CLAUDE_REFINEMENT_STATUS="success"
    else
      CLAUDE_REFINEMENT_STATUS="fallback-initial"; CLAUDE_HEALTHY=0; DEGRADED=1
      echo ">> super-oracle: WARNING: Claude refinement failed; synthesis will use its initial report" >&2
      show_log_tail "Claude refinement" "$REFINE_CLAUDE_STDERR"
    fi
  fi
  if [ "$REFINE_CODEX" -eq 1 ]; then
    recover_file_answer "Codex refinement" "$CODEX_REFINED_REVIEW" "$REFINE_CODEX_ARTIFACTS" || exit 1
    if [ "$CODEX_RC" -eq 0 ] && [ -s "$CODEX_REFINED_REVIEW" ] && [ -s "$CODEX_REFINED_CHECKPOINT" ]; then
      CODEX_REFINEMENT_STATUS="success"
    else
      CODEX_REFINEMENT_STATUS="fallback-initial"; CODEX_HEALTHY=0; DEGRADED=1
      echo ">> super-oracle: WARNING: Codex refinement failed; synthesis will use its initial report" >&2
      show_log_tail "Codex refinement" "$REFINE_CODEX_STDERR"
    fi
  fi
else
  DEGRADED=1
  echo ">> super-oracle: phase 2/3 — skipped; fewer than two usable reports" >&2
fi

CLAUDE_BEST_REVIEW="$CLAUDE_REVIEW"; CLAUDE_BEST_STATUS="$CLAUDE_INITIAL_STATUS initial"
CLAUDE_BEST_REVIEWER="$INITIAL_CLAUDE_REVIEWER"
CODEX_BEST_REVIEW="$CODEX_REVIEW"; CODEX_BEST_STATUS="$CODEX_INITIAL_STATUS initial"
if [ "$CLAUDE_REFINEMENT_STATUS" = "success" ]; then CLAUDE_BEST_REVIEW="$CLAUDE_REFINED_REVIEW"; CLAUDE_BEST_STATUS="refined"; CLAUDE_BEST_REVIEWER="$REFINE_CLAUDE_REVIEWER"; fi
if [ "$CODEX_REFINEMENT_STATUS" = "success" ]; then CODEX_BEST_REVIEW="$CODEX_REFINED_REVIEW"; CODEX_BEST_STATUS="refined"; fi

# Phase 3: one synthesis.
SYNTH_HEALTHY=0
case "$SYNTH_PROVIDER" in
  opus) SYNTH_HEALTHY="$CLAUDE_HEALTHY" ;;
  codex) SYNTH_HEALTHY="$CODEX_HEALTHY" ;;
esac
if [ "$SYNTH_HEALTHY" -eq 0 ] && [ "$SYNTH_EXPLICIT" -eq 1 ]; then
  echo "ERROR: explicitly selected $SYNTH_PROVIDER synthesizer is no longer healthy; source reports remain in $REVIEWS_DIR" >&2
  exit 1
fi
if [ "$SYNTH_HEALTHY" -eq 0 ]; then
  if [ "$CLAUDE_HEALTHY" -eq 1 ]; then SYNTH_PROVIDER="opus"
  elif [ "$CODEX_HEALTHY" -eq 1 ]; then SYNTH_PROVIDER="codex"
  else
    echo "ERROR: no healthy provider remains for synthesis; source reports remain in $REVIEWS_DIR" >&2
    exit 1
  fi
  echo ">> super-oracle: WARNING: default synthesizer became unavailable; using $SYNTH_PROVIDER" >&2
fi

SYNTHESIS_BRIEFING="$LOGS_DIR/synthesis.briefing.md"
SYNTHESIS_STDERR="$LOGS_DIR/synthesis.stderr.log"
SYNTHESIS_STREAM="$LOGS_DIR/synthesis.stream.jsonl"
SYNTHESIS_PROMPT="$LOGS_DIR/synthesis.prompt.md"
SYNTHESIS_MODEL_STATE="$LOGS_DIR/synthesis.model"
SYNTHESIS_ARTIFACTS="$ARTIFACTS_DIR/synthesis"
build_synthesis_briefing "$SYNTHESIS_BRIEFING"

if [ "$SYNTH_PROVIDER" = "opus" ]; then
  if ! preflight_claude "$OPUS_MODEL"; then
    if [ "$SYNTH_EXPLICIT" -eq 1 ]; then
      echo "ERROR: explicitly selected Opus synthesizer lacks safe quota headroom" >&2; exit 1
    fi
    CLAUDE_HEALTHY=0
    if [ "$CODEX_HEALTHY" -eq 1 ]; then SYNTH_PROVIDER="codex"
    else echo "ERROR: no healthy synthesis fallback remains" >&2; exit 1
    fi
    echo ">> super-oracle: WARNING: Opus synthesis is unavailable; using $SYNTH_PROVIDER" >&2
  fi
fi

echo ">> super-oracle: phase 3/3 — synthesis by $SYNTH_PROVIDER" >&2
set +e
start_heartbeat
SYNTHESIS_RC=0
case "$SYNTH_PROVIDER" in
  opus)
    SYNTH_CLAUDE_LABEL="$CLAUDE_REVIEWER synthesizer"
    run_claude_phase "$SYNTHESIS_REVIEW" "$SYNTHESIS_CHECKPOINT" \
      "$SYNTHESIS_FABLE_CHECKPOINT" "$SYNTHESIS_ARTIFACTS" \
      "$SYNTHESIS_STDERR" "$SYNTHESIS_STREAM" "$SYNTHESIS_PROMPT" \
      "$SYNTHESIS_MODEL_STATE" "$SYNTHESIS_BRIEFING" "$CLAUDE_MODEL" \
      "$SYNTH_CLAUDE_LABEL" 0 &
    CLAUDE_PID=$!; wait "$CLAUDE_PID"; SYNTHESIS_RC=$?; CLAUDE_PID=""
    ;;
  codex)
    run_codex_phase "$SYNTHESIS_REVIEW" "$SYNTHESIS_CHECKPOINT" \
      "$SYNTHESIS_ARTIFACTS" "$SYNTHESIS_STDERR" "$SYNTHESIS_BRIEFING" \
      "Codex $CODEX_MODEL synthesizer" 0 "$SYNTHESIS_PROMPT" &
    CODEX_PID=$!; wait "$CODEX_PID"; SYNTHESIS_RC=$?; CODEX_PID=""
    ;;
esac
stop_heartbeat
set -e
recover_file_answer "synthesis" "$SYNTHESIS_REVIEW" "$SYNTHESIS_ARTIFACTS" || exit 1
[ "$SYNTHESIS_RC" -eq 0 ] || recover_checkpoint "synthesis" "$SYNTHESIS_REVIEW" "$SYNTHESIS_CHECKPOINT" || exit 1

SYNTHESIS_OK=0
if [ "$SYNTHESIS_RC" -eq 0 ] && [ -s "$SYNTHESIS_REVIEW" ] && [ -s "$SYNTHESIS_CHECKPOINT" ]; then
  SYNTHESIS_OK=1
fi

if [ "$DEGRADED" -eq 1 ]; then COUNCIL_STATUS="DEGRADED"; else COUNCIL_STATUS="COMPLETE"; fi
case "$SYNTH_PROVIDER" in
  opus) SYNTHESIZER_DISPLAY="$CLAUDE_REVIEWER" ;;
  codex) SYNTHESIZER_DISPLAY="Codex $CODEX_MODEL" ;;
esac
[ "$TEST_MODE" -eq 0 ] || SYNTHESIZER_DISPLAY="$SYNTHESIZER_DISPLAY (test)"
if ! {
  echo "# Super Oracle: Synthesized Review"
  echo
  if [ "$SYNTHESIS_OK" -eq 1 ]; then
    echo "Council status: **$COUNCIL_STATUS**. Synthesizer: **$SYNTHESIZER_DISPLAY**."
  else
    echo "Council status: **FAILED SYNTHESIS**. Requested synthesizer: **$SYNTHESIZER_DISPLAY**."
  fi
  if [ "$TEST_MODE" -eq 1 ]; then
    echo
    echo "Mode: **test** — cheap models; not an oracle verdict; cannot establish convergence."
  fi
  if [ "$DEGRADED" -eq 1 ]; then
    echo
    echo "Coverage was reduced by a missing, failed, partial, or unrefined provider. This cycle cannot establish convergence."
  fi
  echo
  echo "Evaluate every synthesized finding independently. You may accept or reject it. Fix only findings supported by the evidence, verify the changes, then run a fresh complete council cycle. Stop only when a non-degraded cycle leaves no remaining item you agree should be addressed."
  echo
  echo "Durable council files:"
  for provider in $REPORT_PROVIDERS; do
    echo "- $(provider_label "$provider") [$(provider_best_status "$provider")]: $(provider_best_path "$provider")"
  done
  echo "- Synthesis checkpoint: $SYNTHESIS_CHECKPOINT"
  echo
  echo "## Final synthesis"
  echo
  if [ -s "$SYNTHESIS_REVIEW" ]; then cat "$SYNTHESIS_REVIEW"
  else echo "_No synthesis was produced._"
  fi
} > "$OUTPUT"; then
  echo "ERROR: cannot write synthesized review to $OUTPUT" >&2; exit 1
fi

[ "$ORIGINAL_BRIEFING" = "$BRIEFING_SRC" ] || rm -f "$ORIGINAL_BRIEFING"
if [ "$SYNTHESIS_OK" -ne 1 ]; then
  echo "ERROR: $SYNTH_PROVIDER synthesis failed; partial output and council reports remain in $ARTIFACTS_DIR" >&2
  show_log_tail "synthesis" "$SYNTHESIS_STDERR"
  exit 1
fi

if [ "$DEGRADED" -eq 0 ]; then
  rm -f "$LOGS_DIR"/*
  if [ "$DEBUG_FILE_OWNED" -eq 1 ]; then rm -f "$DEBUG_FILE"; fi
fi
ARTIFACT_FILES="$(find "$ARTIFACTS_DIR" -type f ! -name "$OWN_MARKER" | sort)"
if [ -n "$ARTIFACT_FILES" ]; then
  { echo; echo "---"; echo "## Artifacts (preserve until reviewed)";
    printf '%s\n' "$ARTIFACT_FILES" | sed 's/^/- /'; } >> "$OUTPUT"
fi

TOTAL=$(( $(date +%s) - RUN_START ))
echo ">> super-oracle: done in $((TOTAL / 60))m$((TOTAL % 60))s — synthesized review in $OUTPUT" >&2
[ "$DEGRADED" -eq 0 ] || echo ">> super-oracle: WARNING: council completed with reduced coverage; this cycle cannot establish convergence" >&2
exit 0

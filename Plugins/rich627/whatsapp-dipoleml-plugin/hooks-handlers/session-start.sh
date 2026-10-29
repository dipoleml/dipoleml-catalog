#!/usr/bin/env bash

# WhatsApp channel onboarding — checks setup state and guides user through next steps.

STATE_DIR="${WHATSAPP_STATE_DIR:-${HOME}/.whatsapp-channel}"
ENV_FILE="${STATE_DIR}/.env"
AUTH_CREDS="${STATE_DIR}/.baileys_auth/creds.json"
ACCESS_FILE="${STATE_DIR}/access.json"

# Plugin root relative to this script's own location (not CWD): correct
# regardless of where the hook was launched from.
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Provider-specific onboarding never exposes credentials to model context.
provider_json="$(bun "${PLUGIN_ROOT}/scripts/provider-onboarding.ts" 2>/dev/null)"
if [[ -n ${provider_json} ]]; then
	echo "${provider_json}"
	exit 0
fi

# Check setup state
has_phone=false
has_auth=false
has_contacts=false

if [ -f "$ENV_FILE" ] && grep -q 'WHATSAPP_PHONE_NUMBER=' "$ENV_FILE" 2>/dev/null; then
	has_phone=true
fi

# Both JSON files are written pretty-printed (JSON.stringify with indent by
# server.ts/scripts/access.ts; Baileys may do either), so a pattern must not
# assume compact "key":value spacing — strip all whitespace before matching.
# Grepping the file directly only ever matched compact JSON, which left
# has_contacts false on every current install and buried the fully-configured
# branch (and the update notice) below.
json_has() {
	local flat
	flat="$(tr -d '[:space:]' <"${1}" 2>/dev/null)" || return 1
	grep -q "${2}" <<<"${flat}"
}

if [[ -f ${AUTH_CREDS} ]] && json_has "${AUTH_CREDS}" '"registered":true'; then
	has_auth=true
fi

if [[ -f ${ACCESS_FILE} ]] && json_has "${ACCESS_FILE}" '"allowFrom":\[".'; then
	has_contacts=true
fi

# Build context message based on state
# Reaching here means provider-onboarding.ts resolved linked-device mode. It
# sees plugin /config values too: Claude Code exports each userConfig option
# to hook processes as CLAUDE_PLUGIN_OPTION_<KEY>. NO DOUBLE QUOTES in
# provider_scope - it prefixes every branch below and is interpolated raw
# into the heredoc's JSON. The mismatch sentence only ever inserts fixed text.
provider_scope="Effective connection: linked device (Baileys, the default). "
# `|| true`: a missing .env is the normal first-run state, not an error.
saved_provider="$(sed -n 's/^WHATSAPP_PROVIDER=//p' "${ENV_FILE}" 2>/dev/null | tail -n 1 | tr -d "\"'[:space:]" || true)"
plugin_provider="$(tr -d '[:space:]' <<<"${CLAUDE_PLUGIN_OPTION_CONNECTION_PROVIDER-}")"
if [[ ${saved_provider} == baileys && ${plugin_provider} == cloud-api ]]; then
	provider_scope+="The terminal-saved provider baileys is in effect; the plugin setting cloud-api is ignored. "
fi
if [ "$has_phone" = false ]; then
	msg="${provider_scope}WhatsApp plugin installed but not configured yet. Run /whatsapp-channel:setup to choose linked device (Baileys, the existing default) or official WhatsApp Cloud API. Linked device uses a phone pairing code or QR; Cloud API requires Meta business configuration and a public HTTPS webhook. Credentials must be entered in the user’s own terminal, never in chat. Existing linked-device installs keep their current provider."
elif [ "$has_auth" = false ]; then
	msg="${provider_scope}WhatsApp phone number is configured but device is not paired yet.\n\nThe user needs to:\n1. Exit and launch: claude --dangerously-load-development-channels plugin:whatsapp-channel@whatsapp-claude-plugin\n2. The pairing code appears automatically in the session\n3. Enter it on phone: WhatsApp > Linked Devices > Link with phone number instead"
elif [ "$has_contacts" = false ]; then
	# The access screen is the normal route; pairing stays because it
	# is the only route for someone who has never messaged this account.
	# NO DOUBLE QUOTES IN THIS STRING. The three unconfigured branches are
	# interpolated RAW into the heredoc's JSON below, so a quote here ends the
	# JSON string. That is also why the absolute `bun "<path>" wizard` form
	# lives in scripts/access.ts, where JSON.stringify escapes it, and this
	# branch names the skill instead.
	msg="${provider_scope}WhatsApp is paired but no contacts are allowlisted yet. The owner JID is auto-added on connection.\n\nThe normal way to add the rest is the access screen - it opens in a new terminal window, lists the contacts and groups the user already talks to with anything already reachable pre-ticked, and applies the lot in one pass:\n\n1. Run: /whatsapp-channel:access review\n2. Tick contacts and groups there, then Apply. Only the +/- list comes back to this session.\n\nIf that window cannot be opened from here (a headless or remote session), the command prints itself - run it in a real terminal.\n\nFor someone who has never messaged this account, pairing is still the route:\n1. Run: /whatsapp-channel:access policy pairing\n2. Have them DM the linked number\n3. Run: /whatsapp-channel:access pair <code>\n4. Policy auto-locks back to allowlist after pairing"
else
	# Fully configured: check for a one-time "what's new" notice first. It
	# prints its own complete, already-valid JSON (built with
	# JSON.stringify, not hand-rolled here) when there's something new, and
	# nothing otherwise — a real bun script rather than more bash so version
	# compare and JSON escaping reuse localeCompare/JSON.stringify instead
	# of reimplementing both (see scripts/update-notice.ts).
	# Keep this one message free of backslash escapes, unlike the three
	# branches above. They are interpolated raw into the heredoc's JSON string,
	# so their "\n" has to be pre-escaped; this one ALSO goes through
	# JSON.stringify in update-notice.ts, which would escape the backslash
	# again and ship a literal \n to the model. Plain prose reads identically
	# down both paths.
	msg="${provider_scope}WhatsApp channel is fully configured and ready. Paired contacts can message this session."
	# Passed in because the notice REPLACES this handler's output: the script
	# carries this same message through on its own hookSpecificOutput, so a
	# session that gets a notice still briefs the model identically to one
	# that does not. The notice itself rides on systemMessage, which goes to
	# the user's screen instead of costing model context.
	notice_json="$(bun "${PLUGIN_ROOT}/scripts/update-notice.ts" "${msg}" 2>/dev/null)"
	if [[ -n ${notice_json} ]]; then
		echo "${notice_json}"
		exit 0
	fi
fi

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "${msg}"
  }
}
EOF

exit 0

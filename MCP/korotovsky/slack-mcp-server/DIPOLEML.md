# Slack MCP Server

**DipoleML integration** for Korotovsky. Type: `mcp`. Version: `0.0.0`.

The most powerful MCP Slack Server with no permission requirements, Apps support, GovSlack, DMs, Group DMs and smart history fetch logic.

## Upstream

- Repository: https://github.com/korotovsky/slack-mcp-server
- Commit: `b88c0de3f706f4f07337c9eda7133c736d1c9524`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- env: IMPORTANT, SLACK_MCP_XOXC_TOKEN, SLACK_MCP_XOXD_TOKEN, SLACK_MCP_XOXP_TOKEN, SLACK_MCP_XOXB_TOKEN, SLACK_MCP_PORT, SLACK_MCP_HOST, SLACK_MCP_API_KEY, SLACK_MCP_ADD_MESSAGE_UNFURLING
- credentials: SLACK_MCP_XOXC_TOKEN, SLACK_MCP_XOXD_TOKEN, SLACK_MCP_XOXP_TOKEN, SLACK_MCP_XOXB_TOKEN, SLACK_MCP_API_KEY

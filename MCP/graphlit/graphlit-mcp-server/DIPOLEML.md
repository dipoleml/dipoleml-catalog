# Graphlit MCP Server

**DipoleML integration** for Graphlit. Type: `mcp`. Version: `1.0.1`.

Model Context Protocol (MCP) Server for Graphlit Platform

## Upstream

- Repository: https://github.com/graphlit/graphlit-mcp-server
- Commit: `1b94b887ba1692f7226ebc306b9ab7a02ce8b0f4`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y graphlit-mcp-server

## Requirements

- runtimes: node >=18.0.0
- packages: graphlit-mcp-server
- env: GRAPHLIT_JWT_SECRET, SLACK_BOT_TOKEN, DISCORD_BOT_TOKEN, TWITTER_TOKEN, GOOGLE_EMAIL_REFRESH_TOKEN, GOOGLE_EMAIL_CLIENT_SECRET, LINEAR_API_KEY, GITHUB_PERSONAL_ACCESS_TOKEN, JIRA_TOKEN, NOTION_API_KEY
- credentials: GRAPHLIT_JWT_SECRET, SLACK_BOT_TOKEN, DISCORD_BOT_TOKEN, TWITTER_TOKEN, GOOGLE_EMAIL_REFRESH_TOKEN, GOOGLE_EMAIL_CLIENT_SECRET, LINEAR_API_KEY, GITHUB_PERSONAL_ACCESS_TOKEN

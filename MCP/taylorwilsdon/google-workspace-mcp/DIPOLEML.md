# Google Workspace MCP

**DipoleML integration** for Taylorwilsdon. Type: `mcp`. Version: `0.0.0`.

Control Gmail, Google Calendar, Docs, Sheets, Slides, Chat, Forms, Tasks, Search & Drive with AI - Comprehensive Google Workspace MCP Server & CLI Tool

## Upstream

- Repository: https://github.com/taylorwilsdon/google_workspace_mcp
- Commit: `c0bff66e6842720cfdeebbfa38d7f9731c496fe3`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3
- packages: workspace-mcp
- env: GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_CLIENT_SECRET_PATH, WORKSPACE_MCP_PORT, OAUTHLIB_INSECURE_TRANSPORT, WORKSPACE_EXTERNAL_URL, WORKSPACE_MCP_GOOGLE_API_WORKERS, WORKSPACE_MCP_GOOGLE_API_TIMEOUT_SECONDS, WORKSPACE_MCP_TOKEN_VALIDATION_WORKERS, WORKSPACE_MCP_TOKEN_VALIDATION_CACHE_TTL, WORKSPACE_MCP_ALLOWED_HOSTS
- credentials: GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_CLIENT_SECRET_PATH, WORKSPACE_MCP_TOKEN_VALIDATION_WORKERS, WORKSPACE_MCP_TOKEN_VALIDATION_CACHE_TTL

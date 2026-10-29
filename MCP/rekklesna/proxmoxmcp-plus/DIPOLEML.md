# Proxmoxmcp Plus

**DipoleML integration** for Rekklesna. Type: `mcp`. Version: `0.0.0`.

Use MCP and OpenAPI to safely control Proxmox VE VMs, LXCs, backups, and snapshots from LLMs and AI agents.

## Upstream

- Repository: https://github.com/RekklesNA/ProxmoxMCP-Plus
- Commit: `ab1fcf757f0f270e91072f546467578692cd7d7c`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3, python3, python3
- packages: proxmox-mcp-plus
- env: MCP_API_KEY, PROXMOX_API_KEY, MCP_HOST, MCP_PORT, MCP_TRANSPORT, MCP_OAUTH_DATABASE_URL, MCP_ALLOWED_HOSTS, MCP_OAUTH_ACCESS_TOKEN_TTL_SECONDS, MCP_OAUTH_REFRESH_TOKEN_TTL_SECONDS, MCP_OAUTH_KEY_VERSION, PROXMOX_HOST, PROXMOX_TOKEN_NAME
- credentials: MCP_API_KEY, PROXMOX_API_KEY, MCP_OAUTH_ACCESS_TOKEN_TTL_SECONDS, MCP_OAUTH_REFRESH_TOKEN_TTL_SECONDS, MCP_OAUTH_KEY_VERSION, PROXMOX_TOKEN_NAME, PROXMOX_TOKEN_VALUE

# MCP Remote

**DipoleML integration** for Punkpeye. Type: `mcp`. Version: `0.1.38`.

Connect an MCP Client that only supports local (stdio) servers to a Remote MCP Server.

## Upstream

- Repository: https://github.com/punkpeye/mcp-remote
- Commit: `373f7320f6afd1fdb00e0168826a3cea99102241`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y mcp-remote
- mcp-stdio · npx -y mcp-remote

## Requirements

- runtimes: node
- packages: mcp-remote
- env: AUTH_TOKEN, MCP_REMOTE_CLIENT_SECRET, MCP_CLIENT_SECRET
- credentials: AUTH_TOKEN, MCP_REMOTE_CLIENT_SECRET, MCP_CLIENT_SECRET

# Brave Search MCP Server

**DipoleML integration** for Brave. Type: `mcp`. Version: `2.1.4`.



## Upstream

- Repository: https://github.com/brave/brave-search-mcp-server
- Commit: `ee06f81e2c028c7f25a2a87a85994d0dbe241a8e`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @brave/brave-search-mcp-server

## Requirements

- runtimes: node
- packages: @brave/brave-search-mcp-server
- env: BRAVE_MCP_TRANSPORT, BRAVE_API_KEY, BRAVE_API_KEY_FILE, BRAVE_MCP_PORT, BRAVE_MCP_HOST, BRAVE_MCP_ALLOWED_HOSTS, YOUR_API_KEY_HERE
- credentials: BRAVE_API_KEY, BRAVE_API_KEY_FILE, YOUR_API_KEY_HERE

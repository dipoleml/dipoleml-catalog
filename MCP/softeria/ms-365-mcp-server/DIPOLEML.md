# Ms 365 MCP Server

**DipoleML integration** for Softeria. Type: `mcp`. Version: `0.0.0-development`.

A Model Context Protocol (MCP) server for interacting with Microsoft 365 and Microsoft Office services through the Graph API

## Upstream

- Repository: https://github.com/Softeria/ms-365-mcp-server
- Commit: `d0a018ff2a2b28fd137515d6e3822b2a56cdf868`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @softeria/ms-365-mcp-server

## Requirements

- runtimes: node >=18
- packages: @softeria/ms-365-mcp-server
- env: MS365_MCP_GRAPH_BASE_URL, MS365_MCP_CLIENT_SECRET, OPENAI_API_KEY, MS365_MCP_OAUTH_TOKEN, MS365_MCP_ATTACHMENT_PORT, MS365_MCP_ATTACHMENT_HOST, MS365_MCP_KEYVAULT_URL, MS365_MCP_TOKEN_CACHE_PATH, MS365_MCP_ATTACHMENT_URL_TTL_S, MS365_MCP_ATTACHMENT_URL_BASE, MS365_MCP_ATTACHMENT_URL_KEY, MS365_MCP_ATTACHMENT_URL_KEY_ID
- credentials: MS365_MCP_CLIENT_SECRET, OPENAI_API_KEY, MS365_MCP_OAUTH_TOKEN, MS365_MCP_KEYVAULT_URL, MS365_MCP_TOKEN_CACHE_PATH, MS365_MCP_ATTACHMENT_URL_KEY, MS365_MCP_ATTACHMENT_URL_KEY_ID, MS365_MCP_USE_KEYTAR

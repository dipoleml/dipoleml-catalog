# Notion MCP Server

**DipoleML integration** for Notion. Type: `mcp`. Version: `2.6.0`.

Official Notion MCP Server

## Upstream

- Repository: https://github.com/makenotion/notion-mcp-server
- Commit: `d221339a14fd452429cb81bec559d445364de8a6`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @notionhq/notion-mcp-server

## Requirements

- runtimes: node
- packages: @notionhq/notion-mcp-server
- env: OPENAPI_MCP_HEADERS, NOTION_TOKEN, AUTH_TOKEN
- credentials: NOTION_TOKEN, AUTH_TOKEN

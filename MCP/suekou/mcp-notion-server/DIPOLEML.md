# MCP Notion Server

**DipoleML integration** for Suekou. Type: `mcp`. Version: `2.0.2`.

A Model Context Protocol server for connecting Notion to MCP-compatible clients

## Upstream

- Repository: https://github.com/suekou/mcp-notion-server
- Commit: `efa09a200932ca62b6eda5aa194e654c80cef6d0`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @suekou/mcp-notion-server

## Requirements

- runtimes: node >=22
- packages: @suekou/mcp-notion-server
- env: NOTION_API_TOKEN
- credentials: NOTION_API_TOKEN

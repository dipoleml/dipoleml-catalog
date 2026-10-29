# Drawio MCP Server

**DipoleML integration** for Lgazo. Type: `mcp`. Version: `2.1.0`.

Draw.io Model Context Protocol (MCP) Server

## Upstream

- Repository: https://github.com/lgazo/drawio-mcp-server
- Commit: `d2f7c32fa91606c53bb184f429ea58ebaf26a255`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE.md` for the
upstream license.

## Entrypoints

- mcp-stdio · npx chrome-devtools-mcp@latest --browser-url=http://127.0.0.1:9226
- mcp-stdio · npx @playwright/mcp@latest --cdp-endpoint http://127.0.0.1:9226
- mcp-http · drawio · http://localhost:3000/mcp

## Requirements

- runtimes: node
- packages: drawio-mcp

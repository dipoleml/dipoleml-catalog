# Linkedin MCP Server

**DipoleML integration** for Stickerdaniel. Type: `mcp`. Version: `0.0.0`.

Open-source MCP server for LinkedIn. Give DipoleML and any MCP-compatible AI agent access to profiles, companies, jobs, and messages.

## Upstream

- Repository: https://github.com/stickerdaniel/linkedin-mcp-server
- Commit: `a48e21c3154a5e628a8f7d5d96d3d0f5f1dece09`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-http · greptile · https://api.greptile.com/mcp

## Requirements

- runtimes: python3
- packages: mcp-server-linkedin
- env: AUTO_IMPORT_FROM_BROWSER, FASTMCP_HTTP_ALLOWED_HOSTS, IMPORTANT

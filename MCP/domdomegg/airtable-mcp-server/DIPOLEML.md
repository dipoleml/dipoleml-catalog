# Airtable MCP Server

**DipoleML integration** for Domdomegg. Type: `mcp`. Version: `1.14.0`.

🗂️🤖 Airtable Model Context Protocol Server, for allowing AI systems to interact with your Airtable bases

## Upstream

- Repository: https://github.com/domdomegg/airtable-mcp-server
- Commit: `95c74dbc099704f96d6281f4e6d7f5d6d2d6305a`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y airtable-mcp-server

## Requirements

- runtimes: node
- packages: airtable-mcp-server
- env: AIRTABLE_API_KEY, MCP_TRANSPORT
- credentials: AIRTABLE_API_KEY

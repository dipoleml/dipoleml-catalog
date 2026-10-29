# MCP Bridge

**DipoleML integration** for Secretiveshell. Type: `mcp`. Version: `0.0.0`.

A middleware to provide an openAI compatible endpoint that can call MCP tools

## Upstream

- Repository: https://github.com/SecretiveShell/MCP-Bridge
- Commit: `df1dcc58cac7bf2a4ead5f5630eb970f42999c57`
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
- packages: mcp-bridge
- env: MCP_BRIDGE__CONFIG__HTTP_URL

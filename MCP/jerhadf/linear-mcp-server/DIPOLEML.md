# Linear MCP Server

**DipoleML integration** for Jerhadf. Type: `mcp`. Version: `0.1.0`.

A server that integrates Linear's project management system with the Model Context Protocol (MCP) to allow LLMs to interact with Linear.

## Upstream

- Repository: https://github.com/jerhadf/linear-mcp-server
- Commit: `5e2cb621c52762618eb015b4a8d6bf884021b29e`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y linear-mcp-server

## Requirements

- runtimes: node
- packages: linear-mcp-server
- env: IMPORTANT, LINEAR_API_KEY
- credentials: LINEAR_API_KEY

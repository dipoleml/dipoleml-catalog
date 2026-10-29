# Ghidra MCP

**DipoleML integration** for Bethington. Type: `mcp`. Version: `0.0.0`.

Ghidra MCP Server — 200+ MCP tools for AI-powered reverse engineering. GUI plugin + headless server, lazy tool loading, convention enforcement, batch operations, Ghidra Server integration, and Docker deployment.

## Upstream

- Repository: https://github.com/bethington/ghidra-mcp
- Commit: `f86152842c81d774afe16d172a50d17bc418a8d7`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3
- packages: ghidra-mcp-bridge
- env: GHIDRA_MCP_URL, GHIDRA_MCP_ALLOWED_HOSTS, GHIDRA_MCP_INBOUND_TOKEN, GHIDRA_MCP_AUTH_TOKEN, GHIDRA_DEBUGGER_URL, GHIDRA_MCP_ARCHIVE_URL, GHIDRA_MCP_PORT
- credentials: GHIDRA_MCP_INBOUND_TOKEN, GHIDRA_MCP_AUTH_TOKEN

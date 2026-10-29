# Metatrader MCP Server

**DipoleML integration** for Ariadng. Type: `mcp`. Version: `0.0.0`.

Model Context Protocol (MCP) to enable AI LLMs to trade using MetaTrader platform

## Upstream

- Repository: https://github.com/ariadng/metatrader-mcp-server
- Commit: `bd2ff591e32cb492fafefe74221d502dd78b71ef`
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
- packages: metatrader-mcp-server
- env: QUOTE_HOST, QUOTE_PORT, MCP_TRANSPORT, MCP_HOST, MCP_PORT

# Alpaca MCP Server

**DipoleML integration** for Alpacahq. Type: `mcp`. Version: `0.0.0`.

Alpaca’s official MCP Server lets you trade stocks, ETFs, crypto, and options, run data analysis, and build strategies in plain English directly from your favorite LLM tools and IDEs

## Upstream

- Repository: https://github.com/alpacahq/alpaca-mcp-server
- Commit: `d8dac43f3e17594e8879bac3b5b333196ea69aac`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3, python3
- packages: alpaca-mcp-server
- env: ALPACA_API_KEY, ALPACA_SECRET_KEY, FASTMCP_HTTP_ALLOWED_HOSTS
- credentials: ALPACA_API_KEY, ALPACA_SECRET_KEY

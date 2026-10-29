# Maverick MCP

**DipoleML integration** for Wshobson. Type: `mcp`. Version: `0.0.0`.

Stock market MCP server for Yahoo Finance data, technical analysis, portfolio tracking, and Python backtesting. Runs locally with no API key for core tools.

## Upstream

- Repository: https://github.com/wshobson/maverick-mcp
- Commit: `da70d074dcdac5fb21e3b2e6383cfebf391f28b5`
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
- packages: maverick-mcp-server
- env: DATABASE_URL, POSTGRES_URL, REDIS_HOST, LLM_API_KEY, LLM_BASE_URL, EXA_API_KEY, SEARXNG_BASE_URL
- credentials: LLM_API_KEY, EXA_API_KEY

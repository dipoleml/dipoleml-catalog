# Nse Bse Indian Stock Market Data MCP

**DipoleML integration** for Tapetide Hq. Type: `mcp`. Version: `1.0.9`.

Indian stock market MCP server for NSE & BSE — 48 tools (55 with aliases) for about 8,000 stocks: live quotes, financials, technicals, 326-ratio screener, FII/DII flows, option chains & IV, filings, IPOs & portfolio. Remote (OAuth) or npx. Works with DipoleML, ChatGPT, Cursor, VS Code, Codex & Gemini CLI

## Upstream

- Repository: https://github.com/Tapetide-hq/nse-bse-indian-stock-market-data-mcp
- Commit: `946d7b846767535f17c5fe3d5b838af07cdda60f`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y tapetide-mcp

## Requirements

- runtimes: node >=18
- packages: tapetide-mcp
- env: TAPETIDE_TOKEN, YOUR_TOKEN_HERE, TAPETIDE_MCP_URL
- credentials: TAPETIDE_TOKEN, YOUR_TOKEN_HERE

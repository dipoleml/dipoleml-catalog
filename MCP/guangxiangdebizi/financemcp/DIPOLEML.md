# Financemcp

**DipoleML integration** for Guangxiangdebizi. Type: `mcp`. Version: `4.11.2`.

这是一个金融领域相关的mcp,本项目通过集成 Tushare API 和 Binance API 为语言模型（如DipoleML）提供全面的实时金融数据访问能力，支持股票、基金、债券、宏观经济指标、稳定币、虚拟货币等多维度金融数据分析。其中也包含了金融数据查询、财经新闻查询、国家统计局数据查询等

## Upstream

- Repository: https://github.com/guangxiangdebizi/FinanceMCP
- Commit: `bed91845005a5f8bbd2816ffd356f0a85b47b2d5`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y finance-mcp
- mcp-stdio · npx -y finance-mcp
- mcp-stdio · npx -y finance-mcp
- mcp-stdio · npx -y finance-mcp

## Requirements

- runtimes: node >=20
- packages: finance-mcp
- env: IMPORTANT, YOUR_TUSHARE_TOKEN, YOUR_QVERIS_API_KEY, YOUR_TWINGLY_API_KEY, QVERIS_API_KEY, TWINGLY_API_KEY, TUSHARE_TOKEN, QVERIS_BASE_URL, TWINGLY_BASE_URL, MCP_HTTP_HOST, MCP_ALLOWED_HOSTS, GITHUB_TOKEN
- credentials: YOUR_TUSHARE_TOKEN, YOUR_QVERIS_API_KEY, YOUR_TWINGLY_API_KEY, QVERIS_API_KEY, TWINGLY_API_KEY, TUSHARE_TOKEN, GITHUB_TOKEN

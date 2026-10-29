# Wenyan MCP

**DipoleML integration** for Caol64. Type: `mcp`. Version: `2.0.4`.

文颜 MCP Server 可以让 AI 自动将 Markdown 文章排版后发布至微信公众号。

## Upstream

- Repository: https://github.com/caol64/wenyan-mcp
- Commit: `83874e9eb3a9ac1b637330df0cceaf8b4784d902`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @wenyan-md/mcp

## Requirements

- runtimes: node
- packages: @wenyan-md/mcp
- env: WECHAT_APP_SECRET, IMPORTANT, HOST_FILE_PATH, MCP_PROXY_AUTH_TOKEN
- credentials: WECHAT_APP_SECRET, MCP_PROXY_AUTH_TOKEN

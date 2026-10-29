# Js Reverse MCP

**DipoleML integration** for Zhizhuodemao. Type: `mcp`. Version: `4.0.5`.

AI Agent-first JS 逆向 MCP Server：有头 Chrome 调试、断点、网络/WebSocket 分析、Patchright 反检测，可选 CloakBrowser。

## Upstream

- Repository: https://github.com/zhizhuodemao/js-reverse-mcp
- Commit: `bf7dc506e8743ba1ec5bd3325c91818b9192e40e`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y js-reverse-mcp

## Requirements

- runtimes: node ^20.19.0 || ^22.12.0 || >=23
- packages: js-reverse-mcp
- env: MCP_ROUTING_EVAL_API_KEY
- credentials: MCP_ROUTING_EVAL_API_KEY

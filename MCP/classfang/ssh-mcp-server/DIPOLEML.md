# Ssh MCP Server

**DipoleML integration** for Classfang. Type: `mcp`. Version: `1.10.0`.

基于 SSH 的 MCP 服务 🧙‍♀️。已被MCP官方收录 🎉。 SSH MCP Server 🧙‍♀️. It has been included in the community MCP repository 🎉.

## Upstream

- Repository: https://github.com/classfang/ssh-mcp-server
- Commit: `f814a4e7205703cb1b910e48d1de5d5c37b2cc63`
- License: ISC (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @fangjunjie/ssh-mcp-server

## Requirements

- runtimes: node
- packages: @fangjunjie/ssh-mcp-server
- env: SSH_MCP_HTTP_TOKEN
- credentials: SSH_MCP_HTTP_TOKEN

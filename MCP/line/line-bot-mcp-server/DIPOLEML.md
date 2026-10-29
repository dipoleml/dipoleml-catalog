# Line Bot MCP Server

**DipoleML integration** for Line. Type: `mcp`. Version: `0.0.1-local`.

MCP server that integrates the LINE Messaging API to connect an AI Agent to the LINE Official Account.

## Upstream

- Repository: https://github.com/line/line-bot-mcp-server
- Commit: `3b6f23ad329d4e40f2c011a68d74f1ed1efb1999`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @line/line-bot-mcp-server

## Requirements

- runtimes: node >=22
- packages: @line/line-bot-mcp-server
- env: CHANNEL_ACCESS_TOKEN, YOUR_CHANNEL_ACCESS_TOKEN
- credentials: CHANNEL_ACCESS_TOKEN, YOUR_CHANNEL_ACCESS_TOKEN

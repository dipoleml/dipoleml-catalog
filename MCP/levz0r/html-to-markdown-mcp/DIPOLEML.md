# Html to Markdown MCP

**DipoleML integration** for Levz0r. Type: `mcp`. Version: `1.0.2`.

MCP server for converting HTML to Markdown using Turndown.js. Fetch web pages and convert them to clean, formatted Markdown.

## Upstream

- Repository: https://github.com/levz0r/html-to-markdown-mcp
- Commit: `0e0224e60f0f38df93c34da612d471465e6ed1f8`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · node ${CLAUDE_PLUGIN_ROOT}/index.js
- mcp-stdio · npx -y html-to-markdown-mcp
- mcp-stdio · node ./index.js

## Requirements

- runtimes: node
- packages: html-to-markdown-mcp

# Playwright MCP

**DipoleML integration** for Microsoft. Type: `mcp`. Version: `0.0.83`.

Playwright MCP server

## Upstream

- Repository: https://github.com/microsoft/playwright-mcp
- Commit: `0c4107acbecb75472b23c05c0e42471a0011874f`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @playwright/mcp
- mcp-stdio · node cli.js

## Requirements

- runtimes: node >=18
- packages: @playwright/mcp
- env: PLAYWRIGHT_MCP_ALLOWED_HOSTS, PLAYWRIGHT_MCP_CDP_HEADERS, PLAYWRIGHT_MCP_HOST, PLAYWRIGHT_MCP_PORT, PLAYWRIGHT_MCP_SECRETS_FILE, PLAYWRIGHT_MCP_VIEWPORT_SIZE, IMPORTANT
- credentials: PLAYWRIGHT_MCP_SECRETS_FILE

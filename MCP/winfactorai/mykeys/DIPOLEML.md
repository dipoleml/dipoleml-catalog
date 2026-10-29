# Mykeys

**DipoleML integration** for Winfactorai. Type: `mcp`. Version: `0.2.0`.

MyKeys — local-first credential vault for AI agents: encrypted secrets on your machine, short-lived tokens for AI use, per-purpose usage audit. DipoleML plugin / MCP server.

## Upstream

- Repository: https://github.com/WinFactorAI/MyKeys
- Commit: `54b622a6122c9ba29bc8e6302d3001a536f884d0`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · node ${ZCODE_PLUGIN_ROOT}/server/index.js
- mcp-stdio · npx -y mkeys
- mcp-stdio · node bin/mykeys.js

## Requirements

- runtimes: node >=18
- packages: mkeys
- env: MKEYS_ALLOW_REVEAL, ORDERS_CLIENT_SECRET, MKEYS_ADMIN_TOKEN, MKEYS_HOME, MKEYS_MASTER_KEY, MKEYS_ALLOW_PRIVATE_ENDPOINTS, MKEYS_DEBUG
- credentials: MKEYS_ALLOW_REVEAL, ORDERS_CLIENT_SECRET, MKEYS_ADMIN_TOKEN, MKEYS_HOME, MKEYS_MASTER_KEY, MKEYS_ALLOW_PRIVATE_ENDPOINTS, MKEYS_DEBUG

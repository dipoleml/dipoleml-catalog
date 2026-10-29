# MCP Server Odoo

**DipoleML integration** for Ivnvxd. Type: `mcp`. Version: `0.0.0`.

Model Context Protocol (MCP) server that enables AI assistants to securely interact with Odoo ERP systems through standardized resources and tools for data retrieval and manipulation.

## Upstream

- Repository: https://github.com/ivnvxd/mcp-server-odoo
- Commit: `64b52df7ae3bb13cd6e07bebaf36913a1141ac48`
- License: MPL-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3
- packages: mcp-server-odoo
- env: ODOO_URL, ODOO_API_KEY, ODOO_RPC_TRANSPORT, ODOO_MCP_TRANSPORT, ODOO_MCP_HOST, ODOO_MCP_PORT, ODOO_MCP_ALLOWED_HOSTS
- credentials: ODOO_API_KEY

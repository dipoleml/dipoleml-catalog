# Mongodb MCP Server

**DipoleML integration** for Mongodb Js. Type: `mcp`. Version: `3.2.1`.

A Model Context Protocol server to connect to MongoDB databases and MongoDB Atlas Clusters.

## Upstream

- Repository: https://github.com/mongodb-js/mongodb-mcp-server
- Commit: `7e4d9ed409905f1dc4304b5e7f1a176af22efe58`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: node ^20.19.0 || ^22.13.0 || >= 24.0.0
- packages: mongodb-mcp-server-monorepo
- env: MDB_MCP_API_CLIENT_ID, MDB_MCP_API_CLIENT_SECRET, MDB_MCP_ASSISTANT_BASE_URL, MDB_MCP_DANGEROUS_HOST_BINDING, MDB_MCP_EXPORT_CLEANUP_INTERVAL_MS, MDB_MCP_EXPORT_TIMEOUT_MS, MDB_MCP_EXPORTS_PATH, MDB_MCP_HEALTH_CHECK_HOST, MDB_MCP_HEALTH_CHECK_PORT, MDB_MCP_HTTP_HEADERS, MDB_MCP_HTTP_HOST, MDB_MCP_HTTP_PORT
- credentials: MDB_MCP_API_CLIENT_SECRET, MDB_MCP_VOYAGE_API_KEY

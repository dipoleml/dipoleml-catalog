# MCP Server Mysql

**DipoleML integration** for Benborla. Type: `mcp`. Version: `2.0.9`.

A Model Context Protocol server that provides read-only access to MySQL databases. This server enables LLMs to inspect database schemas and execute read-only queries.

## Upstream

- Repository: https://github.com/benborla/mcp-server-mysql
- Commit: `b9c714e182422b9f18437242b80cf003adf1c7ea`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE.md` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @benborla29/mcp-server-mysql
- mcp-stdio · npx -y @benborla29/mcp-server-mysql

## Requirements

- runtimes: node
- packages: @benborla29/mcp-server-mysql
- env: MYSQL_HOST, MYSQL_PORT

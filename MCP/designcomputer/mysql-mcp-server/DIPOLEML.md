# Mysql MCP Server

**DipoleML integration** for Designcomputer. Type: `mcp`. Version: `0.0.0`.

A Model Context Protocol (MCP) server that enables secure interaction with MySQL databases

## Upstream

- Repository: https://github.com/designcomputer/mysql_mcp_server
- Commit: `943ce83816372a03e5872be5424ebfcf252aa5ac`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3, python3
- packages: mysql_mcp_server
- env: MCP_TRANSPORT, MYSQL_HOST, MYSQL_PORT, MCP_SSE_HOST, MCP_SSE_PORT, MCP_SSE_ALLOWED_HOSTS, MYSQL_SSH_HOST, MYSQL_SSH_PORT, MYSQL_SSH_KEY_PATH, MYSQL_SSH_REMOTE_HOST, MYSQL_SSH_REMOTE_PORT, MYSQL_LOCAL_PORT
- credentials: MYSQL_SSH_KEY_PATH

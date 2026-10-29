# Atlas MCP Server

**DipoleML integration** for Cyanheads. Type: `mcp`. Version: `2.8.15`.

A Model Context Protocol (MCP) server for ATLAS, a Neo4j-powered task management system for LLM Agents - implementing a three-tier architecture (Projects, Tasks, Knowledge) to manage complex workflows. Now with Deep Research.

## Upstream

- Repository: https://github.com/cyanheads/atlas-mcp-server
- Commit: `5a0bfdc08f9d0d106e69432bcaa606cc414340f1`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y atlas-mcp-server

## Requirements

- runtimes: node >=16.0.0
- packages: atlas-mcp-server
- env: MCP_TRANSPORT_TYPE, MCP_HTTP_HOST, MCP_HTTP_PORT, MCP_AUTH_SECRET_KEY
- credentials: MCP_AUTH_SECRET_KEY

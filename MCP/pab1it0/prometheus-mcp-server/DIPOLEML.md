# Prometheus MCP Server

**DipoleML integration** for Pab1it0. Type: `mcp`. Version: `0.0.0`.

A Model Context Protocol (MCP) server that enables AI agents and LLMs to query and analyze Prometheus metrics through standardized interfaces.

## Upstream

- Repository: https://github.com/pab1it0/prometheus-mcp-server
- Commit: `a6bc50bc486ae969b284fb03c700d95149220963`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3
- packages: prometheus_mcp_server
- env: PROMETHEUS_URL, PROMETHEUS_URL_SSL_VERIFY, PROMETHEUS_TOKEN, PROMETHEUS_CLIENT_KEY, PROMETHEUS_MCP_SERVER_TRANSPORT, PROMETHEUS_MCP_BIND_HOST, PROMETHEUS_MCP_BIND_PORT, PROMETHEUS_CUSTOM_HEADERS
- credentials: PROMETHEUS_TOKEN, PROMETHEUS_CLIENT_KEY

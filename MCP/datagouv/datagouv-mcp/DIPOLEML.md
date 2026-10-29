# Datagouv MCP

**DipoleML integration** for Datagouv. Type: `mcp`. Version: `0.0.0`.

Official data.gouv.fr Model Context Protocol (MCP) server that allows AI chatbots to search, explore, and analyze datasets from the French national Open Data platform, directly through conversation.

## Upstream

- Repository: https://github.com/datagouv/datagouv-mcp
- Commit: `01db2a6f3052c5248ad5a7d96030c65ee61f5edd`
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
- packages: datagouv-mcp
- env: MCP_PORT, DATAGOUV_API_ENV, MCP_HOST, SENTRY_DSN

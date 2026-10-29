# MCP Hub

**DipoleML integration** for Ravitemer. Type: `mcp`. Version: `4.2.1`.

A centralized manager for Model Context Protocol (MCP) servers with dynamic server management and monitoring

## Upstream

- Repository: https://github.com/ravitemer/mcp-hub
- Commit: `9c7670a4c341ed3cf738a6242c0fde1cea40bccf`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE.md` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y mcp-hub

## Requirements

- runtimes: node
- packages: mcp-hub
- env: API_KEY, PERPLEXITY_API_KEY, API_TOKEN, DB_URL, MY_TOKEN
- credentials: API_KEY, PERPLEXITY_API_KEY, API_TOKEN, MY_TOKEN

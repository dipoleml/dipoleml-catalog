# Duckduckgo MCP Server

**DipoleML integration** for Nickclyde. Type: `mcp`. Version: `0.0.0`.

A Model Context Protocol (MCP) server that provides web search capabilities through DuckDuckGo, with additional features for content fetching and parsing.

## Upstream

- Repository: https://github.com/nickclyde/duckduckgo-mcp-server
- Commit: `8182af3f2295017ca90527a924f48147fbf18d5b`
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
- packages: duckduckgo-mcp-server
- env: DDG_FETCH_HOST_RPM, DDG_REF_URL_THRESHOLD, DDG_ALLOWED_HOSTS, DDG_ALLOW_PRIVATE_URLS

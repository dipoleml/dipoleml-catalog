# Tavily MCP

**DipoleML integration** for Tavily Ai. Type: `mcp`. Version: `0.2.23`.

Production ready MCP server with real-time search, extract, map & crawl.

## Upstream

- Repository: https://github.com/tavily-ai/tavily-mcp
- Commit: `3be0c424ed2e9132e3830aa6a8a41ba96becd6d6`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y tavily-mcp

## Requirements

- runtimes: node
- packages: tavily-mcp
- env: TAVILY_API_KEY
- credentials: TAVILY_API_KEY

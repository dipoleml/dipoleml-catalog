# Firecrawl MCP Server

**DipoleML integration** for Firecrawl. Type: `mcp`. Version: `3.36.0`.

Official Firecrawl MCP server, the context API for AI agents: search, scrape, and interact with the web, plus parse, crawl, map, Agent and Monitor, from any MCP client.

## Upstream

- Repository: https://github.com/firecrawl/firecrawl-mcp-server
- Commit: `6c6aed6039a9e27502ea3f240aa75bb1d68c716f`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y firecrawl-mcp

## Requirements

- runtimes: node >=22.0.0
- packages: firecrawl-mcp
- env: FIRECRAWL_API_KEY, YOUR_API_KEY, FIRECRAWL_MCP_ALLOWED_HOSTS, FIRECRAWL_API_URL, FIRECRAWL_OAUTH_TOKEN, YOUR_API_KEY_HERE
- credentials: FIRECRAWL_API_KEY, YOUR_API_KEY, FIRECRAWL_OAUTH_TOKEN, YOUR_API_KEY_HERE

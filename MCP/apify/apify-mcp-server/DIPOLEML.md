# Apify MCP Server

**DipoleML integration** for Apify. Type: `mcp`. Version: `0.19.6`.

The Apify MCP server enables your AI agents to extract data from social media, search engines, maps, e-commerce sites, or any other website using thousands of ready-made scrapers, crawlers, and automation tools available on the Apify Store.

## Upstream

- Repository: https://github.com/apify/apify-mcp-server
- Commit: `a4f60404fc05814033303068d12bdf394bf80cbf`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE.md` for the
upstream license.

## Entrypoints

- mcp-http · dev · http://localhost:3001
- mcp-stdio · node dist/stdio.js
- mcp-stdio · node dist/stdio.js --tools=actors,docs,runs,storage,tasks,schedules,apify/rag-web-browser
- mcp-stdio · npx -y @apify/actors-mcp-server

## Requirements

- runtimes: node >=22.0.0
- packages: @apify/actors-mcp-server
- env: APIFY_TOKEN, YOUR_SKYFIRE_API_KEY, APIFY_META_ORIGIN
- credentials: APIFY_TOKEN, YOUR_SKYFIRE_API_KEY

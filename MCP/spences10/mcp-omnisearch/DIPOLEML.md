# MCP Omnisearch

**DipoleML integration** for Spences10. Type: `mcp`. Version: `0.2.1`.

🔍 A Model Context Protocol (MCP) server providing unified access to multiple search engines (Tavily, Brave, Kagi, Exa), AI tools (Kagi FastGPT, Exa, Linkup), and content extraction services (Firecrawl, Tavily, Kagi). Includes GitHub search. All through a single interface.

## Upstream

- Repository: https://github.com/spences10/mcp-omnisearch
- Commit: `736fcc07890d378f330d18d81cf99a9cd96046b0`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y mcp-omnisearch

## Requirements

- runtimes: node >=22.0.0
- packages: mcp-omnisearch
- env: TAVILY_API_KEY, EXA_API_KEY, KAGI_API_KEY, BRAVE_API_KEY, GITHUB_API_KEY, LINKUP_API_KEY, FIRECRAWL_API_KEY, FIRECRAWL_BASE_URL
- credentials: TAVILY_API_KEY, EXA_API_KEY, KAGI_API_KEY, BRAVE_API_KEY, GITHUB_API_KEY, LINKUP_API_KEY, FIRECRAWL_API_KEY

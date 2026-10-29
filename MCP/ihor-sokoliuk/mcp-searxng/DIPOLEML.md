# MCP Searxng

**DipoleML integration** for Ihor Sokoliuk. Type: `mcp`. Version: `2.9.0`.

Private web search for AI assistants via SearXNG — supports DipoleML, Cursor, and any MCP client

## Upstream

- Repository: https://github.com/ihor-sokoliuk/mcp-searxng
- Commit: `59635c3a4b3cca5aafc183570be3f56a6032dcdc`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y mcp-searxng

## Requirements

- runtimes: node >=22
- packages: mcp-searxng
- env: SEARXNG_URL, MCP_HTTP_PORT, YOUR_SEARXNG_INSTANCE_URL, FLARESOLVERR_URL, BYPARR_URL, MCP_HTTP_HOST

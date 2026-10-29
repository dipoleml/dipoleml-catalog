# Modelcontextprotocol

**DipoleML integration** for Perplexityai. Type: `mcp`. Version: `1.4.0`.

The official MCP server implementation for the Perplexity API Platform

## Upstream

- Repository: https://github.com/perplexityai/modelcontextprotocol
- Commit: `cd1d27cffe56739819abb3e56a18e26dbd88c487`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @perplexity-ai/mcp-server

## Requirements

- runtimes: node >=18
- packages: @perplexity-ai/mcp-server
- env: YOUR_API_KEY, PERPLEXITY_BASE_URL, PERPLEXITY_API_KEY, ALLOWED_HOSTS
- credentials: YOUR_API_KEY, PERPLEXITY_API_KEY

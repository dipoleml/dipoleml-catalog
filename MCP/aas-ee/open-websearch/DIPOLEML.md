# Open Websearch

**DipoleML integration** for Aas Ee. Type: `mcp`. Version: `2.2.0`.

Multi-engine MCP server, CLI, and local daemon for agent web search and content retrieval — skill-guided workflows, no API keys.

## Upstream

- Repository: https://github.com/Aas-ee/open-webSearch
- Commit: `fb11fd94df736819a0d2765bf7645224f98b2c6b`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y open-websearch

## Requirements

- runtimes: node
- packages: open-websearch
- env: PROXY_URL, GITHUB_TOKEN
- credentials: GITHUB_TOKEN

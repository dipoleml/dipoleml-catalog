# Obsidian MCP Server

**DipoleML integration** for Cyanheads. Type: `mcp`. Version: `3.7.2`.

Read, write, search, and surgically edit Obsidian vault notes, tags, and frontmatter via MCP. STDIO or Streamable HTTP.

## Upstream

- Repository: https://github.com/cyanheads/obsidian-mcp-server
- Commit: `a1aeb8bd9130f880a45943e28be9b65360435569`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y obsidian-mcp-server

## Requirements

- runtimes: node >=24.0.0
- packages: obsidian-mcp-server
- env: OBSIDIAN_API_KEY, OBSIDIAN_BASE_URL, OBSIDIAN_OMNISEARCH_URL, MCP_TRANSPORT_TYPE, MCP_HTTP_PORT, MCP_AUTH_SECRET_KEY
- credentials: OBSIDIAN_API_KEY, MCP_AUTH_SECRET_KEY

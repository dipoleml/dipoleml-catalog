# Coolify MCP

**DipoleML integration** for Stumason. Type: `mcp`. Version: `3.9.0`.

MCP server for Coolify — 42 optimized tools for managing self-hosted PaaS through AI assistants

## Upstream

- Repository: https://github.com/StuMason/coolify-mcp
- Commit: `f8f98284407b6edd095ca888dea8f02ef979f1f7`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @masonator/coolify-mcp
- mcp-stdio · npx -y @masonator/coolify-mcp

## Requirements

- runtimes: node >=20
- packages: @masonator/coolify-mcp
- env: COOLIFY_BASE_URL, COOLIFY_ACCESS_TOKEN, CF_ACCESS_CLIENT_SECRET, DATABASE_URL
- credentials: COOLIFY_ACCESS_TOKEN, CF_ACCESS_CLIENT_SECRET

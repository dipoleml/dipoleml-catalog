# Plane MCP Server

**DipoleML integration** for Makeplane. Type: `mcp`. Version: `0.0.0`.

Plane's Official Model Context Protocol Server 🔌 ⌨️ 🔥

## Upstream

- Repository: https://github.com/makeplane/plane-mcp-server
- Commit: `dc7cfd9f3c305891909e2372f0cc507291353801`
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
- packages: plane-mcp-server
- env: PLANE_API_KEY, PLANE_BASE_URL, PLANE_INTERNAL_BASE_URL, REDIS_URL, REDIS_HOST, REDIS_PORT, PLANE_TEST_API_KEY, PLANE_TEST_MCP_URL, PLANE_API_HOST_URL
- credentials: PLANE_API_KEY, PLANE_TEST_API_KEY

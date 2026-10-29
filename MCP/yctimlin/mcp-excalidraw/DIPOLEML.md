# MCP Excalidraw

**DipoleML integration** for Yctimlin. Type: `mcp`. Version: `2.1.2`.

MCP server and DipoleML skill for Excalidraw — programmatic canvas toolkit to create, edit, and export diagrams via AI agents with real-time canvas sync.

## Upstream

- Repository: https://github.com/yctimlin/mcp_excalidraw
- Commit: `774a70c1b3f0c7b9901fbbbf66b432d1a8dbbfe7`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y mcp-excalidraw-server
- mcp-stdio · npx -y mcp-excalidraw-server

## Requirements

- runtimes: node >=20.0.0
- packages: mcp-excalidraw-server
- env: EXPRESS_SERVER_URL, EXCALIDRAW_EXPORT_DIR, EXCALIDRAW_SHARE_UPLOAD_URL, EXCALIDRAW_SHARE_BASE_URL, CANVAS_TEST_PORT, VITE_APP_BACKEND_V2_GET_URL

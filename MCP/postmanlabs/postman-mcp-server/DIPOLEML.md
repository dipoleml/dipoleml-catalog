# Postman MCP Server

**DipoleML integration** for Postmanlabs. Type: `mcp`. Version: `2.14.0`.

Postman MCP Server — connect AI agents (DipoleML, Cursor, VS Code Copilot, Gemini CLI) to your Postman collections, OpenAPI specs, and environments via Model Context Protocol (MCP)

## Upstream

- Repository: https://github.com/postmanlabs/postman-mcp-server
- Commit: `a56d18bd98b8dc57b07562c43717890175563e88`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @postman/postman-mcp-server
- mcp-stdio · node dist/src/index.js

## Requirements

- runtimes: node >=20.0.0
- packages: @postman/postman-mcp-server
- env: POSTMAN_API_KEY, POSTMAN_API_BASE_URL, SUPPORT
- credentials: POSTMAN_API_KEY

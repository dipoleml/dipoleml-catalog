# Excel MCP Server

**DipoleML integration** for Haris Musa. Type: `mcp`. Version: `0.0.0`.

Excel MCP server: let AI (DipoleML, Cursor, Codex) create and edit Excel files with charts, PivotTables, slicers and formulas. No Excel required.

## Upstream

- Repository: https://github.com/haris-musa/excel-mcp-server
- Commit: `ebb86fb96bcf042777cb370f56d341e6da6b4421`
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
- packages: excel-mcp-server
- env: EXCEL_MCP_AUTH_TOKEN, EXCEL_MCP_HOST, EXCEL_MCP_PORT, IMPORTXML
- credentials: EXCEL_MCP_AUTH_TOKEN

# Clawdcursor

**DipoleML integration** for Amrdab. Type: `mcp`. Version: `1.5.24`.

Local MCP server that gives any AI agent safe desktop control on Windows, macOS and Linux. Reads the screen as text and structure (accessibility + OCR) and acts by element name, with screenshots as the last resort. Multi-monitor aware, verifies every action, one safety gate.

## Upstream

- Repository: https://github.com/AmrDab/clawdcursor
- Commit: `99e8b3af917b581426618420bfcfe57ccbfbd360`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y clawdcursor

## Requirements

- runtimes: node >=20.0.0
- packages: clawdcursor

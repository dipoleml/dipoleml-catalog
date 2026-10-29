# Keenetic MCP

**DipoleML integration** for Salatmaster. Type: `mcp`. Version: `0.0.0-dev`.

Keenetic router control for DipoleML, Codex, Cursor and any MCP agent. An MCP server over the router's own RCI API, plus ready-made plugins whose skills teach the agent how the hardware really behaves. Devices, Wi-Fi, VPN routing, isolated segments. Nothing installed on the router.

## Upstream

- Repository: https://github.com/salatmaster/keenetic-mcp
- Commit: `2d4480dbbb85c9834e2d42bd373aa8482944e776`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y keenetic-mcp

## Requirements

- runtimes: node >=20
- packages: keenetic-mcp
- env: KEENETIC_HOST, KEENETIC_TEST_HOST

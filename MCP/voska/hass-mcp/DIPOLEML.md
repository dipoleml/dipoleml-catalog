# Hass MCP

**DipoleML integration** for Voska. Type: `mcp`. Version: `0.0.0`.

Control and query Home Assistant from DipoleML and other LLMs — a Model Context Protocol (MCP) server.

## Upstream

- Repository: https://github.com/voska/hass-mcp
- Commit: `bff845329fdb4b3a72bbf2e2fba14984515f281a`
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
- packages: hass-mcp
- env: HA_URL, HA_TOKEN, YOUR_LONG_LIVED_TOKEN, MCP_PORT
- credentials: HA_TOKEN, YOUR_LONG_LIVED_TOKEN

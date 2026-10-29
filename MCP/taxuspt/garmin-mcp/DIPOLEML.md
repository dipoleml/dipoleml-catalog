# Garmin MCP

**DipoleML integration** for Taxuspt. Type: `mcp`. Version: `0.0.0`.

MCP server to access Garmin data

## Upstream

- Repository: https://github.com/Taxuspt/garmin_mcp
- Commit: `a2ca5fcac34524b83814fe2fcf3d479f8a75983f`
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
- packages: garmin-mcp
- env: GARMINTOKENS, GARMIN_MCP_TRANSPORT, GARMIN_MCP_HOST, GARMIN_MCP_HTTP_TOKEN, GARMIN_MCP_PORT
- credentials: GARMINTOKENS, GARMIN_MCP_HTTP_TOKEN

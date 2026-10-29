# Magic Hour MCP

**DipoleML integration** for Magichourhq. Type: `mcp`. Version: `0.0.0`.

Hosted MCP server for generating and editing video, images, and audio with the Magic Hour API.

## Upstream

- Repository: https://github.com/magichourhq/magic-hour-mcp
- Commit: `4be40f168b24d7489eea3fb3733873a44d178ec0`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3
- packages: mcp-magichour
- env: MAGIC_HOUR_API_BASE_URL, MAGIC_HOUR_OPENAPI_PATH, MCP_OAUTH_ISSUER_URL, MCP_OAUTH_RESOURCE_URL

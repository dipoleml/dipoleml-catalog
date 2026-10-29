# Northcinder

**DipoleML integration** for Cinderline. Type: `mcp`. Version: `0.0.0`.

Open-source MCP server for comparing products and asking the buyer before purchase.

## Upstream

- Repository: https://github.com/cinderline/northcinder
- Commit: `d1343096a7afff58e0aee4fbf608daf2fa28dc03`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: node >=20
- packages: northcinder-monorepo
- env: NORTHCINDER_API_KEYS, NORTHCINDER_SERVICE_URL, NORTHCINDER_CLIENT_KEY
- credentials: NORTHCINDER_API_KEYS, NORTHCINDER_CLIENT_KEY

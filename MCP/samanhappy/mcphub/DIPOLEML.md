# Mcphub

**DipoleML integration** for Samanhappy. Type: `mcp`. Version: `dev`.

Self-hosted MCP gateway and control plane for connecting, controlling, and operating MCP servers.

## Upstream

- Repository: https://github.com/samanhappy/mcphub
- Commit: `267cdb9603cbb5924859274a6eff4bb44790a544`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @samanhappy/mcphub
- mcp-stdio · node bin/cli.js

## Requirements

- runtimes: node >=20.0.0
- packages: @samanhappy/mcphub
- env: MCPHUB_CREDENTIAL_ENCRYPTION_KEY
- credentials: MCPHUB_CREDENTIAL_ENCRYPTION_KEY

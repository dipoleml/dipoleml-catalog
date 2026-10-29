# Mobile MCP

**DipoleML integration** for Mobile Next. Type: `mcp`. Version: `0.0.1`.

Model Context Protocol Server for Mobile Automation and Scraping (iOS, Android, Emulators, Simulators and Real Devices)

## Upstream

- Repository: https://github.com/mobile-next/mobile-mcp
- Commit: `6c945971b6b16832f7fa2a69ae23d33e8b9beb71`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @mobilenext/mobile-mcp

## Requirements

- runtimes: node >=20
- packages: @mobilenext/mobile-mcp
- env: MOBILEMCP_ALLOW_UNSAFE_URLS

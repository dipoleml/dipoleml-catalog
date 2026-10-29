# Mcporter

**DipoleML integration** for Openclaw. Type: `mcp`. Version: `0.16.1`.

Call MCPs via TypeScript, masquerading as simple TypeScript API. Or package them as cli.

## Upstream

- Repository: https://github.com/openclaw/mcporter
- Commit: `8ba0ef967805b8d3fca7a9bc47c725a476e1282b`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y mcporter

## Requirements

- runtimes: node >=24
- packages: mcporter
- env: MCPORTER_VAULT_PASSWORD, MCPORTER_CHROME_DEVTOOLS_RELAY_URL

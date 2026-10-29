# DipoleML Carbon

**DipoleML integration** for Gwittebolle. Type: `plugin`. Version: `1.18.2`.

Track the carbon footprint of your DipoleML sessions, in the terminal and the DipoleML desktop app

## Upstream

- Repository: https://github.com/gwittebolle/claude-carbon
- Commit: `f78c16e3b6a2e32ba409f841241a915927a4f396`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: node >=18
- packages: claude-carbon
- env: CLAUDE_CODE_OAUTH_TOKEN, CLAUDE_CARBON_EXPORT_DIR, ANTHROPIC_BASE_URL
- credentials: CLAUDE_CODE_OAUTH_TOKEN

# Brooks Lint

**DipoleML integration** for Hyhmrright. Type: `plugin`. Version: `1.9.1`.

Portable AI code quality reviews for Codex, Cursor, Copilot and other coding agents: six Agent Skills for architecture, technical debt, tests and remediation.

## Upstream

- Repository: https://github.com/hyhmrright/brooks-lint
- Commit: `15fa2d49877969f65a25b9f05897cd72fae32d33`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: node >=20
- packages: brooks-lint
- env: ANTHROPIC_API_KEY, GATEWAY_API_KEY, ANTHROPIC_BASE_URL
- credentials: ANTHROPIC_API_KEY, GATEWAY_API_KEY

# Knowl

**DipoleML integration** for Dat999zx. Type: `plugin`. Version: `5.28.1`.

Persistent memory for AI agents, for code, research and everyday life. Facts are typed, sourced, and retired when they change. Local SQLite, no API keys.

## Upstream

- Repository: https://github.com/dat999zx/knowl
- Commit: `cb1f19c8ca8991461c456f08c23f247e2ec85207`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @dat999zx/knowl serve --host claude
- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: node >=22
- packages: @dat999zx/knowl

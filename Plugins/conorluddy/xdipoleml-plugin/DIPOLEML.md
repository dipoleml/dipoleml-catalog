# XDipoleML Plugin

**DipoleML integration** for Conorluddy. Type: `plugin`. Version: `0.4.0`.

iOS development DipoleML plugin for mindful token and context usage. Contains modular MCPs that group various Xcode/IDB tools based on your current workflow. [deprecated]

## Upstream

- Repository: https://github.com/conorluddy/xclaude-plugin
- Commit: `27ee06541db2f1597666ac2d936cad7c5ca5c37b`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · node ${CLAUDE_PLUGIN_ROOT}/mcp-servers/xc-setup/dist/index.js
- mcp-stdio · node ${CLAUDE_PLUGIN_ROOT}/mcp-servers/xc-build/dist/index.js
- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: node >=18.0.0
- packages: xclaude-plugin
- env: IMPORTANT

# MCP Jetbrains

**DipoleML integration** for Jetbrains. Type: `mcp`. Version: `1.8.0`.

A model context protocol server to work with JetBrains IDEs: IntelliJ, PyCharm, WebStorm, etc. Also, works with Android Studio

## Upstream

- Repository: https://github.com/JetBrains/mcp-jetbrains
- Commit: `c8c2b85bc6f029130542fdddc3daf066e404df41`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @jetbrains/mcp-proxy

## Requirements

- runtimes: node
- packages: @jetbrains/mcp-proxy
- env: IDE_PORT, YOUR_IDEA_PORT

# MCP Installer

**DipoleML integration** for Anaisbetts. Type: `mcp`. Version: `0.5.0`.

An MCP server that installs other MCP servers for you

## Upstream

- Repository: https://github.com/anaisbetts/mcp-installer
- Commit: `747fbd88aa2e54368f98252fc9e8d228748dc594`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `COPYING` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @anaisbetts/mcp-installer

## Requirements

- runtimes: node
- packages: @anaisbetts/mcp-installer
- env: GITHUB_PERSONAL_ACCESS_TOKEN
- credentials: GITHUB_PERSONAL_ACCESS_TOKEN

# Ssh MCP

**DipoleML integration** for Tufantunc. Type: `mcp`. Version: `2.22.0`.

MCP server exposing SSH control for Linux servers via Model Context Protocol.

## Upstream

- Repository: https://github.com/tufantunc/ssh-mcp
- Commit: `f84d92a9c013d63cd75c29853cdb2addb585cd4d`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y ssh-mcp

## Requirements

- runtimes: node ^18.19.0 || >=20.6.0
- packages: ssh-mcp
- env: SSH_MCP_KEY
- credentials: SSH_MCP_KEY

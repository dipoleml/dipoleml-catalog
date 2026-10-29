# MCP Nixos

**DipoleML integration** for Utensils. Type: `mcp`. Version: `0.0.0`.

MCP-NixOS - Model Context Protocol Server for NixOS resources

## Upstream

- Repository: https://github.com/utensils/mcp-nixos
- Commit: `2e88096695bef9c41c5fa9157211d52a45d9a913`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · nix run .#mcp-nixos

## Requirements

- runtimes: python3
- packages: mcp-nixos
- env: MCP_NIXOS_TRANSPORT, MCP_NIXOS_HOST, MCP_NIXOS_PORT

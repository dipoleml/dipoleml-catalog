# Mcpvault

**DipoleML integration** for Bitbonsai. Type: `mcp`. Version: `0.17.1`.

A lightweight Model Context Protocol (MCP) server for safe Obsidian vault access

## Upstream

- Repository: https://github.com/bitbonsai/mcpvault
- Commit: `adda8609be73fd5b3adaa14430b43c40c5cbfb18`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @bitbonsai/mcpvault
- mcp-stdio · node dist/server.js

## Requirements

- runtimes: node >=20.0.0
- packages: @bitbonsai/mcpvault

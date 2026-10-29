# Figma Context MCP

**DipoleML integration** for Figma. Type: `mcp`. Version: `0.13.2`.

MCP server to provide Figma layout information to AI coding agents like Cursor

## Upstream

- Repository: https://github.com/GLips/Figma-Context-MCP
- Commit: `c083d65c7e002923e7cb98f4e3bdafb105e90f6d`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y figma-developer-mcp

## Requirements

- runtimes: node >=20.20.0
- packages: figma-developer-mcp
- env: FIGMA_API_KEY
- credentials: FIGMA_API_KEY

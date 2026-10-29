# Davinci Resolve MCP

**DipoleML integration** for Samuelgursky. Type: `mcp`. Version: `4.16.0`.

MCP server integration for DaVinci Resolve Studio

## Upstream

- Repository: https://github.com/samuelgursky/davinci-resolve-mcp
- Commit: `c347df6cb598edf74a3df40a17753389122fa102`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y davinci-resolve-mcp
- mcp-stdio · node ./bin/davinci-resolve-mcp.mjs
- mcp-stdio · npx -y davinci-resolve-mcp
- mcp-stdio · node ./bin/davinci-resolve-advanced-mcp.mjs

## Requirements

- runtimes: node >=20.9, python3
- packages: davinci-resolve-mcp

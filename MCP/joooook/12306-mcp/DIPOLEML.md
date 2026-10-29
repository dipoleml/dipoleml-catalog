# 12306 MCP

**DipoleML integration** for Joooook. Type: `mcp`. Version: `0.3.10`.

This is a 12306 ticket search server based on the Model Context Protocol (MCP).

## Upstream

- Repository: https://github.com/Joooook/12306-mcp
- Commit: `ff6439da6f63d7d72181abea4568abd69878c600`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y 12306-mcp
- mcp-stdio · node ./build/index.js

## Requirements

- runtimes: node >=18
- packages: 12306-mcp

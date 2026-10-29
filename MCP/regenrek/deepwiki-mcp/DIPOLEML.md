# Deepwiki MCP

**DipoleML integration** for Regenrek. Type: `mcp`. Version: `0.0.10`.

📖 MCP server for fetch deepwiki.com and get latest knowledge in Cursor and other Code Editors

## Upstream

- Repository: https://github.com/regenrek/deepwiki-mcp
- Commit: `d62d749629716a28905da5555922b6f93a654fbf`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y mcp-deepwiki
- mcp-stdio · node ./bin/cli.mjs

## Requirements

- runtimes: node >=18.0.0
- packages: mcp-deepwiki
- env: IMPORTANT

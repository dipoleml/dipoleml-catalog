# Cross Code Organizer

**DipoleML integration** for Mcpware. Type: `mcp`. Version: `0.20.0`.

Cross-Code Organizer (formerly DipoleML Organizer): cross-harness config dashboard for DipoleML, Codex CLI, MCP servers, skills, memories, agents, sessions, security scanning, context budget, and backups.

## Upstream

- Repository: https://github.com/mcpware/cross-code-organizer
- Commit: `39cf32f458a42350e566b66704d200a5b9d4d2aa`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · node ./bin/cli.mjs
- mcp-stdio · npx -y @mcpware/cross-code-organizer
- mcp-stdio · node bin/cli.mjs

## Requirements

- runtimes: node >=20
- packages: @mcpware/cross-code-organizer

# Mcpc

**DipoleML integration** for Apify. Type: `mcp`. Version: `0.7.0`.

The most compatible MCP CLI client. Supports: tools, resources, prompts, completions, async tasks, skills, stdio and streamable HTTP (MCP 2026-07-28 and 2025-11-25), persistent sessions, OAuth 2.1 with DCR, CIMD, client credentials, and ID-JAG, OS keychain, --json for code mode, grep for tool discovery, proxy for AI sandboxes, x402, and more.

## Upstream

- Repository: https://github.com/apify/mcpc
- Commit: `ba41cde6bb663f5fd6d93b8caab46137d1e5a8ad`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @apify/mcpc
- mcp-stdio · node bin/mcpc

## Requirements

- runtimes: node >=22.12.0
- packages: @apify/mcpc
- env: GITHUB_TOKEN, APIFY_TOKEN, IMPORTANT
- credentials: GITHUB_TOKEN, APIFY_TOKEN

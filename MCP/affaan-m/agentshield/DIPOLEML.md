# Agentshield

**DipoleML integration** for Affaan M. Type: `mcp`. Version: `1.6.0`.

AI agent security scanner. Detect vulnerabilities in agent configurations, MCP servers, and tool permissions. Available as CLI, GitHub Action, ECC plugin, and GitHub App integration. 🛡️

## Upstream

- Repository: https://github.com/affaan-m/agentshield
- Commit: `b0891303bdcd6037376a94263d45cfd2ff3dfb98`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y ecc-agentshield
- mcp-stdio · node ./dist/index.js

## Requirements

- runtimes: node >=20
- packages: ecc-agentshield
- env: ANTHROPIC_API_KEY, CF_API_TOKEN, ORCAROUTER_API_KEY
- credentials: ANTHROPIC_API_KEY, CF_API_TOKEN, ORCAROUTER_API_KEY

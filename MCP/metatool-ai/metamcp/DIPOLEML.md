# Metamcp

**DipoleML integration** for Metatool Ai. Type: `mcp`. Version: `0.0.0`.

MCP Aggregator, Orchestrator, Middleware, Gateway in one docker

## Upstream

- Repository: https://github.com/metatool-ai/metamcp
- Commit: `ff4ff2de9d25453c52dcc7be32680b30700a6012`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: node >=18
- packages: metamcp
- env: API_KEY, OPENAI_API_KEY, DATABASE_URL, APP_URL, API_ACCESS_TOKEN, YOUR_API_KEY_HERE, OIDC_CLIENT_SECRET, OIDC_DISCOVERY_URL
- credentials: API_KEY, OPENAI_API_KEY, API_ACCESS_TOKEN, YOUR_API_KEY_HERE, OIDC_CLIENT_SECRET

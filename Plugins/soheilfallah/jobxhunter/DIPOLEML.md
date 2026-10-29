# Jobxhunter

**DipoleML integration** for Soheilfallah. Type: `plugin`. Version: `1.6.1`.

Searches live UK and Canada jobs, fits an ATS-safe CV to each role from your real experience, and recommends the gaps to close. A DipoleML plugin, and any AGENTS.md CLI.

## Upstream

- Repository: https://github.com/soheilfallah/jobxhunter
- Commit: `5fb25ee3292c95b53f25ca9af7d0fbc6f5505d41`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y --registry=https://registry.npmjs.org/ firecrawl-mcp
- mcp-stdio · uv run --no-config --locked --script ${CLAUDE_PLUGIN_ROOT}/connectors/reed-mcp/server.py
- mcp-stdio · uv run --no-config --locked --script ${CLAUDE_PLUGIN_ROOT}/connectors/adzuna-mcp/server.py
- plugin · .dipoleml-plugin/plugin.json

## Requirements

- env: IMPORTANT

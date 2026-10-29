# Ollama MCP Bridge

**DipoleML integration** for Patruff. Type: `mcp`. Version: `1.0.0`.

Bridge between Ollama and MCP servers, enabling local LLMs to use Model Context Protocol tools

## Upstream

- Repository: https://github.com/patruff/ollama-mcp-bridge
- Commit: `e4f42d095af02efd65d19e81931f949e5a75a152`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: node
- packages: mcp-llm-bridge
- env: BRAVE_API_KEY, GITHUB_PERSONAL_ACCESS_TOKEN, REPLICATE_API_TOKEN
- credentials: BRAVE_API_KEY, GITHUB_PERSONAL_ACCESS_TOKEN, REPLICATE_API_TOKEN

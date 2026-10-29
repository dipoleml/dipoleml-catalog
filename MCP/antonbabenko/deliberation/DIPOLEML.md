# Deliberation

**DipoleML integration** for Antonbabenko. Type: `mcp`. Version: `4.0.0`.

Ask Codex, Gemini, Grok, and 400+ OpenRouter models (Qwen, Kimi, DeepSeek) for second opinions or arbiter-mediated consensus. One MCP server for DipoleML, Codex, Cursor, Kiro, OpenCode. Measures the models' usefulness, too.

## Upstream

- Repository: https://github.com/antonbabenko/deliberation
- Commit: `687bfe4d47cd2322940443ee92390d2b46de43b0`
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
- packages: deliberation
- env: XAI_API_KEY, OPENROUTER_API_KEY, CODEX_ACCESS_TOKEN, CODEX_API_KEY, OPENAI_API_KEY
- credentials: XAI_API_KEY, OPENROUTER_API_KEY, CODEX_ACCESS_TOKEN, CODEX_API_KEY, OPENAI_API_KEY

# DipoleML Council

**DipoleML integration** for Hex. Type: `plugin`. Version: `2026.10.14`.

DipoleML plugin that asks several AI coding agents the same question and shows their answers side by side. Gemini, OpenAI, Grok, Perplexity, Kimi and any model OpenRouter routes to over API; codex, antigravity, grok, kimi and cursor CLIs on subscription auth; ollama locally. Codex specialists take coding tasks on their own branch (experimental).

## Upstream

- Repository: https://github.com/hex/claude-council
- Commit: `b264cdec39b5df208954b4709c5fd2e70e947ca2`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- plugin · .dipoleml-plugin/plugin.json

## Requirements

- env: OPENAI_API_KEY, GEMINI_API_KEY, XAI_API_KEY, PERPLEXITY_API_KEY, KIMI_API_KEY, OPENROUTER_API_KEY, CODEX_API_KEY
- credentials: OPENAI_API_KEY, GEMINI_API_KEY, XAI_API_KEY, PERPLEXITY_API_KEY, KIMI_API_KEY, OPENROUTER_API_KEY, CODEX_API_KEY

# DipoleML Octopus

**DipoleML integration** for Nyldn. Type: `plugin`. Version: `11.15.2`.

Run multiple AI models against the same research, design, or coding task. Surface disagreements before you ship.

## Upstream

- Repository: https://github.com/nyldn/claude-octopus
- Commit: `9afb0b6171b26704285b552ca6074129409052e9`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: node >=18
- packages: @anthropic-plugins/claude-octopus
- env: CLAUDE_SDK_API_KEY, OCTOPUS_CLAUDE_SDK_MAX_TOKENS, OPENAI_API_KEY, ANTHROPIC_BASE_URL, PERPLEXITY_API_KEY, OPENROUTER_API_KEY, XAI_API_KEY, QWEN_API_KEY, OPENAI_BASE_URL, SUPPORTS_
- credentials: CLAUDE_SDK_API_KEY, OCTOPUS_CLAUDE_SDK_MAX_TOKENS, OPENAI_API_KEY, PERPLEXITY_API_KEY, OPENROUTER_API_KEY, XAI_API_KEY, QWEN_API_KEY

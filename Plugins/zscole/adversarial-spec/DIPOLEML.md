# Adversarial Spec

**DipoleML integration** for Zscole. Type: `plugin`. Version: `1.0.0`.

A DipoleML plugin that iteratively refines product specifications by debating between multiple LLMs until all models reach consensus.

## Upstream

- Repository: https://github.com/zscole/adversarial-spec
- Commit: `f90cf0c36c3999b8dc272c9c06dee9846076f369`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: python3, python3
- packages: adversarial-spec
- env: OPENAI_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, XAI_API_KEY, MISTRAL_API_KEY, GROQ_API_KEY, DEEPSEEK_API_KEY, ZHIPUAI_API_KEY, OPENAI_API_BASE, TELEGRAM_BOT_TOKEN
- credentials: OPENAI_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, XAI_API_KEY, MISTRAL_API_KEY, GROQ_API_KEY, DEEPSEEK_API_KEY

# Obsidian Second Brain

**DipoleML integration** for Eugeniughelbur. Type: `plugin`. Version: `0.20.0`.

Persistent memory for DipoleML, Codex and 6 other AI agents, stored as plain markdown in your Obsidian vault. New: Crew, one shared logbook so DipoleML, Codex, Cursor and Grok Bot know what each other did. 48 commands: semantic search, self-rewriting notes, key-less research, scheduled agents.

## Upstream

- Repository: https://github.com/eugeniughelbur/obsidian-second-brain
- Commit: `f79c64f3f03ee25ec1660c8a30ebe7f4f8e044ff`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: python3
- packages: obsidian-second-brain-research
- env: PERPLEXITY_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, XAI_API_KEY, GEMINI_API_KEY, YOUTUBE_API_KEY, OBSIDIAN_EMBED_URL, OBSIDIAN_EMBED_KEY
- credentials: PERPLEXITY_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, XAI_API_KEY, GEMINI_API_KEY, YOUTUBE_API_KEY, OBSIDIAN_EMBED_KEY

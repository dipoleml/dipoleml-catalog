# DipoleML WhatsApp

**DipoleML integration** for Crisandrews. Type: `plugin`. Version: `1.21.1`.

WhatsApp channel plugin for DipoleML — connect your WhatsApp to an AI agent. QR scan, voice transcription, access control, media support.

## Upstream

- Repository: https://github.com/crisandrews/claude-whatsapp
- Commit: `343925d2f9762dbed8d59dee181e2f54f0fa71bd`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npm --prefix ${CLAUDE_PLUGIN_ROOT} run start
- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: node
- packages: claude-whatsapp-channel
- env: GROQ_API_KEY, OPENAI_API_KEY
- credentials: GROQ_API_KEY, OPENAI_API_KEY

# WhatsApp DipoleML Plugin

**DipoleML integration** for Rich627. Type: `plugin`. Version: `0.33.1`.

DipoleML WhatsApp channel plugin — run AI directly from WhatsApp, voice transcription, remote tool approval, access control. No API keys, no Docker, just a linked device.

## Upstream

- Repository: https://github.com/Rich627/whatsapp-claude-plugin
- Commit: `24ad936b95bb0e03c083eaa5ffbdbb6996f6c60b`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · bun run --cwd ${CLAUDE_PLUGIN_ROOT} --shell=bun --silent start
- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: node
- packages: claude-channel-whatsapp
- env: GROQ_API_KEY, OPENAI_API_KEY
- credentials: GROQ_API_KEY, OPENAI_API_KEY

# Telegram MCP

**DipoleML integration** for Chigwell. Type: `mcp`. Version: `0.0.0`.

Telegram MCP server powered by Telethon to let MCP clients read chats, manage groups, and send/modify messages, media, contacts, and settings.

## Upstream

- Repository: https://github.com/chigwell/telegram-mcp
- Commit: `49710879809c07188b226427e66b10745d83cf36`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3, python3
- packages: telegram-mcp
- env: GROQ_API_KEY, TELEGRAM_TRANSCRIBE_OPENAI_URL, TELEGRAM_TRANSCRIBE_OPENAI_API_KEY, PARAKEET_API_KEY, TELEGRAM_API_ID, TELEGRAM_API_HASH, MCP_TRANSPORT, MCP_HOST, MCP_PORT, MCP_ALLOWED_HOSTS, TELEGRAM_PROXY_HOST, TELEGRAM_PROXY_PORT
- credentials: GROQ_API_KEY, TELEGRAM_TRANSCRIBE_OPENAI_API_KEY, PARAKEET_API_KEY, TELEGRAM_PROXY_SECRET

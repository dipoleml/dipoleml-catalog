# Media Os

**DipoleML integration** for Damionrashford. Type: `plugin`. Version: `2.1.0`.

Routed Media OS for DipoleML — 96 skills + 13 modes + 7 specialist agents covering FFmpeg, OBS, NDI, DeckLink, Dolby Vision, HDR10+, and 2026 open-source AI media. Install via DipoleML marketplace.

## Upstream

- Repository: https://github.com/damionrashford/media-os
- Commit: `5014c1e8b23fd3e18d49926d9aa147d15a3aa08e`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- plugin · .dipoleml-plugin/plugin.json

## Requirements

- env: WASAPI, OBS_WEBSOCKET_URL, HUGGINGFACE_TOKEN, SHAKA_KEY_SERVER_URL, CLOUDFLARE_STREAM_TOKEN, MUX_TOKEN_ID, BUNNY_CDN_TOKEN, LIVE_STREAM_URL, RENDER_QUEUE_URL
- credentials: HUGGINGFACE_TOKEN, SHAKA_KEY_SERVER_URL, CLOUDFLARE_STREAM_TOKEN, MUX_TOKEN_ID, BUNNY_CDN_TOKEN

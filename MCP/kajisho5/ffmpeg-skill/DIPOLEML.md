# Ffmpeg Skill

**DipoleML integration** for Kajisho5. Type: `mcp`. Version: `2.17.3`.

Local video editor for coding agents: 42 FFmpeg tools with a machine-readable contract and an MCP server, for DipoleML, Cursor and Codex. Cut, captions, reframe, loudness, platform exports. No cloud, no API keys.

## Upstream

- Repository: https://github.com/kajisho5/ffmpeg-skill
- Commit: `1ae1bdf1ca0adbb1606fbca493948b1bbb2f83ff`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y ffmpeg-skill
- mcp-stdio · node bin/install.js

## Requirements

- runtimes: node >=16
- packages: ffmpeg-skill
- env: NPM_TOKEN
- credentials: NPM_TOKEN

# Douyin Tiktok Download API

**DipoleML integration** for Evil0ctal. Type: `mcp`. Version: `0.0.0`.

🚀 自托管的抖音、TikTok、B 站数据采集与无水印视频下载 API，支持 AI agent 通过 MCP 调用与离线语音转文字，Docker 一键部署。| Self-hosted TikTok, Douyin & Bilibili scraper and no-watermark video downloader — async REST API, MCP server for AI agents, CLI and web console, plus offline speech-to-text for downloaded videos. Self-healing identity pool, PostgreSQL archive, one docker compose up.

## Upstream

- Repository: https://github.com/Evil0ctal/Douyin_TikTok_Download_API
- Commit: `b5505e3830a2e4b9b8608962f58e96dfe75f23c5`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3
- packages: dtk
- env: DTK_SECRET_KEY, DTK_DATABASE_URL, DTK_REDIS_URL
- credentials: DTK_SECRET_KEY

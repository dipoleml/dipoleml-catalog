# Chubbyskills

**DipoleML integration** for Chubbyguan. Type: `mcp`. Version: `0.0.0`.

把中文全渠道内容（抖音 / B站 / 小红书 / 公众号 / X / 播客）采集进个人知识库的 14 个 AI Skill：图文存图、视频转文字稿、字幕优先免 GPU、RSS/YouTube 订阅调度与每日情报简报，附带知识库 MCP server。｜ Ingest Chinese content into your personal knowledge base — image/video routing, subtitle-first transcription, feed subscriptions with daily digests, and a KB MCP server.

## Upstream

- Repository: https://github.com/chubbyguan/chubbyskills
- Commit: `d066d7694d23045a39f8c3efc1b51ebb9ca7f867`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3, python3
- packages: chubbyskills
- env: DASHSCOPE_API_KEY, GROQ_API_KEY, DEEPSEEK_API_KEY, OPENAI_API_KEY
- credentials: DASHSCOPE_API_KEY, GROQ_API_KEY, DEEPSEEK_API_KEY, OPENAI_API_KEY

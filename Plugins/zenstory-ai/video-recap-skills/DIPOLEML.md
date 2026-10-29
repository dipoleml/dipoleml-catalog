# Video Recap Skills

**DipoleML integration** for Zenstory Ai. Type: `plugin`. Version: `0.6.2`.

DipoleML / Codex skills that turn a video into a Chinese narration recap (视频解说): scene detection, ASR, VLM, script, TTS, ffmpeg assembly, optional editable JianYing / CapCut draft export (剪映草稿导出). Local ffmpeg + one MiMo key, no GPU. | 用 DipoleML skills 把视频做成中文解说成片，可选一键导出可编辑剪映草稿。

## Upstream

- Repository: https://github.com/zenstory-ai/video-recap-skills
- Commit: `9c88a98ac8401f9722daa5b2865d8e9c60bc6d2f`
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
- env: MIMO_API_KEY, MIMO_TOKEN_PLAN_CLUSTER, FISH_API_KEY
- credentials: MIMO_API_KEY, MIMO_TOKEN_PLAN_CLUSTER, FISH_API_KEY

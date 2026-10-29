# Capcut CLI

**DipoleML integration** for Renezander030. Type: `plugin`. Version: `0.2.0`.

Independent, unofficial CLI to edit CapCut and JianYing (剪映) projects — subtitles, timing, speed, volume, templates, cut long-form to shorts. No API needed, reads draft_content.json and draft_info.json (剪映草稿) directly. Not affiliated with ByteDance.

## Upstream

- Repository: https://github.com/renezander030/capcut-cli
- Commit: `f3d6c753edc33a183a60f955b402302c6e5ae7d4`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: node >=18
- packages: capcut-cli
- env: ANTHROPIC_API_KEY, IMPORTANT
- credentials: ANTHROPIC_API_KEY

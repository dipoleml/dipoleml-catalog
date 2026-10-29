# Immich Photo Manager

**DipoleML integration** for Drolosoft. Type: `mcp`. Version: `2.0.13`.

MCP server and DipoleML plugin for self-hosted Immich: CLIP and OCR search, geographic albums, duplicates, people and faces, metadata repair, PDF photobooks. 94 tools, tested live on Immich 2.x and 3.x.

## Upstream

- Repository: https://github.com/drolosoft/immich-photo-manager
- Commit: `22dd58280d1304d20bb45ae432eb8258927ef540`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3
- packages: immich-photo-manager
- env: IMMICH_BASE_URL, IMMICH_API_KEY, MCP_TRANSPORT, MCP_ALLOWED_HOSTS
- credentials: IMMICH_API_KEY

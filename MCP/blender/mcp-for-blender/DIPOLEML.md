# MCP for Blender

**DipoleML integration** for Blender. Type: `mcp`. Version: `0.0.0`.

Community plugin to control Blender 3D with any LLM of your choice. Not affiliated with the official Blender Foundation.

## Upstream

- Repository: https://github.com/ahujasid/mcp-for-blender
- Commit: `8782963ba87a4c90482198bd7c7e17219ac3a0f7`
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
- packages: mcp-for-blender
- env: BLENDER_HOST, BLENDER_PORT, BLENDERMCP_SKETCHFAB_API_KEY, BLENDERMCP_POLYPIZZA_API_KEY, BLENDERMCP_HYPER3D_API_KEY, BLENDERMCP_HUNYUAN3D_SECRET_ID, BLENDERMCP_HUNYUAN3D_SECRET_KEY, BLENDERMCP_HUNYUAN3D_API_URL, BLENDERMCP_MESHY_API_KEY, BLENDERMCP_TRIPO_API_KEY
- credentials: BLENDERMCP_SKETCHFAB_API_KEY, BLENDERMCP_POLYPIZZA_API_KEY, BLENDERMCP_HYPER3D_API_KEY, BLENDERMCP_HUNYUAN3D_SECRET_ID, BLENDERMCP_HUNYUAN3D_SECRET_KEY, BLENDERMCP_MESHY_API_KEY, BLENDERMCP_TRIPO_API_KEY

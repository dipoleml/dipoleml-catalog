# Apple Health MCP

**DipoleML integration** for Neiltron. Type: `mcp`. Version: `1.4.5`.

Local-first Apple Health MCP server. Lets AI assistants answer questions about your sleep, workouts, activity and heart data from a local export.

## Upstream

- Repository: https://github.com/neiltron/apple-health-mcp
- Commit: `2fbcf29599a5eac38d9ad3e976ee27142be6a77b`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @neiltron/apple-health-mcp

## Requirements

- runtimes: node >=22.0.0
- packages: @neiltron/apple-health-mcp

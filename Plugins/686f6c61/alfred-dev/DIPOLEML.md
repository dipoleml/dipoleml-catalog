# Alfred Dev

**DipoleML integration** for 686f6c61. Type: `plugin`. Version: `0.7.0`.

 Tu equipo de desarrolladores en un plugin. 10 agentes, 11 skills planas, 18 comandos /alfred-dev:*. Memoria persistente, quality gates con evidencia y MCP local. 

## Upstream

- Repository: https://github.com/686f6c61/alfred-dev
- Commit: `be0b51e8d0a14f7efd6f2fe5b3c2468daaecf362`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · python3 ${CLAUDE_PLUGIN_ROOT}/mcp/memory_server.py
- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: node, python3
- packages: alfred-dev

# MCP Server Kubernetes

**DipoleML integration** for Flux159. Type: `mcp`. Version: `4.2.1`.

MCP Server for kubernetes management commands

## Upstream

- Repository: https://github.com/Flux159/mcp-server-kubernetes
- Commit: `5536776f7338dc7c5239e6dc1ef07581434a7bf5`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y mcp-server-kubernetes

## Requirements

- runtimes: node >=18
- packages: mcp-server-kubernetes
- env: OTEL_EXPORTER_OTLP_ENDPOINT

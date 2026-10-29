# Azure Devops MCP

**DipoleML integration** for Microsoft. Type: `mcp`. Version: `2.11.0`.

The MCP server for Azure DevOps, bringing the power of Azure DevOps directly to your agents.

## Upstream

- Repository: https://github.com/microsoft/azure-devops-mcp
- Commit: `3ee829cb41536fd29aabfb27954fb6331b5e69ff`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE.md` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @azure-devops/mcp

## Requirements

- runtimes: node
- packages: @azure-devops/mcp
- env: IMPORTANT

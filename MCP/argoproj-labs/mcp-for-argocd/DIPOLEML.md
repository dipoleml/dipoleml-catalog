# MCP for Argocd

**DipoleML integration** for Argoproj Labs. Type: `mcp`. Version: `0.0.0`.

An implementation of Model Context Protocol (MCP) server for Argo CD.

## Upstream

- Repository: https://github.com/argoproj-labs/mcp-for-argocd
- Commit: `fbaae3ae31d22d6f4a3fe96fe9fa1a034ce44daa`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y argocd-mcp

## Requirements

- runtimes: node
- packages: argocd-mcp
- env: ARGOCD_BASE_URL, ARGOCD_API_TOKEN, ARGOCD_TOKEN_REGISTRY_PATH, MCP_AUTH_TOKEN
- credentials: ARGOCD_API_TOKEN, ARGOCD_TOKEN_REGISTRY_PATH, MCP_AUTH_TOKEN

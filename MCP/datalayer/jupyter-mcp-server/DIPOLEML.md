# Jupyter MCP Server

**DipoleML integration** for Datalayer. Type: `mcp`. Version: `0.0.0`.

🪐 🔧 Model Context Protocol (MCP) Server for Jupyter.

## Upstream

- Repository: https://github.com/datalayer/jupyter-mcp-server
- Commit: `ec66cb82f10b4eb37c98120db665f942bccec628`
- License: BSD-3-Clause (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3
- packages: jupyter_mcp_server
- env: MY_TOKEN, JUPYTER_URL, JUPYTER_TOKEN, DOCUMENT_URL, CODE_SANDBOX_URL, DOCUMENT_TOKEN, CODE_SANDBOX_TOKEN, CODE_SANDBOX_PROXY_TOKEN, DAYTONA_API_KEY, DAYTONA_JWT_TOKEN, E2B_API_KEY, CWSANDBOX_API_KEY
- credentials: MY_TOKEN, JUPYTER_TOKEN, DOCUMENT_TOKEN, CODE_SANDBOX_TOKEN, CODE_SANDBOX_PROXY_TOKEN, DAYTONA_API_KEY, DAYTONA_JWT_TOKEN, E2B_API_KEY

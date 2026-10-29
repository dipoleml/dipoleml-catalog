# Terraform MCP Server

**DipoleML integration** for Hashicorp. Type: `mcp`. Version: `0.0.0`.

The Terraform MCP Server provides seamless integration with Terraform ecosystem, enabling advanced automation and interaction capabilities for Infrastructure as Code (IaC) development.

## Upstream

- Repository: https://github.com/hashicorp/terraform-mcp-server
- Commit: `062700de87bb73f29c4a03b244146d995f643e20`
- License: MPL-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- env: TFE_TOKEN, TF_MCP_SHARED_SECRET, TRANSPORT_MODE, TRANSPORT_HOST, TRANSPORT_PORT, MCP_REDIRECT_ROOT_URL, MCP_TLS_KEY_FILE, OTEL_METRICS_EXPORT_INTERVAL, PASTE_TFE_TOKEN_HERE, TFE_TOKEN_HERE
- credentials: TFE_TOKEN, TF_MCP_SHARED_SECRET, MCP_TLS_KEY_FILE, PASTE_TFE_TOKEN_HERE, TFE_TOKEN_HERE

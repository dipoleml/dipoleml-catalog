# Blindpay MCP

**DipoleML integration** for Blindpaylabs. Type: `mcp`. Version: `1.8.0`.

Official BlindPay MCP server: stablecoin payouts, payins, quotes and receivers for global payments. Hosted remote (OAuth) and npm stdio.

## Upstream

- Repository: https://github.com/blindpaylabs/blindpay-mcp
- Commit: `7cdcfa13c7833bc54eecf7c5e62109114bb2c8e8`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-http · blindpay · https://mcp.blindpay.com/mcp
- mcp-http · blindpay-readonly · https://mcp.blindpay.com/mcp/readonly
- mcp-stdio · npx -y @blindpay/mcp

## Requirements

- runtimes: node >=20.0.0
- packages: @blindpay/mcp
- env: BLINDPAY_API_KEY, YOUR_BLINDPAY_API_KEY
- credentials: BLINDPAY_API_KEY, YOUR_BLINDPAY_API_KEY

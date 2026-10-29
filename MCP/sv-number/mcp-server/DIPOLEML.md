# MCP Server

**DipoleML integration** for Sv Number. Type: `mcp`. Version: `1.0.2`.

MCP server for AI agents that need a phone number: order a private number in 200+ countries, read the SMS verification code, hand it back. The widest country coverage in the category, and you can check it with one API call.

## Upstream

- Repository: https://github.com/sv-number/mcp-server
- Commit: `a57f15fb3846287ee2ed5868c516b497919a5a3b`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y sv-number-mcp

## Requirements

- runtimes: node >=18
- packages: sv-number-mcp
- env: SVN_API_KEY, SVN_API_BASE
- credentials: SVN_API_KEY

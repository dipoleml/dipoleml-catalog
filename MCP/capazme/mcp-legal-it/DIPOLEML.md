# MCP Legal It

**DipoleML integration** for Capazme. Type: `mcp`. Version: `0.0.0`.

MCP server + DipoleML plugin for Italian law — 200+ tools: verified statutes, case law search, legal calculations, GDPR compliance

## Upstream

- Repository: https://github.com/capazme/mcp-legal-it
- Commit: `d95b73cb8cde024558341e2ddd3197dcf3e3ed75`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3
- packages: mcp-legal-it
- env: IMPORTANT, MCP_TRANSPORT, MCP_HOST, MCP_PORT

# MCP Scanner

**DipoleML integration** for Cisco Ai Defense. Type: `mcp`. Version: `0.0.0`.

Scan MCP servers for potential threats & security findings.

## Upstream

- Repository: https://github.com/cisco-ai-defense/mcp-scanner
- Commit: `21a87b4bc818c2e279d9af6cf5b20ed386dfc9b5`
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
- packages: cisco-ai-mcp-scanner
- env: MCP_SCANNER_API_KEY, MCP_SCANNER_LLM_API_KEY, MCP_SCANNER_LLM_BASE_URL, MCP_SCANNER_LLM_API_VERSION, VIRUSTOTAL_API_KEY
- credentials: MCP_SCANNER_API_KEY, MCP_SCANNER_LLM_API_KEY, VIRUSTOTAL_API_KEY

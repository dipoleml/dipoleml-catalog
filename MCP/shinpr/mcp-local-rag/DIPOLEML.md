# MCP Local Rag

**DipoleML integration** for Shinpr. Type: `mcp`. Version: `0.23.1`.

Local-first RAG server for developers. Semantic + keyword search for code and technical docs. Works with MCP or CLI. Fully private, zero setup.

## Upstream

- Repository: https://github.com/shinpr/mcp-local-rag
- Commit: `d4f5bdd6253aa65646b8c6363e0f1f59a7812b74`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y mcp-local-rag

## Requirements

- runtimes: node ^22.23.4 || ^24.22.1 || >=26.12.1
- packages: mcp-local-rag

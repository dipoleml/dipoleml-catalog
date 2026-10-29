# Arxiv MCP Server

**DipoleML integration** for Blazickjp. Type: `mcp`. Version: `0.8.2`.

A local MCP server for agent literature work. Original-LaTeX section reads, BibTeX from arXiv metadata, and topic watches. Papers stay on disk. Search is optional.

## Upstream

- Repository: https://github.com/blazickjp/arxiv-mcp-server
- Commit: `572e301bb3198962c025d5ed5e14becb86868daa`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · uvx arxiv-mcp-server

## Requirements

- runtimes: python3
- packages: arxiv-mcp-server
- env: TRANSPORT, ALLOWED_HOSTS, SEMANTIC_SCHOLAR_API_KEY
- credentials: SEMANTIC_SCHOLAR_API_KEY

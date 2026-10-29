# Contextplus

**DipoleML integration** for Forloopcodes. Type: `mcp`. Version: `1.0.9`.

Semantic Intelligence for Large-Scale Engineering. Context+ is an MCP server designed for developers who demand 99% accuracy. By combining RAG, Tree-sitter AST, Spectral Clustering, and Obsidian-style linking, Context+ turns a massive codebase into a searchable, hierarchical feature graph.

## Upstream

- Repository: https://github.com/forloopcodes/contextplus
- Commit: `1b59b37f313047bd99d95e50ad8e5f0e2e38467f`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y contextplus

## Requirements

- runtimes: node
- packages: contextplus
- env: OLLAMA_API_KEY, YOUR_OLLAMA_API_KEY, CONTEXTPLUS_OPENAI_API_KEY, YOUR_GEMINI_API_KEY, CONTEXTPLUS_OPENAI_BASE_URL, OPENAI_API_KEY, YOUR_KEY, OPENAI_BASE_URL
- credentials: OLLAMA_API_KEY, YOUR_OLLAMA_API_KEY, CONTEXTPLUS_OPENAI_API_KEY, YOUR_GEMINI_API_KEY, OPENAI_API_KEY, YOUR_KEY

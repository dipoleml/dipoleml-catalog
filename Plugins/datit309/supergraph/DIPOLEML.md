# Supergraph

**DipoleML integration** for Datit309. Type: `plugin`. Version: `2.3.0`.

Engineering workflow system for AI coding agents — mandatory planning, TDD, verification, review, and intelligent codebase graph analysis.

## Upstream

- Repository: https://github.com/datit309/supergraph
- Commit: `b907b89996bf0772e70216d1a73a061e43acbfe7`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · codebase-memory-mcp
- mcp-stdio · serena start-mcp-server --context=claude-code --project-from-cwd
- mcp-stdio · node bin/sg-team-mcp.js
- mcp-stdio · node bin/sg-browser-mcp.js
- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: node
- packages: supergraph

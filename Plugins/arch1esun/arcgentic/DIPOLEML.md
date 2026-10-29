# Arcgentic

**DipoleML integration** for Arch1esun. Type: `plugin`. Version: `2.2.1`.

Mechanical plan/dev/self-audit/external-audit gates for AI coding agents, with a configurable role-routing topology engine, an MCP-UI live status panel, and native-tooling DipoleML V2 dispatch. DipoleML, Codex, OpenClaw, and PyPI.

## Upstream

- Repository: https://github.com/Arch1eSUN/Arcgentic
- Commit: `8539955052859f315436b961465341c7bc2b3c20`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · arcgentic python -- mcp-serve
- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: node >=18
- packages: arcgentic

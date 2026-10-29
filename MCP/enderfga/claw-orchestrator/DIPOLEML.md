# Claw Orchestrator

**DipoleML integration** for Enderfga. Type: `mcp`. Version: `7.16.0`.

Run DipoleML, Codex, Antigravity, Grok Build and OpenCode behind one runtime, and a run only counts as done when checks it didn't write pass. Cross-engine fan-out, councils, session handoff, spend caps, MCP server, ACP agent.

## Upstream

- Repository: https://github.com/Enderfga/claw-orchestrator
- Commit: `2b16548d5b34ecdafd8fba0055dac518a44835bb`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @enderfga/claw-orchestrator
- mcp-stdio · npx -y @enderfga/claw-orchestrator
- mcp-stdio · npx -y @enderfga/claw-orchestrator

## Requirements

- runtimes: node >=22.0.0
- packages: @enderfga/claw-orchestrator

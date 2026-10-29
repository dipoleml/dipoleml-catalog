# System1 Agents

**DipoleML integration** for Thinkflowlab. Type: `plugin`. Version: `0.1.0`.

System 1 decision models (Jev, Laya, Cua-S1) as brain for agents: Browser use, computer use, games and robotics

## Upstream

- Repository: https://github.com/ThinkFlowLab/system1-agents
- Commit: `c3c312f9670af03bf37290d01b23b72e1ccb248c`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · uv run --project ${CLAUDE_PLUGIN_ROOT:-.} s1a-mcp
- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: python3
- packages: system1-agents
- env: TYPESAFE_API_KEY, OPENROUTER_API_KEY
- credentials: TYPESAFE_API_KEY, OPENROUTER_API_KEY

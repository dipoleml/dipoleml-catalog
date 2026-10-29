# Vibe Check MCP Server

**DipoleML integration** for Pv Bhat. Type: `mcp`. Version: `2.9.0`.

Vibe Check is a tool that provides mentor-like feedback to AI Agents, preventing tunnel-vision, over-engineering and reasoning lock-in for complex and long-horizon agent workflows. KISS your over-eager AI Agents goodbye! Effective for: Coding, Ambiguous Tasks, High-Risk tasks

## Upstream

- Repository: https://github.com/PV-Bhat/vibe-check-mcp-server
- Commit: `ed8452f2d626011526b0c62f7be7d0a6f67794c1`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @pv-bhat/vibe-check-mcp

## Requirements

- runtimes: node >=20.0.0
- packages: @pv-bhat/vibe-check-mcp
- env: GEMINI_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL, MCP_ALLOWED_HOSTS, MCP_TRANSPORT, MCP_HTTP_PORT
- credentials: GEMINI_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN

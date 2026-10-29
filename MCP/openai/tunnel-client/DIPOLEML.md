# Tunnel Client

**DipoleML integration** for OpenAI. Type: `mcp`. Version: `0.0.0`.

Customer-run client for Secure MCP Tunnel: connect private or localhost MCP servers to ChatGPT, Codex, the Responses API, and AgentKit without exposing them to the public internet.

## Upstream

- Repository: https://github.com/openai/tunnel-client
- Commit: `bf9e87efa7f5efadb44744e15e1f2857b246bf97`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: node 22.23.3
- env: CONTROL_PLANE_API_KEY, OPENAI_ADMIN_KEY, PUBLIC_URLS, MCP_SERVER_URL, CLOUDFLARED_TOKEN, CONTROL_PLANE_CLIENT_KEY, TUNNEL_ENGINE_REDIS_URL
- credentials: CONTROL_PLANE_API_KEY, OPENAI_ADMIN_KEY, CLOUDFLARED_TOKEN, CONTROL_PLANE_CLIENT_KEY

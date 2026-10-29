# Premiere Pro MCP

**DipoleML integration** for Leancoderkavy. Type: `mcp`. Version: `1.26.0`.

Adobe Premiere Pro MCP — independent, local-first server for supported workflows. Connect DipoleML, Codex, or Cursor through a local CEP bridge.

## Upstream

- Repository: https://github.com/leancoderkavy/premiere-pro-mcp
- Commit: `1b183a0333af23a1b561928a67936c7f453aef3c`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y premiere-pro-mcp

## Requirements

- runtimes: node >=20.19.0
- packages: premiere-pro-mcp
- env: NPM_TOKEN, HKEY_CURRENT_USER, PREMIERE_UXP_TOKEN, PREMIERE_UXP_PORT, MCP_AUTH_TOKEN, MCP_PUBLIC_URL, MCP_HEADERS_TIMEOUT_MS, MCP_MAX_RATE_LIMIT_KEYS, POSTHOG_API_KEY, POSTHOG_HOST
- credentials: NPM_TOKEN, HKEY_CURRENT_USER, PREMIERE_UXP_TOKEN, MCP_AUTH_TOKEN, MCP_MAX_RATE_LIMIT_KEYS, POSTHOG_API_KEY

# Unifi MCP

**DipoleML integration** for Sirkirby. Type: `mcp`. Version: `0.0.0`.

MCP servers & Graph API for the UniFi suite of applications, Network, Protect, and Access

## Upstream

- Repository: https://github.com/sirkirby/unifi-mcp
- Commit: `0df304f7c1cf2504e23e960542b74ef0f61d4fb6`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3
- packages: unifi-mcp
- env: UNIFI_MCP_HTTP_AUTH_TOKEN, UNIFI_MCP_HOST, UNIFI_MCP_ALLOWED_HOSTS, UNIFI_NETWORK_HOST, UNIFI_PROTECT_HOST, UNIFI_ACCESS_HOST, UNIFI_HOST, UNIFI_API_KEY, UNIFI_PORT, UNIFI_NETWORK_PORT, UNIFI_PROTECT_PORT, UNIFI_ACCESS_PORT
- credentials: UNIFI_MCP_HTTP_AUTH_TOKEN, UNIFI_API_KEY, UNIFI_NETWORK_API_KEY, UNIFI_PROTECT_API_KEY, UNIFI_ACCESS_API_KEY

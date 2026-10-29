# MCP Grafana

**DipoleML integration** for Grafana. Type: `mcp`. Version: `0.7.6`.

MCP server for Grafana

## Upstream

- Repository: https://github.com/grafana/mcp-grafana
- Commit: `0f5eebe984a091ab2e4fb86413f7009a1651295b`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- env: GRAFANA_URL, GRAFANA_SERVICE_ACCOUNT_TOKEN, GRAFANA_FORWARD_HEADERS, GRAFANA_ALLOW_URL_OVERRIDE, GRAFANA_ALLOWED_URLS, MCP_GRAFANA_SERVER_TOKEN, GRAFANA_SERVICE_ACCOUNT_TOKEN_FILE, GRAFANA_API_KEY, GRAFANA_EXTRA_HEADERS
- credentials: GRAFANA_SERVICE_ACCOUNT_TOKEN, MCP_GRAFANA_SERVER_TOKEN, GRAFANA_SERVICE_ACCOUNT_TOKEN_FILE, GRAFANA_API_KEY

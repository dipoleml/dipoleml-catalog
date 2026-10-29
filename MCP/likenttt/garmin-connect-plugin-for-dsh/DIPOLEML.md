# Garmin Connect Plugin for Dsh

**DipoleML integration** for Likenttt. Type: `mcp`. Version: `0.1.20`.

A TypeScript-based Garmin Connect plugin and MCP server with secure browser-based MFA, built for DeepSeek Harness and designed to work with other AI agents.

## Upstream

- Repository: https://github.com/Likenttt/garmin-connect-plugin-for-dsh
- Commit: `355d383a1d16ba307ff56dbbc47feb505c07f69d`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y dsh-plugin-garmin-connect
- mcp-stdio · npx -y dsh-plugin-garmin-connect

## Requirements

- runtimes: node >=20.0.0
- packages: dsh-plugin-garmin-connect
- env: TEST_REPORT, GARMIN_PERSONAL_API_KEY_FILE, GARMIN_PERSONAL_API_KEY, GARMIN_SESSION_TOKEN, GARMIN_SESSION_TOKEN_FILE
- credentials: GARMIN_PERSONAL_API_KEY_FILE, GARMIN_PERSONAL_API_KEY, GARMIN_SESSION_TOKEN, GARMIN_SESSION_TOKEN_FILE

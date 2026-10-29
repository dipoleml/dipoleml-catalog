# Windows MCP

**DipoleML integration** for Cursortouch. Type: `mcp`. Version: `0.0.0`.

MCP Server for Computer Use in Windows

## Upstream

- Repository: https://github.com/CursorTouch/Windows-MCP
- Commit: `fbb2ac612831f0a42fa641f1cdd058c928c12b39`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE.md` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3
- packages: windows-mcp
- env: WINDOWS_MCP_AUTH_KEY, WINDOWS_MCP_SSL_KEYFILE, WINDOWS_MCP_OAUTH_CLIENT_SECRET, POSTHOG_API_KEY, POSTHOG_HOST
- credentials: WINDOWS_MCP_AUTH_KEY, WINDOWS_MCP_SSL_KEYFILE, WINDOWS_MCP_OAUTH_CLIENT_SECRET, POSTHOG_API_KEY

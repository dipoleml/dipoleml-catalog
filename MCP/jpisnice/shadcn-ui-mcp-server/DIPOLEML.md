# Shadcn UI MCP Server

**DipoleML integration** for Jpisnice. Type: `mcp`. Version: `3.0.0`.

A mcp server to allow LLMS gain context about shadcn ui component structure,usage and installation,compaitable with react,svelte 5,vue & React Native

## Upstream

- Repository: https://github.com/Jpisnice/shadcn-ui-mcp-server
- Commit: `30efb8a0bf8d968e4c6635e4491c20da96e49d20`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @jpisnice/shadcn-ui-mcp-server
- mcp-stdio · npx -y @jpisnice/shadcn-ui-mcp-server

## Requirements

- runtimes: node >=20.0.0
- packages: @jpisnice/shadcn-ui-mcp-server
- env: GITHUB_PERSONAL_ACCESS_TOKEN, MCP_TRANSPORT_MODE, MCP_PORT, MCP_HOST, YOUR_TOKEN, HTTP_TRANSPORT
- credentials: GITHUB_PERSONAL_ACCESS_TOKEN, YOUR_TOKEN

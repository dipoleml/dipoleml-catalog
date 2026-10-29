# Mobilebuildmcp

**DipoleML integration** for Getsentry. Type: `mcp`. Version: `2.7.1`.

A Model Context Protocol (MCP) server and CLI that provides tools for agent use when working on iOS and macOS projects.

## Upstream

- Repository: https://github.com/getsentry/MobileBuildMCP
- Commit: `2998ac77ebbca59544e88a27f34bfb830db9d924`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-http · sentry · https://mcp.sentry.dev/mcp
- mcp-stdio · node ../../build/cli.js mcp
- mcp-stdio · npx -y mobilebuildmcp
- mcp-stdio · npx -y mobilebuildmcp

## Requirements

- runtimes: node
- packages: mobilebuildmcp

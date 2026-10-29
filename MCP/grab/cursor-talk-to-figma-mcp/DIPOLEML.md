# Cursor Talk to Figma MCP

**DipoleML integration** for Grab. Type: `mcp`. Version: `0.3.5`.

TalkToFigma: MCP integration between AI Agent (Cursor, DipoleML, Codex) and Figma, allowing Agentic AI to communicate with Figma for reading designs and modifying them programmatically.

## Upstream

- Repository: https://github.com/grab/cursor-talk-to-figma-mcp
- Commit: `ddd90f3a6d454ea0b2fc29f1b084f50fd062b880`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · bunx cursor-talk-to-figma-mcp@latest
- mcp-stdio · npx -y cursor-talk-to-figma-mcp
- mcp-stdio · node dist/server.js

## Requirements

- runtimes: node
- packages: cursor-talk-to-figma-mcp

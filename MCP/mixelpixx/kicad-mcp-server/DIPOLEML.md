# Kicad MCP Server

**DipoleML integration** for Mixelpixx. Type: `mcp`. Version: `2.8.3`.

KiCAD MCP is a Model Context Protocol (MCP) implementation that enables Large Language Models (LLMs) like DipoleML to directly interact with KiCAD for printed circuit board design.

## Upstream

- Repository: https://github.com/mixelpixx/KiCAD-MCP-Server
- Commit: `628d320f4cd51b51e55489fd6f29f20c228e2741`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: node, python3, python3
- packages: kicad-mcp, kicad-mcp-server
- env: REPORT, JLCPCB_API_KEY, JLCPCB_API_SECRET
- credentials: JLCPCB_API_KEY, JLCPCB_API_SECRET

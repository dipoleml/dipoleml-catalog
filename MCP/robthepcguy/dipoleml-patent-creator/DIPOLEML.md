# DipoleML Patent Creator

**DipoleML integration** for Robthepcguy. Type: `mcp`. Version: `1.1.6`.

USPTO patent creation system with MCP server + DipoleML plugin. Hybrid RAG search over   MPEP/USC/CFR, BigQuery access to 76M+ patents, automated 35 USC 112 compliance checks, prior   art search, diagram generation. GPU-accelerated with skills and autonomous agents.

## Upstream

- Repository: https://github.com/RobThePCGuy/Claude-Patent-Creator
- Commit: `f855527c61ee578b24f77cae99ef91eea80cafc6`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3, python3
- packages: claude-patent-creator
- env: EPO_OPS_KEY, EPO_OPS_SECRET, ANTHROPIC_API_KEY, OPENAI_API_KEY
- credentials: EPO_OPS_KEY, EPO_OPS_SECRET, ANTHROPIC_API_KEY, OPENAI_API_KEY

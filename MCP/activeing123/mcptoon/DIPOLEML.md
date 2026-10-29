# Mcptoon

**DipoleML integration** for Activeing123. Type: `mcp`. Version: `0.0.0`.

One zero-dependency CLI for every MCP server and agent skill. Token optimization, tool discovery and context compression: 71,929 -> 581 tokens (-99.2%, measured), schemas stay out of context. One config for DipoleML, Codex, Cursor, every agent. 341KB, pure Python. | 零依赖 CLI：管所有 MCP 工具与技能，工具发现省 99.2% token。

## Upstream

- Repository: https://github.com/activeing123/mcptoon
- Commit: `1b3463a07cd9ceaed973633505e22b8ed18e3b5e`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3
- packages: mcptoon
- env: BAIZHI_TOKEN, REG_URL
- credentials: BAIZHI_TOKEN

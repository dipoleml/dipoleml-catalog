# Design Extract

**DipoleML integration** for Manavarya09. Type: `mcp`. Version: `13.3.2`.

Extract any website's complete design system with one command. DTCG tokens, semantic+primitive+composite, MCP server for DipoleML/Cursor/Windsurf, multi-platform emitters (iOS SwiftUI, Android Compose, Flutter, WordPress), Tailwind v4, Figma variables, shadcn/ui, CSS health audit, WCAG remediation, Chrome extension. MIT, Playwright, Node 20+.

## Upstream

- Repository: https://github.com/Manavarya09/design-extract
- Commit: `d2c28da8aae3098a7f7dc02fb4355f3f803edb6c`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y designlang
- mcp-stdio · node ./bin/design-extract.js

## Requirements

- runtimes: node >=20
- packages: designlang
- env: ATLASCLOUD_API_KEY, ATLASCLOUD_API_BASE, ATLAS_CLOUD_API_KEY, ATLAS_CLOUD_API_BASE, OPENAI_API_KEY, ANTHROPIC_API_KEY
- credentials: ATLASCLOUD_API_KEY, ATLAS_CLOUD_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY

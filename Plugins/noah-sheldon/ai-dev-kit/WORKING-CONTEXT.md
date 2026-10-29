# Working Context

This repo is the shipping surface for AI Dev Kit.

Current release surfaces:
- Claude marketplace: `.claude-plugin/marketplace.json`
- Claude plugin: `.claude-plugin/plugin.json`
- Codex plugin: `.codex-plugin/plugin.json`
- OpenCode config: `.opencode/opencode.json`

Release rules:
- Keep prompts short and direct.
- Keep agent, skill, and command markdown aligned with the ECC-style structure.
- Treat `scripts/validate-surface.js` as the shipping gate.
- Keep `homepage`, `repository`, and plugin metadata aligned with the public project identity.

OpenCode note:
- The `.opencode/` folder is a publishable surface, not just a local config.
- The package metadata and TypeScript entrypoints live in `.opencode/`.


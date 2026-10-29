# OpenCode Support

This folder contains the OpenCode-facing publish surface for AI Dev Kit.

Use the root repo for the canonical content. Use this folder when packaging or
publishing the OpenCode integration.

What is included:
- `opencode.json`
- TypeScript package entrypoints
- plugin and tool exports
- prompt and instruction files

What to remember:
- Keep this folder aligned with the root agent, skill, and command surface.
- Keep prompt text concise and direct.
- Keep `fallback_model` set for resilience.


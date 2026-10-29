# designlang — Figma plugin

Pulls design tokens from any live website directly into Figma Variables.

Two entry points:

1. **From URL** — the plugin fetches `https://designlang.manavaryasingh.com/api/extract?format=figma&url=<url>` and imports the returned collections + variables.
2. **Paste JSON** — run `designlang <url>` locally and paste the resulting `<prefix>-figma-variables.json`.

## Install (local dev)

1. Figma desktop → *Plugins* → *Development* → *Import plugin from manifest...*
2. Select `figma-plugin/manifest.json`.

## Publish

```bash
# after scoring the manifest + icons
# Community publishing is done through the Figma UI, not CLI.
```

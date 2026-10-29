# designlang for VS Code

Extract design tokens from any website, right from VS Code.

## Features

- `designlang: Extract design from URL` — runs `designlang <url>` and writes tokens, Tailwind config, CSS variables, and a visual preview into your workspace.
- `designlang: Extract and inject into workspace` — runs `designlang apply <url>` to detect your framework (Tailwind, shadcn/ui, or plain CSS) and write tokens into the right config files automatically.

## Requirements

- Node.js 20+
- `npx` on PATH

The extension shells out to `npx designlang`, so no separate install step.

## Settings

- `designlang.outputDir` — output directory (default: `./design-extract-output`).
- `designlang.extraArgs` — extra CLI args, e.g. `--full --selector .pricing`.

## Publish

```bash
cd vscode-extension
npm install
npx vsce package
npx vsce publish
```

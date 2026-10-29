---
description: Launch the local design Studio — a live token editor over the latest extraction. Edit, preview a wall of real components, toggle dark mode, inspect motion, and export.
argument-hint: [--dir ./design-extract-output] [--port 4837]
---

Launch **designlang studio**, a tiny local web app that turns the most recent
extraction into a living, editable design system. Editing a token restyles a
wall of real components and a rebuilt page instantly; you can toggle a generated
dark mode, inspect easing curves and choreography in the Motion tab, and export
the edited system back out as DTCG tokens, CSS variables, and a Tailwind theme —
or copy a shareable link that encodes the edits.

```bash
npx designlang studio $ARGUMENTS
```

This starts a local HTTP server (default port 4837) and prints a URL. Tell the
user to open it in their browser. It reads the latest `*-design-tokens.json`
from `./design-extract-output/` by default — if there is no extraction yet, run
`/extract <url>` or `/site <url>` first.

Useful flags via `$ARGUMENTS`:

| Flag | Effect |
|---|---|
| `--dir <dir>` | directory to read the latest extraction from |
| `--port <n>` | port for the local server (default 4837) |

The server runs until the user stops it (Ctrl+C). Do not block on it — surface
the URL and let the user drive.

Full reference: https://github.com/Manavarya09/design-extract#full-cli-reference

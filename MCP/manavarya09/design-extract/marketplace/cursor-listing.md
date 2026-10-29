# Cursor — designlang MCP integration

## What it gives the user

Inside Cursor (and Windsurf, and Claude Desktop), `designlang` exposes the **last extraction** as a live MCP resource. Cursor can read tokens, regions, components, and CSS health without re-extracting, and call MCP tools to refine the design (`designlang chat` ops are wired here).

## Install (paste into `~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "designlang": {
      "command": "npx",
      "args": ["-y", "designlang", "mcp", "--output-dir", "./design-extract-output"]
    }
  }
}
```

## What Cursor sees

Resources:
- `designlang://latest/tokens` — DTCG W3C token tree of the most recent extraction
- `designlang://latest/regions` — semantic region map (nav, hero, pricing, …)
- `designlang://latest/components` — component clusters with variant/size/state
- `designlang://latest/css-health` — specificity graph + unused-CSS report
- `designlang://latest/design-md` — the agent-native single-file artifact

Tools:
- `designlang_extract` — paste a URL, get tokens
- `designlang_chat` — apply mutations (sharpen / soften / dark / brutalist / glass / swap-color / swap-font)
- `designlang_clone` — generate a working Next.js repo from a URL
- `designlang_drift` — compare local tokens against a live URL

## Tweet thread for launch

```
1/ Cursor + designlang. Paste any URL inside Cursor and it reads the live design system as MCP resources.

`~/.cursor/mcp.json`:
{
  "mcpServers": {
    "designlang": {
      "command": "npx",
      "args": ["-y", "designlang", "mcp"]
    }
  }
}

2/ Then ask: "Refactor my <Button> to match stripe.com's design language" — Cursor reads designlang://latest/tokens and rewrites against the real palette, radii, shadows, voice.

3/ It also exposes `designlang_chat` as a tool. "Make it brutalist" → tokens regenerate. "Swap primary to #ff4800" → updated. Then ask Cursor to apply the new tokens to your repo.

4/ $0. MIT. https://designlang.app
```

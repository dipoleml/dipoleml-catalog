---
description: Restyle a site in another design vocabulary — brutalist, swiss, art-deco, cyberpunk, soft-ui, or editorial. Preserves page shape, swaps the visual vocabulary.
argument-hint: <url> --as <brutalist|swiss|art-deco|cyberpunk|soft-ui|editorial> | --all
---

Restyle the page shape of an extracted site under a different visual vocabulary.

```bash
npx designlang remix $ARGUMENTS
```

If `$ARGUMENTS` is empty, ask the user for a URL and offer the six vocabularies. If only a URL is given, default to `--all` so they see every variant side by side.

The six vocabularies:

| `--as <id>` | Vibe |
|---|---|
| `brutalist` | Raw, blocky, monospace, no shadows |
| `swiss` | Clean grid, sans, minimal palette |
| `art-deco` | Geometric, gold accents, serif display |
| `cyberpunk` | Neon, dark, glowing CTAs |
| `soft-ui` | Pastel, soft shadows, generous radii |
| `editorial` | Newspaper feel, serif, narrow columns |

Use `--all` to emit all six in one pass — six standalone HTML files plus a comparison index.

After the run, read the comparison index (`*-remix-index.html` or `*-remix.<vocab>.html`) and tell the user which file to open. Offer to launch `--open` automatically.

Pair with `/battle` for cross-vocab fights ("Stripe-as-cyberpunk vs Vercel-as-art-deco"), or `/pack` to bundle a remixed system as a downloadable design directory.

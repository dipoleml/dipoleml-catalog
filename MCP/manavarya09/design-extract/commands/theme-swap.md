---
description: Recolour an extracted site's design around a new brand primary. OKLCH hue rotation preserves perceptual lightness — neutrals, type, spacing, and motion stay untouched. Side-by-side HTML preview + recoloured tokens (DTCG, Tailwind, shadcn, Figma).
argument-hint: <url> --primary <hex>  [--from <hex>] [--open]
---

Take any extracted site and swap its brand primary to the user-provided hex. The whole palette rotates around that hue while neutrals and structural tokens stay put.

```bash
npx designlang theme-swap $ARGUMENTS
```

If `$ARGUMENTS` doesn't contain both a URL and `--primary <hex>`, ask the user for the missing piece.

After the run completes, all output goes to `./design-extract-output/`:

- `*.themeswap.html` — editorial side-by-side preview (open this)
- `*.themeswap.md` — markdown diff table
- `*.themeswap.json` — structured before→after deltas
- `*.themeswap.tokens.json` — recoloured DTCG token set you can drop into a project

After the command finishes:

1. Read `*.themeswap.md` to summarise the swap (`from → to`, hue shift, count of changed colours).
2. Show the user the verdict line ("X colours changed, neutrals preserved, type/spacing/motion untouched").
3. Offer to open the HTML preview (`--open` does this automatically).
4. Suggest the recoloured token files as drop-ins for an existing Tailwind / shadcn project.

## Useful flags

| Flag | Effect |
|---|---|
| `--primary <hex>` | **required.** Target brand colour (e.g. `"#ff4800"`). |
| `--from <hex>` | Override the auto-detected source primary when the extractor misclassifies (e.g. a neutral got promoted by usage count). |
| `--format html\|md\|json\|tokens\|all` | Pick the output(s). Default `all`. |
| `--out <dir>` | Output directory. Default `./design-extract-output`. |
| `--open` | Open the HTML preview in your default browser. |

## Pairs nicely with

- `/grade <url>` — grade the recoloured site by feeding the same target through `/extract` then `/grade`.
- `/pack <url>` — bundle the recoloured tokens as a downloadable design-system folder.
- `/remix <url> --as <vocab>` — full vocabulary swap (brutalist, art-deco, cyberpunk…) instead of just brand colour.

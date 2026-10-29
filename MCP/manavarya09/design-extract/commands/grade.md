---
description: Generate a shareable HTML "Design Report Card" — letter grade, 8 dimensions, evidence (palette, type, rhythm), strengths + fixes, plus an SVG badge.
argument-hint: <url> [--badge] [--open]
---

Audit the design system at the user-provided URL. Emits a self-contained HTML report card plus JSON + Markdown variants. Pass `--badge` to also emit a shields.io-style SVG you can drop into any README.

```bash
npx designlang grade $ARGUMENTS
```

If no `$ARGUMENTS` were supplied, ask the user which URL to grade.

After the run completes:

1. Read the generated `*.grade.md` file from `./design-extract-output/`
2. Surface the headline grade (A–F · score · 8 dimensions)
3. Highlight the top 3 strengths and top 3 issues from the report
4. Offer to open the HTML in the browser (the `--open` flag does this automatically)

If the user wants the live shareable badge URL instead of generating files locally, they can use:

```markdown
![Design Score](https://designlang.app/badge/<host>.svg)
```

This endpoint is blob-cached 24h with edge caching for ~50ms repeat hits.

Compare two sites with `/battle <A> <B>`, restyle with `/remix`, bundle everything with `/pack`.

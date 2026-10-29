---
description: Crawl a whole site and synthesize ONE canonical design system across all pages — unified tokens, coverage map, consistency grade.
argument-hint: <url> [--max-pages <n>]
---

Run **designlang site** against the user-provided URL. Instead of reading one
page, it crawls the site's canonical pages (home, pricing, docs, blog, about,
product…), extracts each, and synthesizes a single de-duplicated design system
weighted by how broadly each token is used.

```bash
npx designlang site $ARGUMENTS
```

If no `$ARGUMENTS` were supplied, ask the user which site to analyze.

Default output goes to `./design-extract-output/`. When it finishes, read the
generated files and present a tight summary:

1. `*-site-consistency.md` — the **consistency grade** (A–F · score), the
   per-category breakdown, and the off-system outlier tokens (introduced by a
   single page) that are candidates to consolidate.
2. `*-site-coverage.md` — which tokens are 🟢 site-wide, 🟡 section, or
   🔴 page-local, and which pages use each.
3. `*-site-system.json` — the canonical unified tokens.

The standard pack (DTCG tokens, Tailwind, shadcn theme, CSS variables,
`*-design-language.md`) is also emitted — but from the **whole-site canonical
system**, not just the homepage.

Useful flags via `$ARGUMENTS`:

| Flag | Effect |
|---|---|
| `--max-pages <n>` | crawl up to N pages including the homepage (default 6) |
| `--out <dir>` | output directory |
| `--name <prefix>` | output filename prefix |

Then offer follow-ups:

- `/grade <url>` — single-page Design Report Card + SVG badge
- `/studio` — open the live token editor over the latest extraction
- `/pack <url>` — bundle every output into one design-system directory

Full reference: https://github.com/Manavarya09/design-extract#full-cli-reference

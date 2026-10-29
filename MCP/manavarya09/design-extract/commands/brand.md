---
description: Generate a full editorial brand-guidelines book for any URL. 14 chapters covering brand essence/archetype, colour, typography, spacing, shape, iconography, motion, components, voice, accessibility, tokens, and how-to-use guidance. Print-ready, dark-mode toggle, hand-off-ready single HTML.
argument-hint: <url> [--open]
---

Build a self-contained, hand-off-ready brand-guidelines book from any live URL.

```bash
npx designlang brand $ARGUMENTS
```

If no URL is provided, ask the user which site to document.

Output goes to `./design-extract-output/`:

- `*.brand.html` — the editorial book (open this — it's a self-contained, print-ready document with TOC, smooth-scroll, dark-mode toggle)
- `*.brand.md` — terse markdown summary (good for diffing snapshots)
- `*.brand.json` — structured slice of the design with the surfaces the book renders

After the run completes:

1. Read `*.brand.md` to summarise what was captured (host, page intent, material language, tone, palette size, type families, WCAG score)
2. Tell the user the headline numbers (`X tokens · Y fonts · grade Z`)
3. Offer to open the HTML book (`--open` does this automatically)
4. Suggest pairing: `/pack <url>` if they want a developer-facing bundle to drop into a project, `/grade <url>` for the audit, `/theme-swap <url>` to derive a recoloured variant

## What's in the book

| § | Chapter | What it documents |
|---|---|---|
| 00 | Essence | Synthesized brand personality: positioning statement, archetype (1 of 12 Jungian, with confidence), adjectives, and a four-axis meter (warmth · energy · weight · era) — every call traced to extracted signals |
| 01 | About | Page intent, material language, imagery style, component library, stack, voice tone |
| 02 | Logo | Extracted SVG logo + clearspace + dimensions |
| 03 | Colour | Brand colours with HEX/RGB/HSL/usage, neutrals grid, full palette, A11y callout |
| 04 | Typography | Display + body families, weights, scale table, large specimen |
| 05 | Spacing | Base unit, scale length, visual rhythm bars |
| 06 | Shape | Border radii visualised, shadow elevation system |
| 07 | Iconography | Icon library detection + captured icons grid |
| 08 | Motion | Feel, durations (animated dots), easings, spring presence, scroll-linked flag |
| 09 | Components | Detected components with slots/variants/sizes |
| 10 | Voice & tone | Tone, pronoun posture, heading case, top CTA verbs, sample headings |
| 11 | Accessibility | WCAG score, failing pairs table, suggested replacements |
| 12 | Tokens | Drop-in code blocks (CSS vars, Tailwind config) + cross-ref to `pack` |
| 13 | How to use | Six rules of thumb for derivative work |

## Useful flags

| Flag | Effect |
|---|---|
| `--format html\|md\|json\|all` | Pick the output(s). Default `all`. |
| `--out <dir>` | Output directory. Default `./design-extract-output`. |
| `-n, --name <name>` | Output file prefix. Default derived from URL. |
| `--open` | Open the HTML book in your default browser. |

## Pairs nicely with

- `/pack <url>` — when the recipient wants files to drop into a project, not a guidelines doc
- `/grade <url>` — when the recipient wants the audit/score, not the full book
- `/theme-swap <url> --primary <hex>` — when the recipient wants the same system in their brand colour
- `/remix <url> --as <vocab>` — when the recipient wants a vocabulary swap (brutalist, swiss, etc.)

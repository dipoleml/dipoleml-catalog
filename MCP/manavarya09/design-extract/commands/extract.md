---
description: Extract the complete design language from a URL — DTCG tokens, Tailwind, Figma vars, motion, voice, components.
argument-hint: <url> [extra flags…]
---

Run **designlang** against the user-provided URL and surface the result.

```bash
npx designlang $ARGUMENTS
```

If no `$ARGUMENTS` were supplied, ask the user which URL to extract.

Default output goes to `./design-extract-output/`. Once it finishes, read the generated `*-design-language.md` (the AI-optimized markdown) and present a tight summary to the user:

- Primary palette (hex codes)
- Type families + scale
- Spacing base + scale
- WCAG accessibility score
- Component patterns detected
- Notable signals (motion feel, material language, brand voice tone)

Then offer follow-ups:

- `/grade <url>` — shareable HTML Design Report Card + SVG badge
- `/battle <urlA> <urlB>` — head-to-head graded comparison
- `/remix <url> --as <vocab>` — restyle in another vocabulary
- `/pack <url>` — bundle every output into one design-system directory

Useful flags the user may pass via `$ARGUMENTS`:

| Flag | Effect |
|---|---|
| `--full` | screenshots + responsive + interactions + deep-interact |
| `--depth <n>` | crawl N additional canonical pages |
| `--dark` | also extract dark mode |
| `--platforms ios,android,flutter,wordpress` | multi-platform emitters |
| `--smart` | LLM fallback for low-confidence classifiers (supports `ATLASCLOUD_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY`) |
| `--cookie-file ./session.json` | authenticated extraction |

Full reference: https://github.com/Manavarya09/design-extract#full-cli-reference

Atlas Cloud quick setup for `--smart`:

```bash
export ATLASCLOUD_API_KEY="<atlascloud-api-key>"
export ATLASCLOUD_MODEL="deepseek-ai/deepseek-v4-pro"
npx designlang https://stripe.com --smart
```

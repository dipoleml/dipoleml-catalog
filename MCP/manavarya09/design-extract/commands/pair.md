---
description: Fuse two extracted designs into a single hybrid identity. Pick which axis (colour, typography, spacing, shape, motion, voice, components) comes from which site. Defaults to "visual A × voice B" — same colours/spacing as the first URL, type/voice/components from the second.
argument-hint: <urlA> <urlB>  [--colors-from a|b] [--typography-from a|b] [--brand]
---

Fuse the design DNA of two sites and emit an editorial pair card showing the crossover.

```bash
npx designlang pair $ARGUMENTS
```

If `$ARGUMENTS` doesn't contain at least two URLs, ask the user for the second one.

Both sites are extracted in parallel (~30s total). Outputs land in `./design-extract-output/`:

- `*-x-*.pair.html` — editorial pair card with cover, axis matrix, fused specimen
- `*-x-*.pair.md` — markdown summary (axis source table)
- `*-x-*.pair.json` — structured deltas (which axis came from where)
- `*-x-*.pair.brand.html` — full brand-guidelines book of the fused identity (only with `--brand`)

After the run completes:

1. Read the markdown to summarise: which axis came from A, which from B
2. Highlight the most distinctive crossover (the fused specimen quotes a real headline from whichever site contributed the voice)
3. Offer to open the HTML pair card

## Default axis split

| Axis | Default source | Why |
|---|---|---|
| Colour | A | Brand identity tends to lead with colour |
| Spacing | A | Spacing co-varies with the visual layout |
| Shape | A | Radii + shadows belong with the visual surface |
| Motion | A | Motion is part of the visual feel |
| **Typography** | **B** | The crossover moment — different voice |
| **Voice** | **B** | Tone, headings, CTA verbs from B |
| **Components** | **B** | Anatomy from B's library |

So the default is "Site A's visuals + Site B's words". Override any axis with `--<axis>-from a|b`.

## Useful flags

| Flag | Effect |
|---|---|
| `--colors-from <a\|b>` | Force colour source |
| `--typography-from <a\|b>` | Force typography source |
| `--spacing-from <a\|b>` | Force spacing source |
| `--shape-from <a\|b>` | Force radii + shadows source |
| `--motion-from <a\|b>` | Force motion source |
| `--voice-from <a\|b>` | Force voice / tone / heading source |
| `--components-from <a\|b>` | Force component anatomy source |
| `--brand` | Also emit a full brand-guidelines book of the fused identity |
| `--format html\|md\|json\|all` | Pick output formats |
| `--open` | Open the HTML pair card |

## Example experiments

```
npx designlang pair stripe.com linear.app                 # default split
npx designlang pair stripe.com linear.app --type-from a   # Stripe everything except components/voice from Linear
npx designlang pair vercel.com apple.com --brand          # fused identity as a hand-off brand book
```

## Pairs nicely with

- `/grade <url>` — grade either source side individually before pairing
- `/brand <url>` — generate a brand book of one source for comparison
- `/battle <urlA> <urlB>` — head-to-head graded comparison (the inverse of `pair`)

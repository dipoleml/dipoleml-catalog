---
description: Measure how faithfully a clone reproduces a site — pixel-diff plus motion-fidelity into one 0-100 score, a letter grade, a ranked correction plan, and a shareable card.
argument-hint: <original-url> --clone <clone-url> [--min <score>] [--motion-runtime]
---

Run **designlang fidelity** to score a clone against the site it was cloned
from. Unlike tools that just hand you code and *claim* "pixel-perfect", this
measures it: a full-page pixel-diff for visuals **and** a motion-fidelity
comparison (durations, easings, springs, keyframe kinds, scroll-linked motion,
choreography/stagger) — blended into one score with a ranked plan of what to fix
next.

```bash
npx designlang fidelity $ARGUMENTS
```

If no `$ARGUMENTS` were supplied, ask the user for the **original URL** and the
**clone URL** (often a local dev server like `http://localhost:3000`).

After the run, surface the **overall score + grade**, the visual/motion split,
and the top correction directives. Outputs land in the output dir:

| File | What it is |
|---|---|
| `fidelity.md` | headline score, motion breakdown table, ranked correction plan |
| `fidelity.json` | the full machine-readable report |
| `fidelity-card.svg` | a shareable score card (`88% · B · stripe.com`) |
| `fidelity-diff.png` | the visual loss heatmap |

Useful flags via `$ARGUMENTS`:

| Flag | Effect |
|---|---|
| `--clone <url>` | the clone to score (required) |
| `--min <score>` | exit non-zero if overall fidelity is below this (CI gate) |
| `--motion-runtime` | capture real runtime motion + choreography on both sides |

This is the self-correcting clone loop: measure → read the correction plan →
rebuild → re-run until the score crosses your threshold. Pair with `/extract`
and `/verify`.

Full reference: https://github.com/Manavarya09/design-extract#full-cli-reference

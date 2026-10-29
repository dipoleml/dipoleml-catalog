---
description: Fidelity check — rebuild a page from the extracted tokens, pixel-diff it against the live site, and score how faithfully the tokens capture the design.
argument-hint: <url> [--min <score>] [--tokens <file>]
---

Run **designlang verify** to close the extraction loop. It rebuilds a page from
the extracted design tokens, renders it, pixel-diffs that render against the
live site, and reports a fidelity score — how faithfully the tokens reproduce
the real design.

```bash
npx designlang verify $ARGUMENTS
```

If no `$ARGUMENTS` were supplied, ask the user which URL to verify.

After the run completes, surface the **fidelity score** and the biggest
divergences (where the rebuilt page drifts from the live site). This is the
honest "did we actually capture it?" signal.

Useful flags via `$ARGUMENTS`:

| Flag | Effect |
|---|---|
| `--min <score>` | exit non-zero if fidelity is below this (CI gate) |
| `--tokens <file>` | verify against a local tokens file (`.json` or `.css`) instead of a fresh extraction |

Use `--min` in CI to fail a build when a design change drops fidelity below a
threshold. Pair with `/site <url>` to verify the whole-site canonical system.

Full reference: https://github.com/Manavarya09/design-extract#full-cli-reference

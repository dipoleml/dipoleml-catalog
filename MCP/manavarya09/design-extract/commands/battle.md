---
description: Head-to-head graded battle card between two sites — eight dimensions, bar-by-bar, verdict line.
argument-hint: <urlA> <urlB>
---

Pit two sites against each other and emit a single shareable HTML battle card.

```bash
npx designlang battle $ARGUMENTS
```

If `$ARGUMENTS` is empty or contains fewer than two URLs, ask the user for both sites.

Both sites are extracted in parallel (~30s total). Outputs land in `./design-extract-output/`:

- `<a>-vs-<b>.battle.html` — the shareable card
- `<a>-vs-<b>.battle.md` — markdown summary
- `<a>-vs-<b>.battle.json` — structured scores

After the run:

1. Read the `*.battle.md` file
2. Show the user the verdict line ("X wins" / "tie") and the per-dimension table
3. Highlight the dimensions where the gap is widest
4. Offer to open the HTML card

This is pure viral content — battles are designed to be tweeted. Pair with `/grade <url> --badge` so each side has a permanent badge to link back to.

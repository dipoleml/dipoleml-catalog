# Capture — confidence tiers (gated reference)

> Read before you put a question to the user.

## Confidence tiers

Question bodies carry the recommendation and its tier; option labels stay neutral so the user is not anchored.

| Tier | When | Example body |
|------|------|--------------|
| `[high]` | Strong codebase or convention signal | `Recommended: extend fn-12-oauth-callback — 3 strong title matches, same module. Confidence: [high].` |
| `[judgment-call]` | A lean; reasonable people disagree | `Recommended: proceed-anyway — 2 matches, the specs may co-exist. Confidence: [judgment-call].` |
| `[your-call]` | No signal; the user's priorities decide | `No recommendation — pick what fits your priority. Confidence: [your-call].` |

`[your-call]` is deliberate: always recommending trains users to defer. Under it, list the trade-offs without a preference.

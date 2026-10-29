# designlang — v8 launch kit

A ready-to-fire playbook for the Product Hunt + Show HN push that accompanies v8.

## The story

v8 ships three things in one release:

1. **Real brand colors.** The extractor now picks CTA/interactive color as the primary instead of the most-counted gray.
2. **Defensible design scores.** The scoring rubric was recalibrated against Stripe / Linear / Vercel / GitHub / Apple as ground-truth sites.
3. **New surfaces.** VS Code extension, Raycast extension, Figma plugin, GitHub Action ("Design Regression Guard"), MCP registry listing.

## Headline options

- `designlang — extract any website's design system into Tailwind, shadcn, Figma, and MCP in one command`
- `I got tired of Figma being the source of truth. Now my design system syncs from the deployed site.`
- `designlang v8 — real brand colors, calibrated scoring, VS Code + Raycast + Figma + GitHub Action`

## Taglines (140 char)

- "Reads a website the way a developer reads a stylesheet. Emits Tailwind, shadcn, Figma Variables, and a working MCP server from one URL."
- "One command. Any URL. Tailwind config, shadcn theme, Figma variables, and a design regression guard for your PRs."

## Product Hunt

### Tagline

> Extract any website's design system in one command.

### Description

> designlang crawls any live website with a headless browser, extracts every computed style, and generates Tailwind, shadcn/ui, Figma Variables, W3C Design Tokens, and an MCP server in a single `npx` command. v8 ships calibrated brand-color detection, a VS Code extension, a Raycast extension, a Figma plugin, and a GitHub Action that guards your design system against regressions on every PR.

### First comment (the story)

> Hey PH — I built designlang because I kept losing hours converting production designs into Tailwind configs by hand. Every existing tool gave me hex codes but missed the actual design system: spacing, radii, elevation, interaction states, the relationship between tokens.
>
> v8 closes the last credibility gap: the extractor now picks the real brand color (not the most-used gray) and the design-score rubric is recalibrated against ground-truth sites. If it gave Linear an F before, it now gives it a C+/B, and if it gave Stripe an A before, it still does.
>
> Would love feedback on the Figma plugin direction — the dream is that designers paste a URL and get a full Figma Variables set without touching the CLI.

### Assets (attach in this order)

1. Animated terminal GIF (`website/public/demo.gif`)
2. Tailwind output screenshot
3. Markdown / AI-optimized output screenshot
4. Figma plugin screenshot
5. GitHub Action PR comment screenshot
6. MCP server in Cursor screenshot

## Show HN

### Title

> Show HN: designlang — extract Tailwind, shadcn, Figma tokens from any website in one command

(Keep it plain. HN dislikes marketing.)

### First comment

> Maintainer here. Technical notes on v8:
>
> - Brand-color detection now weights interactive backgrounds (CTAs, `<button>`, `role="button"`) by 100×, saturation by 2×, and log(usage). Previous heuristic was usage-only, which made any neutral-heavy site pick a gray as "Primary".
> - A11y scoring filters decorative glyph spans via a new `hasText` boolean threaded from the Playwright crawler. The old count-everything path was dropping Linear to 25% WCAG.
> - Scoring bands recalibrated against 10 real sites. Ground-truth targets: Stripe 85+, Linear 70+, Apple 80+.
> - Output path still DTCG-compliant (v7). MCP server unchanged.
>
> Code: https://github.com/Manavarya09/design-extract

## Twitter / X thread

1. `designlang v8 is out. Paste any URL → get Tailwind config, shadcn theme, Figma Variables, CSS vars, and an MCP server for your AI agents. One command. Short video 👇`
2. `The big unlock: the extractor now picks real brand colors. Old version called Linear's #d0d6e0 gray the "primary". v8 correctly picks the purple CTA. Details on why this was hard at the end.`
3. `v8 also ships four new surfaces: VS Code extension, Raycast extension, Figma plugin, and a GitHub Action that posts a design-token diff on every PR.`
4. `GitHub link + npm badge`.

## Day-of checklist

- [ ] Publish npm v8.0.0 with the brand-color + a11y + score fixes.
- [ ] Publish VS Code extension to Marketplace.
- [ ] Publish Raycast extension to Raycast Store.
- [ ] Submit Figma plugin for Community review.
- [ ] Tag `v1` for GitHub Action, list on Marketplace.
- [ ] Submit Chrome Web Store listing.
- [ ] Post PR to modelcontextprotocol/servers.
- [ ] Post to Smithery.
- [ ] Schedule PH launch for Tuesday 12:01 AM PT.
- [ ] Post Show HN at 8am PT the same day.
- [ ] Post tweet at 9am PT with GIF.
- [ ] DM 10 design-engineer friends for the "seen this?" first-30-min boost.

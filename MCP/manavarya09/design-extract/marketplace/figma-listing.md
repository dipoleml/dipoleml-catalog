# Figma Community — designlang plugin listing

## Title

designlang — Import any website's design system

## Tagline (max 100 chars)

Paste a URL, get a Figma Variable collection — colors, typography, spacing — pulled live from any site.

## Description (max 1000 chars)

designlang reverse-engineers any website into a complete design system and imports it directly into Figma as a Variable collection.

Paste a URL or paste an exported `*-figma-variables.json` from the [designlang CLI](https://www.npmjs.com/package/designlang). The plugin creates a fresh VariableCollection (or updates an existing one), maps every primitive, semantic, and composite token, and supports multi-mode payloads (light/dark) automatically.

What you get:
• Colors with proper roles (primary, secondary, accent, background, foreground, neutrals)
• Typography variables (sans, mono, body size, heading scale)
• Spacing scale (with detected base unit)
• Radii (xs/sm/md/lg/xl/full)
• Shadows (kept as raw strings — Figma doesn't natively type box-shadow)

Free, MIT-licensed, no account. The whole system also runs as a CLI: `npx designlang <url>`.

## Tags (pick up to 12)

design-system, design-tokens, design-extractor, dtcg, figma-variables, color-palette, typography, tokens, brand, design-system-import, w3c, ai-coding-agents

## Cover-image brief

Layout: paper background (#f3f1ea), single orange accent (#ff4800).
Hero: "designlang" in Fraunces, 96px, with the `d` mark to the left.
Below: a 5-swatch palette strip showing primary / secondary / accent / fg / bg.
Right side: a tiny mock Figma Variable panel showing 6 imported variables.

## Screenshots (4)

1. Plugin UI on plugin run — "Paste URL or upload .json" state.
2. Mid-import — token list streaming in.
3. Figma side panel showing the imported VariableCollection with 24 colors expanded.
4. After import — a frame using the imported variables (button + card mock).

## Support email

[your email]

## Source code link

https://github.com/Manavarya09/design-extract/tree/main/figma-plugin

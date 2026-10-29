# Chrome Web Store listing checklist

## Required assets

- [ ] 128×128 icon (`icons/icon-128.png`)
- [ ] 48×48 icon (`icons/icon-48.png`)
- [ ] 16×16 icon (`icons/icon-16.png`)
- [ ] At least one 1280×800 or 640×400 screenshot of the popup on a real tab
- [ ] (Optional) 440×280 small promo tile
- [ ] (Optional) 920×680 or 1400×560 marquee promo tile

## Listing copy

### Short (132 chars)

> Extract design tokens, colors, typography, and shadcn/Tailwind themes from any website with one click.

### Detailed

> designlang reads a website the way a developer reads a stylesheet. Pin this popup to any tab, hit the button, and the active URL is handed off to the hosted designlang extractor — which returns colors, typography, spacing, shadows, radii, interaction states, accessibility score, and ready-to-use Tailwind / shadcn / Figma Variables / W3C Design Tokens outputs.
>
> There is also a "Copy CLI" button that drops `npx designlang <url>` into your clipboard for local use.
>
> • Works on every tab (activeTab permission only)
> • No analytics, no tracking, no background scripts
> • Open source — https://github.com/Manavarya09/design-extract

### Category

Developer Tools → Developer Tools

### Language

English

## Privacy section

- **Purpose:** Hands off the current tab URL to the designlang hosted extractor so the user can get design tokens.
- **Data collection:** None.
- **Privacy policy URL:** `https://raw.githubusercontent.com/Manavarya09/design-extract/main/chrome-extension/PRIVACY.md` (or a hosted page once added to the website).

## Publish

1. Zip `chrome-extension/` (no `node_modules`, no `.DS_Store`).
2. `chrome.google.com/webstore/devconsole` → *New item* → upload zip.
3. Fill listing using the copy above.
4. Submit for review (1–3 business days on first submission).

## Cross-store

- **Firefox (AMO):** Upload the same zip at `addons.mozilla.org/developers/addon/submit/upload-listing`. MV3 with `activeTab` only is accepted.
- **Edge:** Upload at `partner.microsoft.com/dashboard/microsoftedge/overview`. Same zip.

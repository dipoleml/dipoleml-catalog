# Interactive HTML Roadbook — spec

Build from `templates/roadbook.html` (a working open-stack skeleton). Only used
when the user asks for a preview / webpage / shareable roadbook; the text plan
stays the source of truth.

## Stack (open only — no proprietary map service)

- **Map**: Leaflet + OpenStreetMap tiles (or any openly-licensed tile source).
  Ship a **static SVG route fallback** so the page still reads with no network.
- **Fonts**: self-host under `assets/fonts/`, load by relative path with
  `font-display: swap`. 霞鹜文楷 Screen (LXGW WenKai Screen, SIL OFL) for body /
  narrative; 更纱黑体 Mono SC (Sarasa Mono SC, SIL OFL) for code, route numbers,
  mileage, altitude, budgets. Fall back to PingFang SC / Hiragino Sans GB for
  reading, and a real mono for digits. Never rely on an online font service.
- **Photos**: only licensed, attributable images (official tourism boards,
  Wikimedia Commons, …). Record photographer, source page, license, and whether
  cropped. Default: place them in `assets/` beside the page for offline use.
  Never scrape someone's travel-page images, never label a stock/AI image as a
  real on-location shot. No usable photo → keep a text section with the place name.

## Section order and visual system

The text/data source of truth remains:

目的地的一眼 → 旅程如何展开 → 分日视觉章节 → 当天可操作路书 → 交通住宿预算 →
行前注意与避雷 → 必备清单.

For the HTML presentation layer, use this compatible rhythm when it improves
scannability:

`hero` → `overview` → `highlights` → `timeline` → `details` → `tips` → `footer`.

Use an editorial, restrained design system rather than a tourism-ad poster:

```css
:root {
  --bg: #F6F7F9;
  --bg-alt: #EEF1F4;
  --surface: #FFFFFF;
  --text: #2A3540;
  --text-2: #5E6E7E;
  --text-3: #8E9BAA;
  --accent: #D0684A;
  --accent-hover: #B85A3E;
  --accent-soft: #F4E8E2;
  --blue: #4A6272;
  --blue-light: #6A8494;
  --blue-line: #B8C8D6;
  --border: #DDE0E4;
}
```

Use serif system fonts for prominent headings and sans-serif system stacks for
body copy; do not load fonts from an online service. Keep a max content width near
1160px, generous section spacing, 10–12px card corners, subtle borders, and
responsive grids. A fixed navigation may be used for long pages, but it must not
obscure content or keyboard focus. Chinese headings must not use forced uppercase
or negative letter spacing.

Inline SVG is encouraged for route diagrams, transport icons, and a small hero
illustration. Adapt the scene to the destination: mountains are suitable for a
mountain route, but coast, city, desert, forest, and historic-town trips need
corresponding visual vocabulary. Keep all factual route, safety, and place
information in text or accessible labels; decoration must not carry the only
meaning.

Each chapter image carries 1–2 lines tied to that day's actual action (why start
here, how the next leg is en route, when to stop). The visual layer must never
hide or replace fact tags, sources, budget rows, map fallback, checklist controls,
or route trade-offs.

## Interactions (all must earn their place)

- Switch by day; clicking a photo/chapter jumps to that day and brings its content
  into view.
- Expand per-leg detail inline; **≥1 real choice** that changes options AND budget
  (e.g. 轻松/充实, 主线/支线) — not decoration.
- Checklist: tickable, shows done/total and remaining, persists locally
  (note clearly if storage is unavailable — ticking still works); "只看未完成" +
  clear-all.
- Respect `prefers-reduced-motion`; keyboard operable; text not blocked by images;
  readable with JS off and when printing.

## Visual constraints

- Background `#F6F7F9`; content in `#FFFFFF` rounded cards; accent from the
  destination's natural color. **Forbid** aged-paper tones (`#f5f1e9`, `#eae2d5`)
  and full-square brown 1px newspaper grids.
- Section headers use natural Chinese semantics — no "01 / Title + ALL-CAPS English
  subtitle" stacks. Body text explains routes and trade-offs; no process
  narration ("I didn't treat MBTI as a stereotype") and no internal notes
  ("样式重构"，"字体已修复").
- Chinese headings: `letter-spacing ≥ 0` (0.01–0.03em).
- Money / mileage / altitude use **tabular lining figures**:
  `font-variant-numeric: tabular-nums lining-nums`. Budget table keeps the
  `项目说明｜单价 × 数量｜金额` columns even on narrow screens; `¥` and the number sit
  in separate elements, number right-aligned. Totals and post-choice subtotals
  must update together.
- On the user's `备选预案 / 路况提醒` copy: user-facing language, not programmer
  jargon (no "触发 → 动作").

## Data schema (drives templates/roadbook.html)

`trip{title,subtitle,origin,destination,start,end,days,nights,party,currency,budget_total,
budget_includes_longhaul,contingency_pct,mode,route[],hero{src,alt,author,license,source}}` ·
`days[]{n,date,title,lodging_city,drive_km,drive_min,visit_min,meal_min,rest_min,awake_min,
checkpoints[],cost{},waypoints[{name,lat,lon}],photo{src,alt,author,license,source},facts[{text,tag,src}]}` ·
`budget[]{item,unit,qty,amount,category,optional?}` · `checklist[]` ·
`avoid[]{where,wrong,right}` · `sources[]{text,url,date}`. The checker ignores extras;
`optional:true` budget rows are excluded from reconciliation and shown only in 充实版.

## Verify before delivering

- photo ↔ place match; source & license traceable; images actually load
- clicking a photo reaches the right day; cross-day lodging change updates the next day
- budget matches its line items and the interactive choices
- alternates map to real road segments; checklist persists / filters / clears
- test desktop + 320 / 375 / 414 / 768 px: no page-level horizontal scroll; check console
- offline assets complete. State plainly any check you could not run (no browser →
  "视觉、交互、控制台尚未实测"); never summarise unrun checks as "已验证".

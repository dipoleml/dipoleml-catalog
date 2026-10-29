---
name: travel-itinerary-planner
description: "Use when the user wants a travel itinerary or roadbook."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [travel, itinerary, roadbook, trip-planning, budget, driving, html, openstreetmap]
    category: productivity
    requires_toolsets: [terminal]
    related_skills: [maps, claude-design]
---

# 行迹 · Travel Itinerary Planner

## Overview

Human usage guide: [`README.md`](./README.md). Repository metadata: [`meta.yaml`](./meta.yaml).

行迹 turns a one-line travel wish into an executable, **reconcilable roadbook**
(可对账路书). Two invariants separate it from a generic 攻略 dump:

1. **Every fact is tagged.** Any claim that could change the trip carries a
   status — `已核实 / 估算 / 待确认` — and verified facts carry a source + date.
2. **Every number adds up.** Day-level time and cost reconcile with the trip
   totals; the check is arithmetic, run by `scripts/itinerary_check.py`, not a vibe.

Output is text first (in chat), then — when the user wants a preview or to share —
an interactive, phone-readable HTML roadbook on an **open stack** (Leaflet +
OpenStreetMap tiles, self-hosted open-source fonts, licensed photos). No
proprietary map service is used anywhere in the pipeline.

## When to Use

- "帮我规划一趟…", 路书, 攻略, 行程, itinerary, trip plan, travel plan
- Self-drive route (自驾), holiday loop, multi-city route
- "这个行程合理吗 / 预算够不够 / 时间排得开吗"
- Don't use for: a single geocode / POI / route lookup (→ `maps` skill); a pure
  visual mockup with no trip content (→ `claude-design`).

## The spine — plan-intensity is the first decision

Choose the **plan-intensity mode** before writing any day; it changes what each
day shows. It is independent of any personality lens.

| Mode | Trigger | Each day shows |
|------|---------|----------------|
| 详尽 detailed | default, or "帮我排好" | time blocks, booking order, alternates |
| 锚点 anchored | "随性一点", "不想做计划" | must-hit anchors + ≤2 optional + free time |
| 通用 general | intensity unknown | 2–3 core stops/day, rest + slack built in |

Anchored mode hides *ordering*, never *consequence*: still surface cross-city
transport, tonight's lodging, booking windows, the budget cap and the last safe
pull-over. Never degrade to "灵活调整" empty talk.

## Step 1 — Intake, ask only what moves the route

Extract: origin · destination · dates/season · days + nights · party size &
relations · budget + currency (does it include the long-haul leg?) · transport ·
number of drivers · lodging/food/accessibility constraints · stated preferences
(pace, interests, must-see).

Ask **at most 3 short questions per turn**, and only for gaps that change route
or budget (usually destination, dates, budget). Once enough is known, produce a
plan — do not insert confirmation steps. On "直接安排", list assumptions and draft.
Full intake rules and the optional preference lens: `references/intake-and-adaptation.md`.
*Done when:* origin, destination-or-3-candidates, dates/days, party and budget
are each either given or explicitly assumed.

## Step 2 — Verify before you plan

Use live tools — `maps` (geocode, route, distance), `web_search` (opening hours,
closures, tickets, visa/entry, road status) — and attach a source + query date to
anything that affects the trip. Tag each fact `已核实` (with source + date) /
`估算` (with basis) / `待确认` (unknown, with an official link). Never invent
departures, room availability or prices, ratings, or minute-precise drive times.
*Done when:* every day-critical fact carries a tag, and every verified fact a source.

## Step 3 — Compose the itinerary

Order by geography, not by wishlist: transition legs first, then chain same-area
stops within each day. Count waiting, transfers, queues, meals and rest into
feasibility. Size the first/last day to real arrival/departure; unknown → half day.
Self-drive adds a per-day road chain of ≥3 checkpoints plus a driver execution card
— see `references/self-drive.md`.
*Done when:* no pointless backtracking, and every day's travel time fits inside the day.

## Step 4 — Reconcile the budget

Budget columns are fixed: `项目说明｜单价 × 数量｜金额`. Cover round-trip long-haul,
inter-city, local transport, lodging (rooms × nights), food, tickets, and applicable
visas/insurance/data; keep shopping separate. State whether long-haul is included,
give trip total **and** per-person, add a 10–15% contingency with its base, and
check the total against the user's cap — if over, name the gap and what to cut.
Full 口径: `references/budget-and-facts.md`.
*Done when:* `scripts/itinerary_check.py` reports all sums reconciled.

## Step 5 — Deliver

Default: structured text in the user's language (default 简体中文), sections in the
order given in `references/budget-and-facts.md` §交付结构. Only when the user asks
for a preview / HTML / shareable roadbook, build the interactive page from
`templates/roadbook.html`; the spec, fonts, map, photos and interactions are in
`references/html-roadbook.md`. The HTML is an *additional* artifact — the text plan
must stand on its own.

When building HTML, apply the **refined landing visual layer** in
`references/html-roadbook.md`: editorial serif headings, a restrained blue-grey /
warm-neutral / sunset-orange token system, generous whitespace, responsive cards,
inline SVG illustrations, and a clear hero → overview → highlights → timeline →
details → practical information rhythm. This is presentation only: never remove,
flatten, or paraphrase away fact tags, sources, route trade-offs, budget rows,
checklist behavior, or map/photo attribution. Prefer a modern cool-grey white
background over aged-paper tones, and adapt the illustration to the destination
rather than always drawing mountains.
*Done when:* the HTML is visually coherent and every required roadbook data,
interaction, attribution, and fallback remains present.

## Step 6 — Self-check

Run `python3 scripts/itinerary_check.py <data.json>` (schema in the template's
`roadbook-data.example.json`). Confirm: day/night counts match · travel times fit ·
sums reconcile · no closure/season collision · arrival/departure days feasible ·
every tag consistent with its source. Then name **two** highest-value optional edits.
*Done when:* the checker passes and the two suggestions are stated.

## Common Pitfalls

1. **Un-tagged facts.** Presenting an estimate as verified is the exact failure this
   skill exists to prevent. The tag feels obvious and gets skipped — don't skip it.
2. **Gimmick-first days.** A preference lens never overrides a stated preference;
   never infer "I 人 = 不爱做计划" — plan-intensity is its own axis.
3. **Pretty page, hollow plan.** Photos and animation never stand in for transport,
   bookings or budget. Build the plan first, then let images explain it.
4. **Budget that only moves the total.** When lodging/route options change, re-add the
   line items; never edit only the grand total.
5. **Fabricated specifics** — room availability, ratings, minute-level drive times,
   photo geolocation. Mark unknown as `待确认` with a check link.
6. **Proprietary map dependency.** The stack is Leaflet + OSM; do not swap in a
   closed map service or an unlicensed tile source.

## Verification Checklist

- [ ] Plan-intensity mode chosen and honored in every day
- [ ] Facts tagged 已核实/估算/待确认; verified ones cite source + date
- [ ] `itinerary_check.py` passes (counts, times, sums)
- [ ] Budget uses the fixed 3 columns with total + per-person + contingency, checked vs cap
- [ ] Self-drive: per-day road chain, ≥3 checkpoints, driver execution card
- [ ] HTML (if built): open stack only, licensed fonts, attributed photos, offline assets present
- [ ] HTML visual layer: responsive editorial hierarchy, destination-appropriate inline SVG, no aged-paper styling, no external dependency introduced
- [ ] HTML semantic integrity: hero/overview/highlights/timeline/details/tips rhythm supports the roadbook without hiding facts, sources, budget, map, or checklist
- [ ] Two optional edits offered to the user

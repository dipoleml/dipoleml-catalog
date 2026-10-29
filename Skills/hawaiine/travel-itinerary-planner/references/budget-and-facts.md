# Budget 口径 & Fact Ledger

## Fact tags (every trip-changing claim)

- `已核实` — must carry **source + query date**. Prefer the operator / government /
  venue's official channel over aggregators.
- `估算` — must state the basis (e.g. "按 2025-10 油价与 12km/L").
- `待确认` — unknown; give the official link/registry where the user can check.

Separate **seasonal climate** from a **near-term forecast**; never present
climatology as a specific day's weather. For road status / park entry / permit
quotas / tolls / opening hours / room rates, treat historical notices as risk
signals only, never as a future guarantee.

### Never invent

Departures, flight/train numbers, room availability or ratings, exact-minute
drive times, photo geolocation. If you cannot verify it, tag `待确认`.

### Entry / documents (overseas & cross-border)

Ask only for the document's issuing country/region and type, and any existing
visa. **Never** ask for document numbers or photos. Do not assume the user holds
any particular passport. Until checked, entry is not guaranteed; policy conclusions
must carry an official source or stay `待确认`.

## Budget table

Fixed columns, every line: `项目说明｜单价 × 数量｜金额`.

Categories: 往返大交通 · 跨城交通 · 市内交通 · 住宿(房间数×晚数) · 餐饮 · 门票体验 ·
证件/保险/通信. Shopping and other optional spend listed separately.

- State whether the total **includes the round-trip long-haul**.
- Give **trip total AND per-person**; avoid mixing 每人每晚 with 每间每晚.
- FX: note rate source + date, or mark it a stated calculation assumption.
- Sum each category to a lower and upper bound; add a **10–15% contingency**
  with its base stated (don't double-count it into the line items).
- Check the total against the cap: if over, **name the gap and the cut**; never
  hide costs to make it "fit".
- When a lodging, route or option changes, **re-add the affected line items**;
  updating only the grand total is a bug.

## §交付结构 (default text deliverable order)

1. **旅行概览** — destination, dates/season, days, party, budget scope, mode
   (详尽/锚点/通用), known conditions + stated assumptions.
2. **规划思路** — city order, lodging bases, pace, and the lens adjustments applied.
3. **每日行程** — per day: title + lodging city; then 详尽 uses a
   `时段｜地点与体验｜移动/耗时｜费用｜预约或提醒` table, 锚点 shows necessary anchors
   + ≤2 optional + free time. Both keep food, walking intensity, travel time,
   cost, slack and alternates.
4. **交通与住宿** — arrival/departure, inter-city, airport/station transfer;
   lodging area or 2–3 hotel candidates with price basis.
5. **预算明细** — line items, trip total, per-person, contingency, inclusions/exclusions.
6. **预订与出发清单** — key bookings in order, documents, to-verify items.
7. **重要来源** — verification links + dates; unverified items clearly marked.

Length scales with day count; if the user asks only a slice, answer only that slice.
Finish with **two** highest-value optional edits (e.g. "再悠闲一点", "把人均压到 X").

## Self-check before delivering

- day count ↔ nights match (前置夜 and return day counted into the calendar span)
- travel times fit; drive segments still end in daylight after parking/fuel/queue
- no closure / seasonal collision; arrival & departure days are feasible
- per-day subtotals reconcile to the total; no missing, duplicated or mis-added line
- stated preferences honored; missing lens falls through to general mode cleanly
- every tag consistent with its cited source

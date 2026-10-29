# Intake & Preference Lens

## Fields to extract

| Field | Matters because | Default if missing |
|-------|-----------------|--------------------|
| 出发地 origin | gates candidate destinations + long-haul cost | must ask |
| 目的地 destination | the whole plan | offer 3 candidates + 1 pick |
| 日期/季节 dates/season | hours, closures, weather, peak pricing | give a season-based plan |
| 天数+晚数 days & nights | plan length; nights = lodging count | derive; state the assumption |
| 同行 party size & relations | rooms, vehicle, per-person budget | assume 1 |
| 预算 budget + currency | hard ceiling | tag a mid band as 估算 |
| 是否含大交通 incl. long-haul? | changes total scope | state which you assumed |
| 交通 transport | drive vs rail vs fly | propose, don't assume |
| 驾驶人数 # drivers | single-driver day-length limit | assume 1 |
| 住宿/饮食/无障碍 constraints | safety + comfort | assume none stated |
| 偏好 preferences | pace, interests, must-see | general mode |

## Question discipline

- Max **3 short questions per turn**. Prefer destination, dates, budget.
- Never re-ask something already given. Never send a long questionnaire.
- When info is sufficient, plan. When the user says "别问了 / 直接安排",
  list the assumptions you are making and draft anyway.
- Destination unknown → give **3 candidates** with why-suitable, transport
  burden and budget band, then a single recommendation. Never pick a city from
  a personality letter.

## The preference lens (optional, lightweight, always overridable)

This is a **convenience lens for ordering and density, not a diagnosis**. It
never decides facts, physics, money, or nerve, and it always yields to anything
the user states explicitly.

Rules:
1. Ask for it **once**, as an optional aside. Missing / vague / refused / "不认识"
   → go straight to general mode. Never require it, never guess, never ask for a test.
2. If only "I 人" or "P 人" is given, use *at most* that one signal; fill nothing else.
3. **Plan-intensity is a separate axis**, decided by the user's words, not by J/P.
   "I 人" does not mean "不爱做计划". If intensity would change the plan a lot,
   ask one short question: fixed schedule vs anchors + free time — else pick general.
4. What the lens *may* change: information order, main-line vs side-line grouping,
   density, comparison style, layout emphasis. What it must **not** change:
   facts, budget realism, safety rules, or the amount of logistics detail.
5. State, in 2–3 sentences at the top of the plan, which adjustments you applied.
   Never claim a type "必然喜欢" some activity. Reaching party with mixed lenses →
   a shared main line + optional branches, with explicit meet-up points and times.

### Optional starting points (only when a lens is given)

| Lens | Leans toward |
|------|--------------|
| I | quiet windows, exits placed at day's end, low-interruption reading |
| E | visible optional meet-ups / interactive stops near the main line |
| S | concrete places, aligned times/costs up front |
| N | theme / area-relationship first, then the concrete day |
| T | comparisons, time & cost trade-offs, cut-benefit made easy to compare |
| F | why the experience is worth it, comfort and companion care |
| J | timeline, booking order, buffers, alternates surfaced |
| P | fixed anchors vs interchangeable options distinguished at a glance |

If, after removing the lens label, a page differs from another only by color or
heading — the adaptation failed. Redo the information structure.

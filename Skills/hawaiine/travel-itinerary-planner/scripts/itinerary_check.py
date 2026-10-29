#!/usr/bin/env python3
"""itinerary_check.py - reconcile a 行迹 roadbook data file.

The two invariants of a reconcilable roadbook:
  1. every number adds up (day travel time fits; budget line = unit*qty; sum = total)
  2. counts match (days span the calendar; nights match lodging)

Usage:
  python3 itinerary_check.py data.json [--strict] [--json]

Exit 0 if no hard error (and, with --strict, no warning); else non-zero.
Schema example: templates/roadbook-data.example.json in the same skill.
"""
import argparse
import json
import sys
from datetime import date

EPS = 0.01


def _num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return 0.0


def check(data):
    errors, warns = [], []
    trip = data.get("trip", {})
    days = data.get("days", []) or []
    budget = data.get("budget", []) or []

    # --- calendar span -----------------------------------------------------
    n_days = trip.get("days")
    if n_days is not None and int(n_days) != len(days):
        errors.append(f"day count: trip.days={n_days} but {len(days)} day entries")
    if trip.get("start") and trip.get("end"):
        try:
            d = (date.fromisoformat(trip["end"]) - date.fromisoformat(trip["start"])).days + 1
            if n_days is not None and d != int(n_days):
                errors.append(f"calendar span {d} days (start..end) != trip.days={n_days}")
        except ValueError:
            warns.append("start/end not ISO dates; skipped span check")

    # --- nights vs lodging -------------------------------------------------
    nights_given = trip.get("nights")
    nights_lodged = sum(1 for d in days if d.get("lodging_city"))
    if nights_given is not None and nights_lodged and int(nights_given) != nights_lodged:
        warns.append(f"nights: trip.nights={nights_given} but {nights_lodged} days list a lodging city")

    # --- per-day time feasibility -----------------------------------------
    for d in days:
        n = d.get("n", "?")
        used = sum(_num(d.get(k)) for k in ("drive_min", "visit_min", "meal_min", "rest_min"))
        awake = _num(d.get("awake_min")) or 780.0
        if used > awake + EPS:
            errors.append(f"day {n}: packed {used:.0f} min > awake {awake:.0f} min")
        elif used > awake * 0.92:
            warns.append(f"day {n}: {used:.0f}/{awake:.0f} min - almost no slack")
        if _num(d.get("drive_min")) > 0:
            cps = [c for c in (d.get("checkpoints") or []) if str(c).strip()]
            if len(cps) < 3:
                warns.append(f"day {n}: drive day with {len(cps)} checkpoint(s), need >=3")

    # --- budget arithmetic -------------------------------------------------
    by_cat = {}
    for it in budget:
        up, q, amt = _num(it.get("unit")), _num(it.get("qty")), _num(it.get("amount"))
        if abs(up * q - amt) > EPS:
            errors.append(f"budget '{it.get('item','?')}': unit*qty={up*q:.2f} != amount={amt:.2f}")
        if not it.get("optional"):  # optional rows are not part of the required plan
            by_cat[it.get("category", "")] = by_cat.get(it.get("category", ""), 0.0) + amt
    total = round(sum(_num(it.get("amount")) for it in budget if not it.get("optional")), 2)
    optional = round(sum(_num(it.get("amount")) for it in budget if it.get("optional")), 2)
    party = int(trip.get("party") or 1) or 1
    pct = _num(trip.get("contingency_pct")) or 0.0
    contingency = round(total * pct / 100.0, 2)
    grand = round(total + contingency, 2)

    cap = trip.get("budget_total")
    if cap is not None:
        if grand > _num(cap) + EPS:
            warns.append(f"OVER CAP: total+contingency={grand:.0f} > budget_total={_num(cap):.0f} "
                         f"(gap {grand - _num(cap):.0f})")

    # --- day costs vs budget categories -----------------------------------
    day_cat = {}
    for d in days:
        for k, v in (d.get("cost") or {}).items():
            day_cat[k] = day_cat.get(k, 0.0) + _num(v)
    for cat, amt in day_cat.items():
        if cat in by_cat and abs(amt - by_cat[cat]) > EPS:
            warns.append(f"category '{cat}': day sums {amt:.0f} != budget {by_cat[cat]:.0f}")

    summary = {
        "title": trip.get("title", ""),
        "days": len(days),
        "nights": nights_lodged,
        "party": party,
        "currency": trip.get("currency", ""),
        "subtotal": total,
        "optional_addons": optional,
        f"contingency({pct:g}%)": contingency,
        "grand_total": grand,
        "per_person": round(grand / party, 2),
        "budget_total": _num(cap) if cap is not None else None,
        "reconciled": not errors,
    }
    return errors, warns, summary


def main():
    ap = argparse.ArgumentParser(description="Reconcile a 行迹 roadbook data file.")
    ap.add_argument("path", help="roadbook JSON (see templates/roadbook-data.example.json)")
    ap.add_argument("--strict", action="store_true", help="treat warnings as failure")
    ap.add_argument("--json", action="store_true", dest="as_json", help="print machine-readable report")
    a = ap.parse_args()

    with open(a.path, encoding="utf-8") as f:
        data = json.load(f)
    errors, warns, summary = check(data)

    if a.as_json:
        print(json.dumps({"summary": summary, "errors": errors, "warnings": warns}, ensure_ascii=False, indent=2))
    else:
        print(f"行迹 check - {summary['title'] or a.path}")
        print(f"  {summary['days']}d / {summary['nights']}n, party {summary['party']}, "
              f"{summary['currency']} grand {summary['grand_total']} "
              f"(pp {summary['per_person']})")
        for e in errors:
            print(f"  ERROR  {e}")
        for w in warns:
            print(f"  WARN   {w}")
        print("  RESULT " + ("RECONCILED" if not errors else "HAS ERRORS"))

    failed = bool(errors) or (a.strict and bool(warns))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()

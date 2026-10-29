# coding: utf-8
"""Compare Flights runs by component in one table, each value next to its delta against the baseline arm.

Each argument is ``label=glob``; the first arm is the baseline. S1A profiler records and jev-ultrafast
``state.json`` files both work. Per arm the run with the median total represents it, so its components add up.
"""

from __future__ import annotations

import argparse
import glob
import json
import statistics
from pathlib import Path

PAGE_KEYS = ("probe", "activate", "value_wait")
SHORT = {"decision": "model", "page": "page", "browser": "browser", "other": "other"}
SEGMENTS = (
    ("decision", "waiting on the model"),
    ("page", "waiting on the page"),
    ("browser", "browser actions"),
    ("other", "other"),
)
THEMES = {
    "light": {
        "surface": "#fcfcfb",
        "ink": "#0b0b0b",
        "ink2": "#52514e",
        "grid": "#e6e5e1",
        "series": ("#2a78d6", "#eb6834", "#1baf7a", "#eda100"),
    },
    "dark": {
        "surface": "#1a1a19",
        "ink": "#ffffff",
        "ink2": "#c3c2b7",
        "grid": "#383835",
        "series": ("#3987e5", "#d95926", "#199e70", "#c98500"),
    },
}
COLUMNS = (
    ("total", "total s"),
    ("decision", "waiting on the model s"),
    ("page", "waiting on the page s"),
    ("browser", "browser actions s"),
    ("other", "other s"),
)


def load(arm: str) -> tuple[str, list[dict]]:
    label, _, pattern = arm.rpartition("=")
    files = sorted(glob.glob(pattern)) if any(c in pattern for c in "*?[") else [pattern]
    if not files:
        raise SystemExit(f"no files match {pattern}")
    return label or Path(files[0]).stem, [json.loads(Path(f).read_text()) for f in files]


def components(d: dict) -> dict:
    if "decision_requests" in d:
        p = d["phases"]
        decision_ms = p.get("decision", p.get("jev", 0))  # the Flights records under docs/results name the phase jev
        parts = {"decision": decision_ms, "page": sum(p.get(k, 0) for k in PAGE_KEYS), "browser": p["tool"]}
        parts["other"] = max(0, d["elapsed_ms"] - sum(parts.values()))
        return {
            "total": d["elapsed_ms"],
            "decisions": d["decision_requests"],
            "ms": d["decision_median_ms"],
            "verified": bool(d["verified"]),
            **parts,
        }
    latencies = [x["latency_ms"] for x in d["decisions"] if x.get("latency_ms")]
    decision = sum(latencies)
    return {
        "total": d["elapsed_ms"],
        "decisions": len(d["decisions"]),
        "ms": int(statistics.median(latencies)) if latencies else 0,
        "verified": d.get("status") == "done",
        "decision": decision,
        "page": None,
        "browser": None,
        "other": d["elapsed_ms"] - decision,
    }


def median_run(rows: list[dict]) -> dict:
    ordered = sorted(rows, key=lambda r: r["total"])
    return ordered[len(ordered) // 2]


def cell(value: int | None, base: int | None, is_base: bool) -> str:
    if value is None:
        return "n/a"
    text = f"{value / 1000:.1f}"
    if is_base or base is None:
        return text
    return f"{text} ({(value - base) / 1000:+.1f})"


def svg(arms: list[tuple[str, list[dict]]], theme: dict) -> str:
    """Stacked horizontal bars, one per arm's median run; the numbers sit in a text column to the right."""
    reps = [(label, rows, median_run(rows)) for label, rows in arms]
    counts = {len(rows) for _, rows in arms}
    per_arm = f"Median run of {counts.pop()} per arm." if len(counts) == 1 else "Median run per arm."
    left, bar_w, col_w, row_h, bar_h, top = 24, 430, 300, 40, 16, 74
    label_w = 290
    width = left + label_w + bar_w + 16 + col_w + 24
    height = top + row_h * len(reps) + 44
    scale = bar_w / max(r["total"] for _, _, r in reps)
    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" '
        f'font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif" font-size="12">',
        f'<rect width="{width}" height="{height}" fill="{theme["surface"]}" rx="8"/>',
        f'<text x="{left}" y="26" font-size="15" font-weight="600" fill="{theme["ink"]}">Google Flights, Zurich to London: where each arm\'s seconds go</text>',
        f'<text x="{left}" y="44" fill="{theme["ink2"]}">{per_arm} Total is first decision request to final answer.</text>',
    ]
    x = left
    for (key, name), color in zip(SEGMENTS, theme["series"]):
        out.append(f'<rect x="{x}" y="54" width="12" height="12" rx="3" fill="{color}"/>')
        out.append(f'<text x="{x + 17}" y="64" fill="{theme["ink2"]}">{name}</text>')
        x += 17 + 7 * len(name) + 18
    x0 = left + label_w
    step = 10 if max(r["total"] for _, _, r in reps) > 20000 else 5
    for tick in range(0, int(max(r["total"] for _, _, r in reps) / 1000) + step, step):
        tx = x0 + tick * 1000 * scale
        if tx > x0 + bar_w:
            break
        out.append(
            f'<line x1="{tx:.1f}" y1="{top - 8}" x2="{tx:.1f}" y2="{top + row_h * len(reps) - 8}" stroke="{theme["grid"]}" stroke-width="1"/>'
        )
        out.append(
            f'<text x="{tx:.1f}" y="{top + row_h * len(reps) + 8}" text-anchor="middle" fill="{theme["ink2"]}" font-size="11">{tick} s</text>'
        )
    for i, (label, rows, rep) in enumerate(reps):
        y = top + i * row_h
        verified = sum(r["verified"] for r in rows)
        out.append(f'<text x="{left}" y="{y + 12}" fill="{theme["ink"]}" font-weight="600">{label}</text>')
        out.append(
            f'<text x="{left}" y="{y + 26}" fill="{theme["ink2"]}" font-size="11">{verified} of {len(rows)} verified</text>'
        )
        x = x0
        parts = []
        for (key, name), color in zip(SEGMENTS, theme["series"]):
            value = rep[key]
            if value is None:
                continue
            w = max(0.0, value * scale - 2)
            if w > 0:
                out.append(f'<rect x="{x:.1f}" y="{y + 2}" width="{w:.1f}" height="{bar_h}" rx="3" fill="{color}"/>')
            x += value * scale
            parts.append(f"{SHORT[key]} {value / 1000:.1f}")
        out.append(
            f'<text x="{x0 + bar_w + 16}" y="{y + 12}" fill="{theme["ink"]}" font-weight="600">{rep["total"] / 1000:.1f} s</text>'
        )
        out.append(
            f'<text x="{x0 + bar_w + 16}" y="{y + 26}" fill="{theme["ink2"]}" font-size="11">{" · ".join(parts)}</text>'
        )
    out.append("</svg>")
    return "\n".join(out)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("arms", nargs="+", help="label=glob; the first arm is the baseline")
    parser.add_argument("--svg", help="write the stacked-bar chart here, plus a -dark sibling for dark surfaces")
    args = parser.parse_args()
    arms = [(label, [components(r) for r in runs]) for label, runs in map(load, args.arms)]
    base = median_run(arms[0][1])

    print("| arm | runs | " + " | ".join(name for _, name in COLUMNS) + " | decisions |")
    print("|---|---|" + "---|" * (len(COLUMNS) + 1))
    for index, (label, rows) in enumerate(arms):
        rep = median_run(rows)
        totals = [r["total"] / 1000 for r in rows]
        runs = f"{sum(r['verified'] for r in rows)} of {len(rows)} verified, {min(totals):.1f} to {max(totals):.1f} s"
        values = " | ".join(cell(rep[key], base[key], index == 0) for key, _ in COLUMNS)
        print(f"| {label} | {runs} | {values} | {rep['decisions']} × {rep['ms']} ms |")
    print()
    print(
        "Each arm is its median run, so the components add up to the total. Deltas in parentheses are against the first arm. "
        "`total`: seconds from the first decision request to the final answer. `waiting on the model`: time blocked on the decision request. "
        "`waiting on the page`: time the policy waited for the page after an action (DOM quiet, autocomplete, tab activation, typed values). "
        "`browser actions`: clicks and fills executing in the browser. `other`: everything else. "
        "`decisions`: requests to the endpoint in the median run × median latency."
    )

    if args.svg:
        Path(args.svg).write_text(svg(arms, THEMES["light"]))
        dark = Path(args.svg).with_name(Path(args.svg).stem + "-dark" + Path(args.svg).suffix)
        dark.write_text(svg(arms, THEMES["dark"]))
        print(f"\nchart: {args.svg} and {dark}")


if __name__ == "__main__":
    main()

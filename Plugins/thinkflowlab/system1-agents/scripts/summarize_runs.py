# coding: utf-8
"""Print one markdown row per run file: S1A profiler JSON (s1a run flights --profile-out) or jev-ultrafast state.json."""

from __future__ import annotations

import argparse
import json
import statistics
from pathlib import Path


def jj_row(label: str, d: dict) -> str:
    p = d["phases"]
    return (
        f"| {label} | {d['elapsed_ms'] / 1000:.1f} | {d['decision_requests']} | {d['decision_median_ms']} | "
        f"{p.get('decision', p.get('jev', 0)) / 1000:.1f} | {p['probe'] / 1000:.1f} | {p['tool'] / 1000:.1f} | {p['value_wait'] / 1000:.1f} | "
        f"{'yes' if d['verified'] else 'no'} |"
    )


def bu_row(label: str, d: dict) -> str:
    latencies = [x["latency_ms"] for x in d["decisions"] if x.get("latency_ms")]
    executed = len(d.get("history") or [])
    return (
        f"| {label} | {d['elapsed_ms'] / 1000:.1f} | {len(d['decisions'])} ({len(d['decisions']) - executed} not executed) | "
        f"{int(statistics.median(latencies)) if latencies else 0} | {sum(latencies) / 1000:.1f} | n/a | n/a | n/a | "
        f"{'yes' if d.get('status') == 'done' else d.get('status')} |"
    )


def print_steps(runs: list[tuple[str, dict]]) -> None:
    """One row per step: the action the model chose and, per run, the probe wait and the decision latency in ms."""
    print()
    print("| step | action | " + " | ".join(f"{label} probe / decision ms" for label, _ in runs) + " |")
    print("|---|---|" + "---|" * len(runs))
    depth = max(len(d["ticks"]) for _, d in runs)
    for i in range(depth):
        ticks = [d["ticks"][i] if i < len(d["ticks"]) else None for _, d in runs]
        first = next((t for t in ticks if t), {})
        name = str(first.get("target") or first.get("operation") or "")[:30]
        cells = [f"{t.get('probe_ms', 0)} / {t.get('decision_ms', t.get('jev_ms', 0))}" if t else "-" for t in ticks]
        print(f"| {i + 1} | {name} | " + " | ".join(cells) + " |")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="+", help="label=path pairs, or bare paths")
    parser.add_argument(
        "--steps", action="store_true", help="also print the per-step probe and decision waits of S1A runs"
    )
    args = parser.parse_args()
    loaded: list[tuple[str, dict]] = []
    print("| run | window s | decisions | median ms | decision s | probe s | tool s | value wait s | verified |")
    print("|---|---|---|---|---|---|---|---|---|")
    for item in args.files:
        label, _, path = item.rpartition("=")
        path = path or item
        label = label or (Path(path).parent.name if Path(path).stem == "state" else Path(path).stem)
        d = json.loads(Path(path).read_text())
        loaded.append((label, d))
        print(jj_row(label, d) if "decision_requests" in d else bu_row(label, d))
    if args.steps:
        print_steps([(label, d) for label, d in loaded if "decision_requests" in d])


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Heuristic poison-family analysis for activation-scanner benchmark data."""

from __future__ import annotations

import argparse
import re
from collections import Counter, defaultdict
from pathlib import Path

try:
    from .datasets import DEFAULT_DATA_DIR, Example, load_hand_pool, load_style
    from .family_labels import FAMILY_RULES, families_for
    from .report_writer import DEFAULT_OUTPUT_DIR, utc_timestamp
except ImportError:
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from research.benchmarks.datasets import DEFAULT_DATA_DIR, Example, load_hand_pool, load_style  # type: ignore
    from research.benchmarks.family_labels import FAMILY_RULES, families_for  # type: ignore
    from research.benchmarks.report_writer import DEFAULT_OUTPUT_DIR, utc_timestamp  # type: ignore


def load_examples(pool: str, data_dir: Path) -> list[Example]:
    if pool == "mcptox":
        return load_style("mcptox", data_dir)
    if pool == "hand-core":
        return load_hand_pool("core", data_dir)
    if pool == "hand-all":
        return load_hand_pool("all", data_dir)
    raise ValueError(f"Unknown pool {pool!r}")


def summarize(examples: list[Example]) -> dict:
    family_counts: dict[str, Counter[str]] = defaultdict(Counter)
    family_by_style: dict[str, Counter[str]] = defaultdict(Counter)
    examples_by_family: dict[str, list[Example]] = defaultdict(list)

    for example in examples:
        label_name = "poisoned" if example.label == 1 else "clean" if example.label == 0 else "other"
        for family in families_for(example.text):
            family_counts[label_name][family] += 1
            family_by_style[f"{example.style}:{label_name}"][family] += 1
            examples_by_family[family].append(example)

    return {
        "family_counts": {label: dict(counter) for label, counter in sorted(family_counts.items())},
        "family_by_style": {label: dict(counter) for label, counter in sorted(family_by_style.items())},
        "examples_by_family": examples_by_family,
    }


def markdown_report(pool: str, examples: list[Example], summary: dict, max_examples: int) -> str:
    lines = [
        f"# Failure Family Analysis - {pool}",
        "",
        f"- Pool: `{pool}`",
        f"- Examples: `{len(examples)}`",
        "",
        "## Family Counts",
        "",
        "| label | family | count |",
        "| --- | --- | ---: |",
    ]
    for label, counter in summary["family_counts"].items():
        for family, count in sorted(counter.items(), key=lambda row: (-row[1], row[0])):
            lines.append(f"| {label} | {family} | {count} |")

    lines.extend(["", "## By Style", "", "| style:label | family | count |", "| --- | --- | ---: |"])
    for style_label, counter in summary["family_by_style"].items():
        for family, count in sorted(counter.items(), key=lambda row: (-row[1], row[0])):
            lines.append(f"| {style_label} | {family} | {count} |")

    lines.extend(["", "## Example Buckets", ""])
    examples_by_family: dict[str, list[Example]] = summary["examples_by_family"]
    for family in sorted(examples_by_family):
        lines.append(f"### {family}")
        for example in examples_by_family[family][:max_examples]:
            label_name = "poisoned" if example.label == 1 else "clean" if example.label == 0 else "other"
            snippet = re.sub(r"\s+", " ", example.text).strip()
            lines.append(f"- `{example.style}` `{label_name}` `{example.source}:{example.index}` - {snippet}")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pool", choices=("mcptox", "hand-core", "hand-all"), default="hand-core")
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--max-examples", type=int, default=6)
    parser.add_argument("--no-write", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    examples = load_examples(args.pool, args.data_dir)
    summary = summarize(examples)
    report = markdown_report(args.pool, examples, summary, args.max_examples)
    print(report)

    if not args.no_write:
        args.output_dir.mkdir(parents=True, exist_ok=True)
        path = args.output_dir / f"{utc_timestamp()}-failure-family-{args.pool}.md"
        path.write_text(report)
        print(f"Wrote: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

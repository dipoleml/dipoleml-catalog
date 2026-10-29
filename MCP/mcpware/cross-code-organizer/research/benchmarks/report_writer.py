"""Report writing helpers for benchmark runs."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np


DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parents[1] / "_results" / "activation_scanner_benchmark"


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def json_default(value: Any) -> Any:
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, Path):
        return str(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def write_json_report(report: dict, output_dir: Path | None = None) -> Path:
    output_dir = output_dir or DEFAULT_OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"{report['run_id']}.json"
    with path.open("w") as handle:
        json.dump(report, handle, indent=2, sort_keys=True, default=json_default)
        handle.write("\n")
    return path


def write_markdown_report(report: dict, output_dir: Path | None = None) -> Path:
    output_dir = output_dir or DEFAULT_OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"{report['run_id']}.md"
    lines = [
        f"# Activation Scanner Benchmark - {report['run_id']}",
        "",
        f"- Created: `{report['created_at']}`",
        f"- Suite: `{report['config']['suite']}`",
        f"- Model: `{report['config']['model']}`",
        f"- Feature kind: `{report.get('feature_kind', 'n/a')}`",
        f"- Layer mode: `{report['config'].get('layer_mode', 'n/a')}`",
        f"- Selector: `{report['config'].get('selector', 'n/a')}`",
        f"- Top-k max: `{report['config'].get('top_k_max', 'n/a')}`",
        f"- Dedupe: `{report['config']['dedupe']}`",
        f"- Max samples: `{report['config'].get('max_samples')}`",
        "",
        "## Dataset Summary",
        "",
    ]

    for name, summary in report.get("datasets", {}).items():
        labels = summary.get("labels", {})
        lines.append(
            f"- `{name}`: n={summary.get('n', 0)}, "
            f"clean={labels.get('clean', 0)}, poisoned={labels.get('poisoned', 0)}, "
            f"removed_duplicates={summary.get('removed_duplicates', 0)}"
        )

    lines.extend(["", "## Results", ""])
    rows = report.get("results", [])
    if rows:
        headers = ["block", "method", "layer", "n_train", "n_test", "accuracy", "precision", "recall", "f1"]
        lines.append("| " + " | ".join(headers) + " |")
        lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
        for row in rows:
            lines.append(
                "| "
                + " | ".join(
                    [
                        str(row.get("block", "")),
                        str(row.get("method", "")),
                        str(row.get("layer", "")),
                        str(row.get("n_train", "")),
                        str(row.get("n_test", "")),
                        f"{row.get('accuracy', 0):.4f}",
                        f"{row.get('precision', 0):.4f}",
                        f"{row.get('recall', 0):.4f}",
                        f"{row.get('f1', 0):.4f}",
                    ]
                )
                + " |"
            )
    else:
        lines.append("_No result rows._")

    if report.get("notes"):
        lines.extend(["", "## Notes", ""])
        for note in report["notes"]:
            lines.append(f"- {note}")

    lines.append("")
    path.write_text("\n".join(lines))
    return path


def print_result_table(rows: list[dict]) -> None:
    if not rows:
        print("No result rows.")
        return
    print(f"{'block':30} {'method':18} {'layer':>7} {'n':>6} {'acc':>7} {'prec':>7} {'rec':>7} {'F1':>7}")
    print("-" * 96)
    for row in rows:
        print(
            f"{row.get('block', '')[:30]:30} "
            f"{row.get('method', '')[:18]:18} "
            f"{str(row.get('layer', '-')):>7} "
            f"{row.get('n_test', 0):6d} "
            f"{row.get('accuracy', 0):7.1%} "
            f"{row.get('precision', 0):7.1%} "
            f"{row.get('recall', 0):7.1%} "
            f"{row.get('f1', 0):7.1%}"
        )

#!/usr/bin/env python3
"""Calibrate warn/block thresholds for a cached activation-scanner artifact."""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable

import numpy as np

try:
    from .activation_scanner_core import (
        DECISION_POLICY_NAME,
        choose_runtime_decision,
        extract_runtime_matrix_for_texts,
        load_artifact,
        positive_probabilities,
        runtime_args,
    )
    from .benchmarks.datasets import Example, load_curated_file, load_routeguard_external_file, sample_balanced, summarize_examples
    from .scanner_static import static_scan, static_score
except ImportError:
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from research.activation_scanner_core import (  # type: ignore
        DECISION_POLICY_NAME,
        choose_runtime_decision,
        extract_runtime_matrix_for_texts,
        load_artifact,
        positive_probabilities,
        runtime_args,
    )
    from research.benchmarks.datasets import (  # type: ignore
        Example,
        load_curated_file,
        load_routeguard_external_file,
        sample_balanced,
        summarize_examples,
    )
    from research.scanner_static import static_scan, static_score  # type: ignore


DEFAULT_ARTIFACT = (
    Path(__file__).resolve().parent
    / "_results"
    / "activation_scanner_artifacts"
    / "qwen-pooled-curated-core-l13-15-v0"
)
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "_results" / "activation_scanner_calibration"
DEFAULT_THRESHOLDS = (0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.85, 0.90, 0.95)


@dataclass(frozen=True)
class EvalRow:
    eval_set: str
    example: Example
    expected_decision: str | None = None


def utc_slug() -> str:
    return datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")


def label_name(label: int) -> str:
    return "poisoned" if label == 1 else "clean"


def load_fixture_examples(path: Path) -> list[EvalRow]:
    rows = json.loads(path.read_text())
    out: list[EvalRow] = []
    for index, row in enumerate(rows):
        expected = str(row.get("expected_decision", "")).strip().lower()
        label = 1 if expected in {"block", "warn", "quarantine"} else 0
        example = Example(
            text=str(row["text"]),
            label=label,
            style="regression_fixture",
            source=path.name,
            index=index,
            record_id=str(row.get("id")) if row.get("id") else None,
            family="regression_fixture",
            source_type="regression_fixture",
            split_group=str(row.get("id")) if row.get("id") else None,
            notes=f"expected_decision={expected}",
        )
        out.append(EvalRow(eval_set="regression_fixtures", example=example, expected_decision=expected or None))
    return out


def load_eval_rows(args: argparse.Namespace) -> list[EvalRow]:
    rows: list[EvalRow] = []

    if "routeguard" in args.eval_sets:
        routeguard = load_routeguard_external_file(args.data_dir)
        routeguard = sample_balanced(routeguard, args.max_routeguard_samples, args.seed)
        rows.extend(EvalRow(eval_set="routeguard_external_v0", example=example) for example in routeguard)

    if "curated" in args.eval_sets:
        rows.extend(EvalRow(eval_set="family_curated_v0", example=example) for example in load_curated_file(args.data_dir))

    if "fixtures" in args.eval_sets:
        rows.extend(load_fixture_examples(args.fixtures))

    if not rows:
        raise SystemExit("No evaluation rows loaded.")
    return rows


def binary_metrics(y_true: Iterable[int], y_pred: Iterable[int]) -> dict[str, Any]:
    y_true = [int(value) for value in y_true]
    y_pred = [int(value) for value in y_pred]
    tp = sum(1 for actual, pred in zip(y_true, y_pred, strict=True) if actual == 1 and pred == 1)
    tn = sum(1 for actual, pred in zip(y_true, y_pred, strict=True) if actual == 0 and pred == 0)
    fp = sum(1 for actual, pred in zip(y_true, y_pred, strict=True) if actual == 0 and pred == 1)
    fn = sum(1 for actual, pred in zip(y_true, y_pred, strict=True) if actual == 1 and pred == 0)
    n = len(y_true)
    clean = tn + fp
    poisoned = tp + fn
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / poisoned if poisoned else 0.0
    specificity = tn / clean if clean else 0.0
    fpr = fp / clean if clean else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0
    accuracy = (tp + tn) / n if n else 0.0
    return {
        "n": n,
        "clean": clean,
        "poisoned": poisoned,
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "specificity": specificity,
        "false_positive_rate": fpr,
    }


def threshold_rows(
    *,
    scored_rows: list[dict[str, Any]],
    eval_set: str,
    score_key: str,
    thresholds: tuple[float, ...],
) -> list[dict[str, Any]]:
    subset = [row for row in scored_rows if row["eval_set"] == eval_set]
    y_true = [int(row["label"]) for row in subset]
    out = []
    for threshold in thresholds:
        y_pred = [1 if float(row[score_key]) >= threshold else 0 for row in subset]
        metrics = binary_metrics(y_true, y_pred)
        out.append(
            {
                "eval_set": eval_set,
                "score": score_key,
                "threshold": threshold,
                **metrics,
            }
        )
    return out


def decision_metrics(
    *,
    scored_rows: list[dict[str, Any]],
    eval_set: str,
    warn_threshold: float,
    block_threshold: float,
) -> dict[str, Any]:
    subset = [row for row in scored_rows if row["eval_set"] == eval_set]
    y_true = [int(row["label"]) for row in subset]
    warn_or_block = [1 if row["policy_decision"] in {"warn", "block", "quarantine"} else 0 for row in subset]
    block = [1 if row["policy_decision"] == "block" else 0 for row in subset]
    decisions = {"allow": 0, "warn": 0, "block": 0}
    for row in subset:
        decision = str(row["policy_decision"])
        decisions[decision] = decisions.get(decision, 0) + 1
    return {
        "eval_set": eval_set,
        "warn_threshold": warn_threshold,
        "block_threshold": block_threshold,
        "decision_policy": DECISION_POLICY_NAME,
        "decision_counts": decisions,
        "warn_or_block": binary_metrics(y_true, warn_or_block),
        "block": binary_metrics(y_true, block),
    }


def group_rows(
    *,
    scored_rows: list[dict[str, Any]],
    eval_set: str,
    group_key: str,
    warn_threshold: float,
    block_threshold: float,
) -> list[dict[str, Any]]:
    subset = [row for row in scored_rows if row["eval_set"] == eval_set]
    groups: dict[str, list[dict[str, Any]]] = {}
    for row in subset:
        groups.setdefault(str(row.get(group_key) or "unknown"), []).append(row)

    out = []
    for group, rows in sorted(groups.items()):
        clean = [row for row in rows if row["label"] == 0]
        poisoned = [row for row in rows if row["label"] == 1]
        out.append(
            {
                "eval_set": eval_set,
                "group_key": group_key,
                "group": group,
                "n": len(rows),
                "clean": len(clean),
                "poisoned": len(poisoned),
                "clean_warn_rate": decision_rate(clean, {"warn", "block", "quarantine"}),
                "clean_block_rate": decision_rate(clean, {"block"}),
                "poison_warn_recall": decision_rate(poisoned, {"warn", "block", "quarantine"}),
                "poison_block_recall": decision_rate(poisoned, {"block"}),
                "mean_activation_score": mean(row["activation_score"] for row in rows),
                "mean_static_score": mean(row["static_score"] for row in rows),
                "mean_risk_score": mean(row["risk_score"] for row in rows),
            }
        )
    return out


def rate(rows: list[dict[str, Any]], threshold: float) -> float | None:
    if not rows:
        return None
    return sum(1 for row in rows if float(row["risk_score"]) >= threshold) / len(rows)


def decision_rate(rows: list[dict[str, Any]], decisions: set[str]) -> float | None:
    if not rows:
        return None
    return sum(1 for row in rows if str(row.get("policy_decision")) in decisions) / len(rows)


def mean(values: Iterable[float]) -> float:
    values = [float(value) for value in values]
    return sum(values) / len(values) if values else 0.0


def top_errors(
    *,
    scored_rows: list[dict[str, Any]],
    eval_set: str,
    warn_threshold: float,
    block_threshold: float,
    limit: int,
) -> dict[str, list[dict[str, Any]]]:
    subset = [row for row in scored_rows if row["eval_set"] == eval_set]
    false_warn_or_block = [
        row for row in subset if row["label"] == 0 and row["policy_decision"] in {"warn", "block", "quarantine"}
    ]
    false_blocks = [row for row in subset if row["label"] == 0 and row["policy_decision"] == "block"]
    missed_poison = [row for row in subset if row["label"] == 1 and row["policy_decision"] == "allow"]
    weak_blocks = [
        row
        for row in subset
        if row["label"] == 1 and row["policy_decision"] == "warn"
    ]
    return {
        "false_warn_or_block": compact_examples(sorted(false_warn_or_block, key=lambda row: row["risk_score"], reverse=True), limit),
        "false_blocks": compact_examples(sorted(false_blocks, key=lambda row: row["risk_score"], reverse=True), limit),
        "missed_poison": compact_examples(sorted(missed_poison, key=lambda row: row["risk_score"]), limit),
        "warned_but_not_blocked_poison": compact_examples(sorted(weak_blocks, key=lambda row: row["risk_score"], reverse=True), limit),
    }


def compact_examples(rows: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    out = []
    for row in rows[:limit]:
        out.append(
            {
                "id": row.get("id"),
                "label": label_name(int(row["label"])),
                "style": row.get("style"),
                "family": row.get("family"),
                "source": row.get("source"),
                "activation_score": row["activation_score"],
                "static_score": row["static_score"],
                "risk_score": row["risk_score"],
                "policy_decision": row["policy_decision"],
                "policy_reasons": row["policy_reasons"],
                "static_findings": row["static_findings"],
                "text_preview": row["text"][:260].replace("\n", " "),
            }
        )
    return out


def write_markdown(report: dict[str, Any], path: Path) -> None:
    lines: list[str] = []
    artifact_id = report["artifact"]["artifact_id"]
    lines.extend(
        [
            f"# Threshold Calibration - {artifact_id}",
            "",
            f"- Created: `{report['created_at']}`",
            f"- Artifact: `{report['artifact']['path']}`",
            f"- Warn threshold under test: `{report['config']['warn_threshold']:.2f}`",
            f"- Block threshold under test: `{report['config']['block_threshold']:.2f}`",
            f"- Runtime decision policy: `{report['config']['decision_policy']}`",
            f"- Wall time: {report['runtime']['elapsed_seconds']:.1f}s",
            f"- Feature extraction: {report['runtime']['feature_elapsed_seconds']:.1f}s",
            "",
            "## Dataset Summary",
            "",
        ]
    )
    for name, summary in report["dataset_summary"].items():
        labels = summary["labels"]
        lines.append(f"- `{name}`: n={summary['n']}, clean={labels['clean']}, poisoned={labels['poisoned']}")

    lines.extend(["", "## Product Decision Metrics", ""])
    lines.append(
        "| Eval set | Decision level | Accuracy | Precision | Recall | F1 | Clean false-positive rate | TP | FP | FN | Decisions |"
    )
    lines.append("| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |")
    for row in report["decision_metrics"]:
        for key, label in (("warn_or_block", "warn_or_block"), ("block", "block")):
            metrics = row[key]
            lines.append(
                "| {eval_set} | {level} | {accuracy:.3f} | {precision:.3f} | {recall:.3f} | {f1:.3f} | {fpr:.3f} | {tp} | {fp} | {fn} | {decisions} |".format(
                    eval_set=row["eval_set"],
                    level=label,
                    accuracy=metrics["accuracy"],
                    precision=metrics["precision"],
                    recall=metrics["recall"],
                    f1=metrics["f1"],
                    fpr=metrics["false_positive_rate"],
                    tp=metrics["tp"],
                    fp=metrics["fp"],
                    fn=metrics["fn"],
                    decisions=", ".join(f"{k}={v}" for k, v in sorted(row["decision_counts"].items())),
                )
            )

    lines.extend(["", "## RouteGuard Risk-Score Threshold Sweep", ""])
    lines.append("| Threshold | Accuracy | Precision | Recall | F1 | Clean false-positive rate | TP | FP | FN |")
    lines.append("| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |")
    for row in report["threshold_sweep"]:
        if row["eval_set"] != "routeguard_external_v0" or row["score"] != "risk_score":
            continue
        lines.append(
            "| {threshold:.2f} | {accuracy:.3f} | {precision:.3f} | {recall:.3f} | {f1:.3f} | {fpr:.3f} | {tp} | {fp} | {fn} |".format(
                threshold=row["threshold"],
                accuracy=row["accuracy"],
                precision=row["precision"],
                recall=row["recall"],
                f1=row["f1"],
                fpr=row["false_positive_rate"],
                tp=row["tp"],
                fp=row["fp"],
                fn=row["fn"],
            )
        )

    lines.extend(["", "## RouteGuard Activation-Only Threshold Sweep", ""])
    lines.append("| Threshold | Accuracy | Precision | Recall | F1 | Clean false-positive rate | TP | FP | FN |")
    lines.append("| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |")
    for row in report["threshold_sweep"]:
        if row["eval_set"] != "routeguard_external_v0" or row["score"] != "activation_score":
            continue
        lines.append(
            "| {threshold:.2f} | {accuracy:.3f} | {precision:.3f} | {recall:.3f} | {f1:.3f} | {fpr:.3f} | {tp} | {fp} | {fn} |".format(
                threshold=row["threshold"],
                accuracy=row["accuracy"],
                precision=row["precision"],
                recall=row["recall"],
                f1=row["f1"],
                fpr=row["false_positive_rate"],
                tp=row["tp"],
                fp=row["fp"],
                fn=row["fn"],
            )
        )

    lines.extend(["", "## RouteGuard Style Breakdown At Current Thresholds", ""])
    lines.append("| Style | n | clean | poisoned | clean warn | clean block | poison warn | poison block | mean risk |")
    lines.append("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |")
    for row in report["group_metrics"]:
        if row["eval_set"] != "routeguard_external_v0" or row["group_key"] != "style":
            continue
        lines.append(
            "| {group} | {n} | {clean} | {poisoned} | {clean_warn} | {clean_block} | {poison_warn} | {poison_block} | {mean_risk:.3f} |".format(
                group=row["group"],
                n=row["n"],
                clean=row["clean"],
                poisoned=row["poisoned"],
                clean_warn=format_optional(row["clean_warn_rate"]),
                clean_block=format_optional(row["clean_block_rate"]),
                poison_warn=format_optional(row["poison_warn_recall"]),
                poison_block=format_optional(row["poison_block_recall"]),
                mean_risk=row["mean_risk_score"],
            )
        )

    lines.extend(["", "## Top RouteGuard Errors At Current Thresholds", ""])
    errors = report["top_errors"].get("routeguard_external_v0", {})
    for key, title in (
        ("false_warn_or_block", "Clean rows warned or blocked"),
        ("false_blocks", "Clean rows blocked"),
        ("missed_poison", "Poisoned rows allowed"),
        ("warned_but_not_blocked_poison", "Poisoned rows warned but not blocked"),
    ):
        lines.extend(["", f"### {title}", ""])
        rows = errors.get(key, [])
        if not rows:
            lines.append("None.")
            continue
        lines.append("| id | style | family | decision | activation | static | risk | static findings | preview |")
        lines.append("| --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |")
        for row in rows:
            findings = ", ".join(row["static_findings"]) or "-"
            preview = str(row["text_preview"]).replace("|", "\\|")
            lines.append(
                f"| `{row['id']}` | `{row['style']}` | `{row['family']}` | `{row['policy_decision']}` | {row['activation_score']:.3f} | {row['static_score']:.3f} | {row['risk_score']:.3f} | {findings} | {preview} |"
            )

    lines.extend(["", "## Notes", ""])
    lines.extend(report["notes"])
    path.write_text("\n".join(lines) + "\n")


def format_optional(value: float | None) -> str:
    return "-" if value is None else f"{value:.3f}"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifact", type=Path, default=DEFAULT_ARTIFACT)
    parser.add_argument("--data-dir", type=Path, default=Path(__file__).resolve().parent / "datasets")
    parser.add_argument("--fixtures", type=Path, default=Path(__file__).resolve().parent / "fixtures" / "activation_scanner_regression_cases.json")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--eval-sets", nargs="+", choices=("routeguard", "curated", "fixtures"), default=["routeguard", "curated", "fixtures"])
    parser.add_argument("--thresholds", type=float, nargs="+", default=list(DEFAULT_THRESHOLDS))
    parser.add_argument("--warn-threshold", type=float, default=0.30)
    parser.add_argument("--block-threshold", type=float, default=0.85)
    parser.add_argument("--max-routeguard-samples", type=int, default=None)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--batch-size", type=int, default=None)
    parser.add_argument("--max-length", type=int, default=None)
    parser.add_argument("--device", default=None)
    parser.add_argument("--dtype", choices=("auto", "float32", "bfloat16"), default=None)
    parser.add_argument("--local-files-only", action="store_true")
    parser.add_argument("--error-limit", type=int, default=8)
    parser.add_argument("--pretty", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    started = time.perf_counter()

    eval_rows = load_eval_rows(args)
    texts = [row.example.text for row in eval_rows]

    artifact_dir, metadata, weights = load_artifact(args.artifact)
    runtime_ns = runtime_args(
        batch_size=args.batch_size,
        max_length=args.max_length,
        device=args.device,
        dtype=args.dtype,
        local_files_only=args.local_files_only,
    )
    matrix, activation_details = extract_runtime_matrix_for_texts(texts=texts, metadata=metadata, args=runtime_ns)
    activation_scores = positive_probabilities(matrix, weights)

    scored_rows: list[dict[str, Any]] = []
    for idx, row in enumerate(eval_rows):
        findings = static_scan(row.example.text)
        static_risk = static_score(findings)
        activation_score = float(activation_scores[idx])
        risk = max(activation_score, static_risk)
        policy_decision, policy_reasons = choose_runtime_decision(
            activation_score=activation_score,
            static_risk_score=static_risk,
            risk_score=risk,
            static_findings=findings,
            warn_threshold=args.warn_threshold,
            block_threshold=args.block_threshold,
        )
        scored_rows.append(
            {
                "eval_set": row.eval_set,
                "id": row.example.record_id or f"{row.eval_set}:{row.example.index}",
                "label": int(row.example.label),
                "style": row.example.style,
                "family": row.example.family,
                "source": row.example.source,
                "source_type": row.example.source_type,
                "pair_id": row.example.pair_id,
                "split_group": row.example.split_group,
                "notes": row.example.notes,
                "expected_decision": row.expected_decision,
                "text": row.example.text,
                "activation_score": activation_score,
                "static_score": static_risk,
                "risk_score": risk,
                "policy_decision": policy_decision,
                "policy_reasons": policy_reasons,
                "static_findings": [str(finding["id"]) for finding in findings],
            }
        )

    eval_set_names = sorted({row["eval_set"] for row in scored_rows})
    thresholds = tuple(sorted({float(value) for value in args.thresholds}))
    threshold_sweep: list[dict[str, Any]] = []
    for eval_set in eval_set_names:
        threshold_sweep.extend(
            threshold_rows(scored_rows=scored_rows, eval_set=eval_set, score_key="activation_score", thresholds=thresholds)
        )
        threshold_sweep.extend(threshold_rows(scored_rows=scored_rows, eval_set=eval_set, score_key="risk_score", thresholds=thresholds))
        threshold_sweep.extend(threshold_rows(scored_rows=scored_rows, eval_set=eval_set, score_key="static_score", thresholds=thresholds))

    decision_rows = [
        decision_metrics(
            scored_rows=scored_rows,
            eval_set=eval_set,
            warn_threshold=args.warn_threshold,
            block_threshold=args.block_threshold,
        )
        for eval_set in eval_set_names
    ]

    group_metrics: list[dict[str, Any]] = []
    for eval_set in eval_set_names:
        for group_key in ("style", "family", "source_type"):
            group_metrics.extend(
                group_rows(
                    scored_rows=scored_rows,
                    eval_set=eval_set,
                    group_key=group_key,
                    warn_threshold=args.warn_threshold,
                    block_threshold=args.block_threshold,
                )
            )

    top_error_map = {
        eval_set: top_errors(
            scored_rows=scored_rows,
            eval_set=eval_set,
            warn_threshold=args.warn_threshold,
            block_threshold=args.block_threshold,
            limit=args.error_limit,
        )
        for eval_set in eval_set_names
    }

    report = {
        "created_at": utc_slug(),
        "artifact": {
            "path": str(artifact_dir),
            "artifact_id": metadata.get("artifact_id", artifact_dir.name),
            "model_id": metadata.get("model_id"),
            "sensor_model": metadata.get("sensor_model"),
            "feature_kind": metadata.get("feature_kind"),
            "layer_policy": metadata.get("layer_policy"),
        },
        "config": {
            "thresholds": list(thresholds),
            "warn_threshold": args.warn_threshold,
            "block_threshold": args.block_threshold,
            "decision_policy": DECISION_POLICY_NAME,
            "max_routeguard_samples": args.max_routeguard_samples,
            "seed": args.seed,
        },
        "dataset_summary": {
            eval_set: summarize_examples(row.example for row in eval_rows if row.eval_set == eval_set)
            for eval_set in eval_set_names
        },
        "runtime": {
            "elapsed_seconds": time.perf_counter() - started,
            "feature_elapsed_seconds": activation_details["feature_elapsed_seconds"],
            "activation_details": activation_details,
        },
        "threshold_sweep": threshold_sweep,
        "decision_metrics": decision_rows,
        "group_metrics": group_metrics,
        "top_errors": top_error_map,
        "notes": [
            "risk_score is max(activation_score, static_score), matching the current runtime scanner.",
            "activation_score rows isolate the probe behavior without static pattern help.",
            "warn_or_block treats runtime warn/block/quarantine decisions as a positive detection.",
            "block measures only runtime block decisions under the configured decision policy.",
            "Clean-only groups have no poisoned recall; poisoned-only groups have no clean false-positive rate.",
        ],
    }

    args.output_dir.mkdir(parents=True, exist_ok=True)
    slug = f"{report['created_at']}-qwen-pooled-l13-15-threshold-calibration"
    json_path = args.output_dir / f"{slug}.json"
    md_path = args.output_dir / f"{slug}.md"
    json_path.write_text(json.dumps(report, indent=2 if args.pretty else None, ensure_ascii=False))
    write_markdown(report, md_path)

    print(json.dumps({"json": str(json_path), "markdown": str(md_path), "runtime": report["runtime"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

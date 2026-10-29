#!/usr/bin/env python3
"""Materialize reviewed calibration decisions into release data manifests.

The output is not gold training data. It records which reviewed errors are
ready for regression pressure, which are quarantined, and which need clean twins
or fuller source text before a retrain.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


RESEARCH_DIR = Path(__file__).resolve().parent
DEFAULT_QUEUE = RESEARCH_DIR / "datasets" / "calibration_error_review_queue_qwen_pooled_policy_v3_warn030_2026-06-03.json"
DEFAULT_DECISIONS = (
    RESEARCH_DIR
    / "datasets"
    / "calibration_error_review_decisions_qwen_pooled_policy_v3_warn030_2026-06-03.json"
)
DEFAULT_OUTPUT = RESEARCH_DIR / "datasets" / "calibration_review_outputs_qwen_pooled_policy_v3_2026-06-03.json"
DEFAULT_SOURCE_DATASETS = (
    RESEARCH_DIR / "datasets" / "family_curated_v0.json",
    RESEARCH_DIR / "datasets" / "routeguard_external_v0.json",
)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def utc_now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def index_source_rows(paths: tuple[Path, ...]) -> dict[str, dict[str, Any]]:
    rows_by_id: dict[str, dict[str, Any]] = {}
    for path in paths:
        if not path.exists():
            continue
        rows = load_json(path)
        if not isinstance(rows, list):
            raise SystemExit(f"Source dataset must be a JSON array: {path}")
        for row in rows:
            if not isinstance(row, dict) or not row.get("id"):
                continue
            rows_by_id[str(row["id"])] = {**row, "_source_dataset_path": str(path)}
    return rows_by_id


def queue_by_id(queue: dict[str, Any]) -> dict[str, dict[str, Any]]:
    entries = queue.get("entries") or []
    if not isinstance(entries, list):
        raise SystemExit("Queue JSON must contain an entries array.")
    return {str(row.get("queue_id")): row for row in entries if isinstance(row, dict)}


def decision_category(decision: dict[str, Any]) -> str:
    review_decision = str(decision.get("review_decision") or "")
    output_action = str(decision.get("output_action") or "")
    if review_decision == "add_static_policy_regression_candidate":
        return "static_policy_regression_candidates"
    if review_decision == "keep_as_benign_activation_holdout":
        return "benign_activation_holdouts"
    if review_decision == "quarantine_until_hidden_carrier_reconstructed":
        return "quarantined_rows"
    if review_decision == "keep_as_regression_fixture_only":
        return "regression_fixture_only"
    if output_action in {
        "add_clean_twin_or_static_rule_before_hard_block_training",
        "already_curated_do_not_duplicate_add_policy_variant_or_static_rule",
    }:
        return "hard_positive_candidates"
    return "manual_review_required"


def materialized_row(
    *,
    decision: dict[str, Any],
    queue_entry: dict[str, Any] | None,
    source_rows: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    row_id = str(decision.get("row_id") or "")
    queue_row = (queue_entry or {}).get("row") or {}
    source_row = source_rows.get(row_id)
    text = None
    text_source = "missing"
    source_dataset_path = None
    if source_row and source_row.get("text"):
        text = source_row.get("text")
        text_source = "source_dataset_full_text"
        source_dataset_path = source_row.get("_source_dataset_path")
    elif queue_row.get("text_preview"):
        text = queue_row.get("text_preview")
        text_source = "queue_text_preview_only"

    return {
        "queue_id": decision.get("queue_id"),
        "row_id": row_id,
        "dataset": decision.get("dataset"),
        "category": decision_category(decision),
        "review_decision": decision.get("review_decision"),
        "output_action": decision.get("output_action"),
        "label_status": decision.get("label_status"),
        "curriculum_level": decision.get("curriculum_level"),
        "error_type": decision.get("error_type"),
        "priority": decision.get("priority"),
        "recommended_action": decision.get("recommended_action"),
        "label": queue_row.get("label") or (source_row or {}).get("label"),
        "family": queue_row.get("family") or (source_row or {}).get("family"),
        "style": queue_row.get("style") or (source_row or {}).get("style"),
        "source": queue_row.get("source") or (source_row or {}).get("source"),
        "source_dataset_path": source_dataset_path,
        "text_available": bool(text),
        "text_source": text_source,
        "text": text,
        "scores": decision.get("scores"),
        "reason": decision.get("reason"),
    }


def build_outputs(
    *,
    queue: dict[str, Any],
    decisions_file: dict[str, Any],
    source_rows: dict[str, dict[str, Any]],
    source_queue: str,
    source_decisions: str,
) -> dict[str, Any]:
    queue_entries = queue_by_id(queue)
    decisions = decisions_file.get("decisions") or []
    if not isinstance(decisions, list):
        raise SystemExit("Decisions JSON must contain a decisions array.")

    buckets: dict[str, list[dict[str, Any]]] = {
        "static_policy_regression_candidates": [],
        "benign_activation_holdouts": [],
        "hard_positive_candidates": [],
        "quarantined_rows": [],
        "regression_fixture_only": [],
        "manual_review_required": [],
    }
    for decision in decisions:
        if not isinstance(decision, dict):
            continue
        row = materialized_row(
            decision=decision,
            queue_entry=queue_entries.get(str(decision.get("queue_id"))),
            source_rows=source_rows,
        )
        buckets[row["category"]].append(row)

    category_counts = {key: len(value) for key, value in buckets.items()}
    text_sources = Counter(row["text_source"] for rows in buckets.values() for row in rows)
    labels = Counter(str(row.get("label")) for rows in buckets.values() for row in rows)
    return {
        "created_at": utc_now(),
        "source_queue": source_queue,
        "source_decisions": source_decisions,
        "artifact_id": decisions_file.get("artifact_id"),
        "decision_policy": decisions_file.get("decision_policy"),
        "purpose": (
            "Release data manifest for calibration-review outputs. This file separates "
            "policy regression candidates, holdouts, quarantine rows, and hard-positive "
            "candidates; it is not gold training data."
        ),
        "summary": {
            "total_rows": sum(category_counts.values()),
            "category_counts": category_counts,
            "text_sources": dict(sorted(text_sources.items())),
            "labels": dict(sorted(labels.items())),
        },
        "rules": [
            "Do not train directly on this manifest.",
            "Rows with text_source=queue_text_preview_only need full source text before training promotion.",
            "Quarantined rows stay out of gold training until the hidden carrier or package content is reconstructed.",
            "Clean false positives become policy regression pressure before hard-block rule changes.",
            "Hard-positive candidates need a clean twin or stronger static corroboration before changing block behavior.",
        ],
        **buckets,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queue", type=Path, default=DEFAULT_QUEUE)
    parser.add_argument("--decisions", type=Path, default=DEFAULT_DECISIONS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--source-dataset",
        type=Path,
        action="append",
        default=None,
        help="Dataset JSON array used to recover full text by row id. Repeatable.",
    )
    parser.add_argument("--pretty", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    source_paths = tuple(args.source_dataset) if args.source_dataset else DEFAULT_SOURCE_DATASETS
    source_rows = index_source_rows(source_paths)
    output = build_outputs(
        queue=load_json(args.queue),
        decisions_file=load_json(args.decisions),
        source_rows=source_rows,
        source_queue=str(args.queue),
        source_decisions=str(args.decisions),
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n")
    if args.pretty:
        print(json.dumps(output["summary"], indent=2, ensure_ascii=False, sort_keys=True))
        print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

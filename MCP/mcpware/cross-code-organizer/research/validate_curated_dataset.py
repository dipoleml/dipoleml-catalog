#!/usr/bin/env python3
"""Validate the activation-scanner curated family dataset."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


RESEARCH_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET = RESEARCH_DIR / "datasets" / "family_curated_v0.json"
DEFAULT_SCHEMA = RESEARCH_DIR / "schemas" / "activation_curated_dataset.schema.json"

VALID_LABELS = {"clean", "poisoned"}
VALID_FAMILIES = {
    "instruction_chaining",
    "secret_file_access",
    "credential_forwarding",
    "network_exfiltration",
    "hidden_persistence_logging",
    "live_system_access",
    "system_inventory",
    "tool_shadowing",
}
VALID_SOURCE_TYPES = {
    "synthetic_curated",
    "real_carrier_adapted",
    "public_dataset",
    "pentest_case",
    "real_incident",
    "regression_fixture",
}
VALID_CURRICULUM_LEVELS = {
    "L0_regression",
    "L1_clear_synthetic_pair",
    "L2_benign_lookalike",
    "L3_subtle_intent",
    "L4_real_carrier_adapted",
    "L5_external_holdout",
}
VALID_LABEL_CONFIDENCE = {"gold", "high", "medium", "low"}
VALID_REVIEW_STATUS = {"accepted", "needs_review", "holdout_only", "rejected"}
REQUIRED_FIELDS = {
    "id",
    "label",
    "family",
    "source_type",
    "source",
    "pair_id",
    "split_group",
    "text",
    "notes",
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def validate_jsonschema(rows: list[dict[str, Any]], schema_path: Path) -> str:
    try:
        import jsonschema
    except ImportError:
        return "skipped: jsonschema is not installed"

    schema = load_json(schema_path)
    jsonschema.validate(instance=rows, schema=schema)
    return "passed"


def validate_rows(rows: list[dict[str, Any]]) -> tuple[list[str], dict[str, Any]]:
    errors: list[str] = []
    warnings: list[str] = []
    ids: Counter[str] = Counter()
    labels: Counter[str] = Counter()
    families: dict[str, Counter[str]] = defaultdict(Counter)
    source_types: Counter[str] = Counter()
    curriculum_levels: Counter[str] = Counter()
    label_confidences: Counter[str] = Counter()
    review_statuses: Counter[str] = Counter()
    pairs: dict[str, list[dict[str, Any]]] = defaultdict(list)
    split_groups: dict[str, list[str]] = defaultdict(list)
    text_norms: Counter[str] = Counter()

    for index, row in enumerate(rows):
        missing = sorted(REQUIRED_FIELDS - set(row))
        if missing:
            errors.append(f"row {index} missing required fields: {missing}")
            continue

        row_id = str(row["id"])
        label = str(row["label"])
        family = str(row["family"])
        source_type = str(row["source_type"])
        pair_id = str(row["pair_id"])
        split_group = str(row["split_group"])
        text = str(row["text"]).strip()

        ids[row_id] += 1
        labels[label] += 1
        families[family][label] += 1
        source_types[source_type] += 1
        if row.get("curriculum_level"):
            curriculum_level = str(row["curriculum_level"])
            curriculum_levels[curriculum_level] += 1
            if curriculum_level not in VALID_CURRICULUM_LEVELS:
                errors.append(f"{row_id}: invalid curriculum_level {curriculum_level!r}")
        if row.get("label_confidence"):
            label_confidence = str(row["label_confidence"])
            label_confidences[label_confidence] += 1
            if label_confidence not in VALID_LABEL_CONFIDENCE:
                errors.append(f"{row_id}: invalid label_confidence {label_confidence!r}")
        if row.get("review_status"):
            review_status = str(row["review_status"])
            review_statuses[review_status] += 1
            if review_status not in VALID_REVIEW_STATUS:
                errors.append(f"{row_id}: invalid review_status {review_status!r}")
        pairs[pair_id].append(row)
        split_groups[split_group].append(row_id)
        text_norms[" ".join(text.lower().split())] += 1

        if label not in VALID_LABELS:
            errors.append(f"{row_id}: invalid label {label!r}")
        if family not in VALID_FAMILIES:
            errors.append(f"{row_id}: invalid family {family!r}")
        if source_type not in VALID_SOURCE_TYPES:
            errors.append(f"{row_id}: invalid source_type {source_type!r}")
        if len(text) < 20:
            errors.append(f"{row_id}: text is too short")
        if not str(row["notes"]).strip():
            errors.append(f"{row_id}: notes must not be empty")

    duplicate_ids = sorted(row_id for row_id, count in ids.items() if count > 1)
    if duplicate_ids:
        errors.append(f"duplicate ids: {duplicate_ids}")

    duplicate_texts = sum(count - 1 for count in text_norms.values() if count > 1)
    if duplicate_texts:
        warnings.append(f"{duplicate_texts} duplicate normalized text rows")

    for pair_id, pair_rows in sorted(pairs.items()):
        pair_labels = {str(row.get("label")) for row in pair_rows}
        pair_families = {str(row.get("family")) for row in pair_rows}
        pair_splits = {str(row.get("split_group")) for row in pair_rows}
        if pair_labels != VALID_LABELS:
            errors.append(f"{pair_id}: expected one clean and one poisoned row, got labels={sorted(pair_labels)}")
        if len(pair_families) != 1:
            errors.append(f"{pair_id}: pair rows must share a family, got {sorted(pair_families)}")
        if len(pair_splits) != 1:
            errors.append(f"{pair_id}: pair rows must share a split_group, got {sorted(pair_splits)}")

    for family, counts in sorted(families.items()):
        if counts.get("clean", 0) == 0 or counts.get("poisoned", 0) == 0:
            errors.append(f"{family}: needs both clean and poisoned rows, got {dict(counts)}")

    if source_types.get("synthetic_curated", 0) + source_types.get("real_carrier_adapted", 0) == len(rows):
        warnings.append("all rows are curated/synthetic or adapted carriers; do not claim real-world incident coverage")

    summary = {
        "rows": len(rows),
        "labels": dict(sorted(labels.items())),
        "families": {family: dict(counts) for family, counts in sorted(families.items())},
        "source_types": dict(sorted(source_types.items())),
        "curriculum_levels": dict(sorted(curriculum_levels.items())),
        "label_confidences": dict(sorted(label_confidences.items())),
        "review_statuses": dict(sorted(review_statuses.items())),
        "pair_count": len(pairs),
        "split_group_count": len(split_groups),
        "warnings": warnings,
    }
    return errors, summary


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--schema", type=Path, default=DEFAULT_SCHEMA)
    parser.add_argument("--pretty", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    rows = load_json(args.dataset)
    if not isinstance(rows, list):
        raise SystemExit("Curated dataset must be a JSON array.")

    schema_result = validate_jsonschema(rows, args.schema)
    errors, summary = validate_rows(rows)
    output = {
        "passed": not errors,
        "dataset": str(args.dataset),
        "schema": str(args.schema),
        "schema_validation": schema_result,
        "summary": summary,
        "errors": errors,
    }
    print(json.dumps(output, indent=2 if args.pretty else None, ensure_ascii=False, sort_keys=True))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())

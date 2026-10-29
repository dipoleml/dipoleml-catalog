#!/usr/bin/env python3
"""Build scanner policy-regression fixtures from reviewed calibration outputs.

The generated cases are not training data. They are product guardrails: clean
rows from the review manifest should not become automatic hard blocks.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


RESEARCH_DIR = Path(__file__).resolve().parent
DEFAULT_REVIEW_OUTPUTS = RESEARCH_DIR / "datasets" / "calibration_review_outputs_qwen_pooled_policy_v3_2026-06-03.json"
DEFAULT_OUTPUT = RESEARCH_DIR / "fixtures" / "activation_scanner_policy_regression_cases.json"
CLEAN_CATEGORIES = (
    "static_policy_regression_candidates",
    "benign_activation_holdouts",
)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def build_case(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": f"policy-clean-{row['row_id']}",
        "text": row["text"],
        "max_decision": "warn",
        "forbidden_decisions": ["block", "quarantine"],
        "expected_label": "clean",
        "source_row_id": row.get("row_id"),
        "source_dataset": row.get("dataset"),
        "source_category": row.get("category"),
        "family": row.get("family"),
        "style": row.get("style"),
        "priority": row.get("priority"),
        "review_decision": row.get("review_decision"),
        "output_action": row.get("output_action"),
        "notes": "Clean reviewed calibration row; scanner may warn, but must not hard-block.",
    }


def build_cases(review_outputs: dict[str, Any]) -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    for category in CLEAN_CATEGORIES:
        rows = review_outputs.get(category) or []
        if not isinstance(rows, list):
            raise SystemExit(f"Review output category must be a list: {category}")
        for row in rows:
            if not isinstance(row, dict):
                continue
            if row.get("label") != "clean":
                continue
            if not row.get("text_available") or not isinstance(row.get("text"), str):
                continue
            cases.append(build_case(row))
    cases.sort(key=lambda row: (str(row.get("priority")), str(row.get("source_category")), str(row.get("id"))))
    return cases


def summarize(cases: list[dict[str, Any]]) -> dict[str, Any]:
    by_category: dict[str, int] = {}
    by_priority: dict[str, int] = {}
    for case in cases:
        category = str(case.get("source_category"))
        priority = str(case.get("priority"))
        by_category[category] = by_category.get(category, 0) + 1
        by_priority[priority] = by_priority.get(priority, 0) + 1
    return {
        "case_count": len(cases),
        "by_category": dict(sorted(by_category.items())),
        "by_priority": dict(sorted(by_priority.items())),
        "max_decision": "warn",
        "forbidden_decisions": ["block", "quarantine"],
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--review-outputs", type=Path, default=DEFAULT_REVIEW_OUTPUTS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--pretty", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    cases = build_cases(load_json(args.review_outputs))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(cases, indent=2, ensure_ascii=False) + "\n")
    if args.pretty:
        print(json.dumps(summarize(cases), indent=2, ensure_ascii=False, sort_keys=True))
        print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Build a review queue from scanner threshold-calibration errors.

The output is not training data. It is a human-review staging file for deciding
which calibration errors should become curated clean/poison examples, weak-label
quarantine rows, or scanner-policy test cases.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_CALIBRATION = Path(
    "research/_results/activation_scanner_calibration/"
    "20260603T102832Z-qwen-pooled-l13-15-threshold-calibration.json"
)
DEFAULT_OUTPUT = Path(
    "research/datasets/calibration_error_review_queue_qwen_pooled_policy_v3_warn030_2026-06-03.json"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert calibration top errors into a data-curriculum review queue."
    )
    parser.add_argument(
        "--calibration",
        type=Path,
        default=DEFAULT_CALIBRATION,
        help="Calibration JSON produced by research.calibrate_scanner_thresholds.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Review-queue JSON output path.",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print the generated queue summary.",
    )
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def queue_action(error_type: str, row: dict[str, Any]) -> str:
    style = row.get("style", "")
    source = row.get("source", "")
    static_findings = row.get("static_findings") or []

    if error_type in {"false_warn_or_block", "false_blocks"}:
        if static_findings:
            return "review_static_context_false_positive"
        if style in {"bipia_clean_email", "masb_content_safe", "skill_inject_clean"}:
            return "promote_benign_lookalike_candidate"
        return "review_clean_false_positive"

    if error_type == "missed_poison":
        if style.startswith("bipia_text_attack"):
            return "review_import_quality_or_reconstruct_hidden_carrier"
        if style == "masb_metadata_malicious" or "metadata" in source:
            return "quarantine_weak_metadata_label_until_content_available"
        return "promote_hard_positive_candidate"

    if error_type == "warned_but_not_blocked_poison":
        return "promote_near_block_positive_candidate"

    return "review"


def queue_reason(error_type: str, row: dict[str, Any]) -> str:
    style = row.get("style", "")
    activation = float(row.get("activation_score", 0.0))
    static_score = float(row.get("static_score", 0.0))
    risk = float(row.get("risk_score", 0.0))

    if error_type in {"false_warn_or_block", "false_blocks"}:
        if static_score > activation:
            return "Clean row is flagged mostly by static rules; check negation/context before block."
        return "Clean row has high activation risk; use as benign lookalike if label is correct."

    if error_type == "missed_poison":
        if style.startswith("bipia_text_attack"):
            return "Poison label may depend on hidden benchmark context not present in scanned text."
        return "Poison row is allowed at current warn threshold; review for stronger training signal."

    if error_type == "warned_but_not_blocked_poison":
        return f"Poison row is close to block threshold but only reaches risk {risk:.3f}."

    return "Review calibration error."


def priority(error_type: str, row: dict[str, Any]) -> str:
    style = row.get("style", "")
    risk = float(row.get("risk_score", 0.0))

    if error_type == "false_blocks" and style in {"bipia_clean_email", "masb_content_safe"}:
        return "p0"
    if error_type == "missed_poison" and risk < 0.1:
        return "p0"
    if error_type == "warned_but_not_blocked_poison" and risk >= 0.8:
        return "p1"
    if error_type == "false_warn_or_block":
        return "p1"
    return "p2"


def build_queue(calibration: dict[str, Any]) -> dict[str, Any]:
    entries: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    top_errors = calibration.get("top_errors", {})

    for dataset_name, error_groups in top_errors.items():
        for error_type, rows in error_groups.items():
            for row in rows:
                key = (dataset_name, row.get("id", ""))
                if key in seen:
                    continue
                seen.add(key)
                entries.append(
                    {
                        "queue_id": f"{dataset_name}:{error_type}:{row.get('id', 'unknown')}",
                        "dataset": dataset_name,
                        "error_type": error_type,
                        "priority": priority(error_type, row),
                        "recommended_action": queue_action(error_type, row),
                        "reason": queue_reason(error_type, row),
                        "review_decision": "needs_review",
                        "artifact_id": calibration.get("artifact", {}).get("artifact_id"),
                        "warn_threshold": calibration.get("config", {}).get("warn_threshold"),
                        "block_threshold": calibration.get("config", {}).get("block_threshold"),
                        "row": {
                            "id": row.get("id"),
                            "label": row.get("label"),
                            "style": row.get("style"),
                            "family": row.get("family"),
                            "source": row.get("source"),
                            "activation_score": row.get("activation_score"),
                            "static_score": row.get("static_score"),
                            "risk_score": row.get("risk_score"),
                            "policy_decision": row.get("policy_decision"),
                            "policy_reasons": row.get("policy_reasons", []),
                            "static_findings": row.get("static_findings", []),
                            "text_preview": row.get("text_preview"),
                        },
                    }
                )

    entries.sort(
        key=lambda item: (
            {"p0": 0, "p1": 1, "p2": 2}.get(item["priority"], 9),
            item["dataset"],
            item["error_type"],
            item["row"].get("style") or "",
            item["row"].get("id") or "",
        )
    )

    by_priority: dict[str, int] = {}
    by_action: dict[str, int] = {}
    by_error_type: dict[str, int] = {}
    for entry in entries:
        by_priority[entry["priority"]] = by_priority.get(entry["priority"], 0) + 1
        by_action[entry["recommended_action"]] = (
            by_action.get(entry["recommended_action"], 0) + 1
        )
        by_error_type[entry["error_type"]] = by_error_type.get(entry["error_type"], 0) + 1

    return {
        "created_at": utc_now(),
        "source_calibration": calibration.get("created_at"),
        "artifact": calibration.get("artifact"),
        "purpose": (
            "Human-review queue for data-curriculum and decision-policy updates. "
            "Rows are not automatically promoted into training."
        ),
        "summary": {
            "total_entries": len(entries),
            "by_priority": dict(sorted(by_priority.items())),
            "by_error_type": dict(sorted(by_error_type.items())),
            "by_recommended_action": dict(sorted(by_action.items())),
        },
        "review_guidance": [
            "Promote clean false positives only if the row is truly benign for tool/MCP poisoning.",
            "Quarantine rows where the unsafe instruction is absent from the scanned text.",
            "Use near-block poison rows to improve the block policy only after adding benign twins.",
            "Keep metadata-only malicious rows out of gold training unless package content is available.",
        ],
        "entries": entries,
    }


def main() -> None:
    args = parse_args()
    calibration = json.loads(args.calibration.read_text())
    queue = build_queue(calibration)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(queue, indent=2, ensure_ascii=False) + "\n")

    if args.pretty:
        print(json.dumps(queue["summary"], indent=2))
        print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()

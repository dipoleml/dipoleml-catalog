"""Convert a calibration-error review queue into reproducible review decisions.

This script records deterministic curriculum routing for calibration errors. It
does not promote queue rows into gold training data by itself.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


DEFAULT_QUEUE = Path(
    "research/datasets/calibration_error_review_queue_qwen_pooled_policy_v3_warn030_2026-06-03.json"
)
DEFAULT_OUTPUT = Path(
    "research/datasets/calibration_error_review_decisions_qwen_pooled_policy_v3_warn030_2026-06-03.json"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build reviewed curriculum decisions from a calibration-error queue."
    )
    parser.add_argument(
        "--queue",
        type=Path,
        default=DEFAULT_QUEUE,
        help="Review queue JSON produced by research.build_calibration_error_queue.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Reviewed decisions JSON output path.",
    )
    parser.add_argument(
        "--source-calibration",
        default=None,
        help="Calibration JSON path to record in the output. Defaults to queue.source_calibration.",
    )
    parser.add_argument(
        "--decision-policy",
        default=None,
        help="Runtime decision-policy name to record, for example corroborated-block-v3.",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print the generated decision summary.",
    )
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def row_id(entry: dict[str, Any]) -> str:
    row = entry.get("row") or {}
    return str(row.get("id") or entry.get("queue_id") or "unknown")


def row_scores(entry: dict[str, Any]) -> dict[str, Any]:
    row = entry.get("row") or {}
    return {
        "activation_score": row.get("activation_score"),
        "static_score": row.get("static_score"),
        "risk_score": row.get("risk_score"),
        "policy_decision": row.get("policy_decision"),
        "static_findings": row.get("static_findings", []),
    }


def is_regression_fixture(entry: dict[str, Any]) -> bool:
    row = entry.get("row") or {}
    source = str(row.get("source") or "")
    style = str(row.get("style") or "")
    rid = row_id(entry)
    return (
        style == "regression_fixture"
        or source == "activation_scanner_regression_cases.json"
        or rid.startswith("secret-negation")
    )


def is_hidden_carrier_without_context(entry: dict[str, Any]) -> bool:
    row = entry.get("row") or {}
    style = str(row.get("style") or "")
    preview = str(row.get("text_preview") or "").lower()
    return style.startswith("bipia_text_attack") or (
        "external instruction carrier" in preview and "bipia-text_attack" in row_id(entry)
    )


def is_metadata_weak_label(entry: dict[str, Any]) -> bool:
    row = entry.get("row") or {}
    source = str(row.get("source") or "").lower()
    style = str(row.get("style") or "").lower()
    return "metadata" in source or "metadata" in style


def clean_decision(entry: dict[str, Any]) -> dict[str, str]:
    row = entry.get("row") or {}
    static_findings = row.get("static_findings") or []
    if static_findings:
        return {
            "review_decision": "add_static_policy_regression_candidate",
            "output_action": "review_static_context_before_training_promotion",
            "curriculum_level": "L2_benign_lookalike",
            "label_status": "clean_static_false_positive_candidate",
            "reason": (
                "The row is labelled clean but static/policy evidence fired; keep it as a "
                "policy-regression candidate until the action-level context is reviewed."
            ),
        }
    return {
        "review_decision": "keep_as_benign_activation_holdout",
        "output_action": "use_for_false_positive_eval_not_gold_training_yet",
        "curriculum_level": "L5_external_holdout",
        "label_status": "clean_but_not_tool_mcp_carrier",
        "reason": (
            "The row is labelled clean and has no static finding; use it as a benign "
            "activation holdout before promoting it into gold scanner training."
        ),
    }


def missed_poison_decision(entry: dict[str, Any]) -> dict[str, str]:
    if is_hidden_carrier_without_context(entry):
        label_status = "weak_label_scanned_text_missing_unsafe_action"
        reason = (
            "The scanned text contains an external-instruction carrier but not the "
            "surrounding tool/task context that makes it unsafe."
        )
    elif is_metadata_weak_label(entry):
        label_status = "weak_metadata_label_content_missing"
        reason = (
            "The malicious label appears to depend on metadata or package context that "
            "is not present in the scanned text."
        )
    else:
        return {
            "review_decision": "promote_hard_positive_signal_for_block_policy",
            "output_action": "add_clean_twin_or_static_rule_before_hard_block_training",
            "curriculum_level": "L4_real_carrier_adapted",
            "label_status": "poisoned_missed_positive_candidate",
            "reason": (
                "The row is labelled poisoned but allowed; review it as a candidate for "
                "stronger activation training or static corroboration."
            ),
        }
    return {
        "review_decision": "quarantine_until_hidden_carrier_reconstructed",
        "output_action": "holdout_or_reconstruct_context_before_training",
        "curriculum_level": "L5_external_holdout",
        "label_status": label_status,
        "reason": reason,
    }


def near_block_poison_decision(entry: dict[str, Any]) -> dict[str, str]:
    if is_regression_fixture(entry):
        return {
            "review_decision": "keep_as_regression_fixture_only",
            "output_action": "do_not_train_as_poison",
            "curriculum_level": "L0_regression",
            "label_status": "fixture_expected_warn_not_gold_poison",
            "reason": (
                "This is a runtime decision regression fixture, not a gold poisoned "
                "training row."
            ),
        }

    dataset = str(entry.get("dataset") or "")
    row = entry.get("row") or {}
    source = str(row.get("source") or "")
    if dataset == "family_curated_v0" or source == "family_curated_v0.json":
        output_action = "already_curated_do_not_duplicate_add_policy_variant_or_static_rule"
        curriculum_level = "L3_subtle_intent"
        reason = (
            "The row is already in the curated family set; use it for policy tuning or "
            "a variant/twin, not as a duplicate training row."
        )
    else:
        output_action = "add_clean_twin_or_static_rule_before_hard_block_training"
        curriculum_level = "L4_real_carrier_adapted"
        reason = (
            "The row is poisoned and near the block threshold; add a clean twin or "
            "strong static corroboration before using it to change hard-block behavior."
        )
    return {
        "review_decision": "promote_hard_positive_signal_for_block_policy",
        "output_action": output_action,
        "curriculum_level": curriculum_level,
        "label_status": "poisoned_near_block_positive",
        "reason": reason,
    }


def fallback_decision() -> dict[str, str]:
    return {
        "review_decision": "manual_review_required",
        "output_action": "do_not_train_until_reviewed",
        "curriculum_level": "L5_external_holdout",
        "label_status": "unclassified_calibration_error",
        "reason": "No deterministic curriculum-routing rule matched this queue entry.",
    }


def classify_entry(entry: dict[str, Any]) -> dict[str, str]:
    row = entry.get("row") or {}
    label = str(row.get("label") or "")
    error_type = str(entry.get("error_type") or "")

    if label == "clean" and error_type in {"false_warn_or_block", "false_blocks"}:
        return clean_decision(entry)
    if label == "poisoned" and error_type == "missed_poison":
        return missed_poison_decision(entry)
    if label == "poisoned" and error_type == "warned_but_not_blocked_poison":
        return near_block_poison_decision(entry)
    return fallback_decision()


def build_decisions(
    *,
    queue: dict[str, Any],
    source_queue: str,
    source_calibration: str | None,
    decision_policy: str | None,
) -> dict[str, Any]:
    entries = queue.get("entries") or []
    if not isinstance(entries, list):
        raise SystemExit("Queue JSON must contain an entries array.")

    decisions: list[dict[str, Any]] = []
    for entry in entries:
        route = classify_entry(entry)
        decisions.append(
            {
                "queue_id": entry.get("queue_id"),
                "row_id": row_id(entry),
                "dataset": entry.get("dataset"),
                "error_type": entry.get("error_type"),
                "priority": entry.get("priority"),
                "recommended_action": entry.get("recommended_action"),
                **route,
                "scores": row_scores(entry),
            }
        )

    by_review_decision = Counter(row["review_decision"] for row in decisions)
    by_output_action = Counter(row["output_action"] for row in decisions)
    by_label_status = Counter(row["label_status"] for row in decisions)

    artifact = queue.get("artifact") or {}
    first_entry = entries[0] if entries else {}
    return {
        "created_at": utc_now(),
        "source_queue": source_queue,
        "source_calibration": source_calibration or queue.get("source_calibration"),
        "artifact_id": artifact.get("artifact_id") or first_entry.get("artifact_id"),
        "decision_policy": decision_policy,
        "warn_threshold": first_entry.get("warn_threshold"),
        "block_threshold": first_entry.get("block_threshold"),
        "purpose": (
            "Reviewed curriculum decisions for calibration errors. This file records "
            "what to promote, quarantine, or convert into policy regression tests; it "
            "is not training data."
        ),
        "summary": {
            "total_entries": len(decisions),
            "by_review_decision": dict(sorted(by_review_decision.items())),
            "by_output_action": dict(sorted(by_output_action.items())),
            "by_label_status": dict(sorted(by_label_status.items())),
        },
        "rules": [
            "Do not train directly on the review queue or this decisions file.",
            "Rows whose unsafe action is missing from scanned text stay quarantined until hidden carrier context is reconstructed.",
            "Clean static false positives become policy/regression candidates before gold training rows.",
            "Near-block poisoned rows need a reviewed benign twin or stronger static corroboration before changing hard-block behavior.",
            "Runtime regression fixtures are not gold poisoned training data.",
        ],
        "decisions": decisions,
    }


def main() -> None:
    args = parse_args()
    queue = json.loads(args.queue.read_text())
    decisions = build_decisions(
        queue=queue,
        source_queue=str(args.queue),
        source_calibration=args.source_calibration,
        decision_policy=args.decision_policy,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(decisions, indent=2, ensure_ascii=False) + "\n")
    if args.pretty:
        print(json.dumps(decisions["summary"], indent=2, ensure_ascii=False))
        print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()

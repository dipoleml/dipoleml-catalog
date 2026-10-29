#!/usr/bin/env python3
"""Build a manual-review queue for activation-scanner curriculum rows.

The queue is intentionally not a training dataset. It is a triage surface for
external rows that may later be promoted into the curated curriculum after a
human-style review.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

try:
    from .skillinject_review_metadata import metadata_for_skillinject_row
except ImportError:  # pragma: no cover - direct script execution fallback
    from skillinject_review_metadata import metadata_for_skillinject_row  # type: ignore


RESEARCH_DIR = Path(__file__).resolve().parent
DEFAULT_EXTERNAL = RESEARCH_DIR / "datasets" / "routeguard_external_v0.json"
DEFAULT_OUT = RESEARCH_DIR / "datasets" / "curriculum_review_queue_v0.json"

RISK_FAMILIES = {
    "instruction_chaining",
    "secret_file_access",
    "credential_forwarding",
    "network_exfiltration",
    "hidden_persistence_logging",
    "live_system_access",
    "system_inventory",
    "tool_shadowing",
}


def load_rows(path: Path) -> list[dict[str, Any]]:
    rows = json.loads(path.read_text())
    if not isinstance(rows, list):
        raise SystemExit(f"{path} must contain a JSON array")
    return [row for row in rows if isinstance(row, dict)]


def excerpt(text: str, limit: int) -> str:
    normalized = re.sub(r"\s+", " ", text).strip()
    if len(normalized) <= limit:
        return normalized
    return normalized[: limit - 3].rstrip() + "..."


def normalized_family(row: dict[str, Any]) -> str:
    skillinject_metadata = metadata_for_skillinject_row(row)
    if skillinject_metadata:
        return skillinject_metadata["family"]

    text = str(row.get("text") or row.get("text_excerpt") or "").lower()
    row_id = str(row.get("id") or "").lower()
    style = str(row.get("style") or "").lower()

    if any(term in row_id for term in ("base-encoding", "alphanumeric-substitution")) or any(
        term in text
        for term in ("base64", "base32", "replace letters", "use numbers for vowels", "encode your response")
    ):
        return "instruction_chaining"
    if any(term in row_id for term in ("blocking-internet-connection", "crippling-critical-infrastructures")) or any(
        term in text
        for term in (
            "git reset --hard",
            "git push --force",
            "rm -rf",
            "dd if=",
            "systemctl stop",
            "ipconfig /release",
            "os.system",
            "subprocess",
            "run network_diag.sh",
            "run backup.sh",
        )
    ):
        return "live_system_access"
    if any(term in row_id for term in ("cookie-theft", "data-eavesdropping")):
        return "credential_forwarding"
    if "data collection procedure" in text:
        return "hidden_persistence_logging"
    if "location addon" in text or "available location information" in text:
        return "system_inventory"
    if "skill_inject" in style and any(term in text for term in ("route those calls", "replace results", "intercept search")):
        return "tool_shadowing"

    family = str(row.get("family") or "")
    if family in RISK_FAMILIES:
        return family
    return "tool_shadowing"


def product_carrier(row: dict[str, Any]) -> bool:
    carrier = str(row.get("carrier") or "")
    style = str(row.get("style") or "")
    return carrier in {"SKILL.md", "skill_package_text", "skill_metadata"} or style.startswith("skill_inject_") or style.startswith("masb_")


def proposed_level(row: dict[str, Any]) -> str:
    style = str(row.get("style") or "")
    label = str(row.get("label") or "")
    carrier = str(row.get("carrier") or "")
    skillinject_metadata = metadata_for_skillinject_row(row)

    if skillinject_metadata and label == "poisoned":
        decision = skillinject_metadata.get("recommended_decision")
        return "L5_external_holdout" if decision == "holdout_only" else "L4_real_carrier_adapted"
    if style.startswith("bipia_") and label == "poisoned":
        return "L3_subtle_intent"
    if style.startswith("skill_inject_") and label == "poisoned":
        return "L4_real_carrier_adapted"
    if style == "masb_content_suspicious_candidate":
        return "L4_real_carrier_adapted"
    if style == "masb_metadata_malicious":
        return "L5_external_holdout"
    if label == "clean" and normalized_family(row) in RISK_FAMILIES:
        return "L2_benign_lookalike"
    if carrier == "skill_package_text":
        return "L4_real_carrier_adapted"
    return "L5_external_holdout"


def label_confidence(row: dict[str, Any]) -> str:
    style = str(row.get("style") or "")
    label = str(row.get("label") or "")

    if metadata_for_skillinject_row(row):
        return "high"
    if style.startswith("skill_inject_"):
        return "high"
    if style.startswith("bipia_") and label == "poisoned":
        return "medium"
    if style in {"masb_content_safe", "masb_content_suspicious_candidate"}:
        return "medium"
    if style == "masb_metadata_malicious":
        return "low"
    return "medium"


def review_reason(row: dict[str, Any]) -> str:
    style = str(row.get("style") or "")
    label = str(row.get("label") or "")
    family = normalized_family(row)
    skillinject_metadata = metadata_for_skillinject_row(row)

    if skillinject_metadata:
        return f"source-confirmed Skill-Inject injection: {skillinject_metadata['review_note']}"
    if style == "masb_metadata_malicious":
        return "metadata-only malicious row; useful as holdout or source lead, not direct training truth"
    if style == "masb_content_suspicious_candidate":
        return "real carrier text with weak suspicious label; needs manual confirmation before training"
    if label == "clean" and family != "tool_shadowing":
        return "clean row mapped to risky family; useful benign lookalike candidate if action stays safe"
    if style.startswith("bipia_") and label == "poisoned":
        return "indirect prompt-injection payload; check whether family and carrier surface are product-relevant"
    if style.startswith("skill_inject_") and label == "poisoned":
        return "poisoned SKILL.md carrier; good product-shaped candidate after action-level review"
    return "external row should be reviewed before training promotion"


def priority_score(row: dict[str, Any]) -> int:
    style = str(row.get("style") or "")
    label = str(row.get("label") or "")
    family = normalized_family(row)
    score = 0

    if product_carrier(row):
        score += 25
    if label == "poisoned":
        score += 40
    if proposed_level(row) in {"L2_benign_lookalike", "L3_subtle_intent"}:
        score += 20
    if style == "masb_content_suspicious_candidate":
        score += 25
    if style.startswith("skill_inject_") and label == "poisoned":
        score += 20
    if style.startswith("bipia_") and label == "poisoned":
        score += 15
    if style == "masb_metadata_malicious":
        score += 10
    if metadata_for_skillinject_row(row):
        score += 30
    if label == "clean" and family != "tool_shadowing":
        score += 15
    if family in {"instruction_chaining", "secret_file_access", "system_inventory", "hidden_persistence_logging"}:
        score += 8
    return score


def review_item(row: dict[str, Any], text_limit: int) -> dict[str, Any]:
    family = normalized_family(row)
    label = str(row.get("label") or "")
    skillinject_metadata = metadata_for_skillinject_row(row)
    return {
        "id": row.get("id"),
        "source": row.get("source"),
        "style": row.get("style"),
        "carrier": row.get("carrier"),
        "original_label": label,
        "proposed_label": label,
        "proposed_family": family,
        "proposed_curriculum_level": proposed_level(row),
        "proposed_label_confidence": label_confidence(row),
        "review_status": "needs_review",
        "recommended_review_decision": (
            skillinject_metadata.get("recommended_decision", "needs_review") if skillinject_metadata else "needs_review"
        ),
        "priority_score": priority_score(row),
        "review_reason": review_reason(row),
        "risk_action_to_confirm": skillinject_metadata.get("risk_action", "") if skillinject_metadata else "",
        "attack_goal_to_confirm": (
            ""
            if label == "clean"
            else skillinject_metadata.get("attack_goal", family)
            if skillinject_metadata
            else family
        ),
        "text_excerpt": excerpt(str(row.get("text") or ""), text_limit),
    }


def select_diverse(items: list[dict[str, Any]], limit: int, per_bucket: int) -> list[dict[str, Any]]:
    buckets: dict[tuple[str, str, str], list[dict[str, Any]]] = defaultdict(list)
    for item in items:
        key = (
            str(item["proposed_family"]),
            str(item["original_label"]),
            str(item["style"]),
        )
        buckets[key].append(item)

    selected: list[dict[str, Any]] = []
    for bucket in buckets.values():
        bucket.sort(key=lambda item: (-int(item["priority_score"]), str(item["id"])))
        selected.extend(bucket[:per_bucket])

    selected.sort(key=lambda item: (-int(item["priority_score"]), str(item["proposed_family"]), str(item["id"])))
    return selected[:limit]


def build_queue(rows: list[dict[str, Any]], max_rows: int, per_bucket: int, text_limit: int) -> list[dict[str, Any]]:
    candidates = [review_item(row, text_limit) for row in rows if row.get("text")]
    clean_limit = max_rows // 2
    poison_limit = max_rows - clean_limit
    clean = [item for item in candidates if item["original_label"] == "clean"]
    poisoned = [item for item in candidates if item["original_label"] == "poisoned"]

    selected = select_diverse(poisoned, poison_limit, per_bucket)
    selected.extend(select_diverse(clean, clean_limit, per_bucket))

    seen = {str(item["id"]) for item in selected}
    if len(selected) < max_rows:
        leftovers = [item for item in candidates if str(item["id"]) not in seen]
        leftovers.sort(key=lambda item: (-int(item["priority_score"]), str(item["id"])))
        selected.extend(leftovers[: max_rows - len(selected)])

    selected.sort(
        key=lambda item: (
            str(item["original_label"]) != "poisoned",
            -int(item["priority_score"]),
            str(item["proposed_family"]),
            str(item["id"]),
        )
    )
    return selected[:max_rows]


def summarize(queue: list[dict[str, Any]]) -> dict[str, Any]:
    by_label = Counter(str(item["original_label"]) for item in queue)
    by_family = Counter(str(item["proposed_family"]) for item in queue)
    by_level = Counter(str(item["proposed_curriculum_level"]) for item in queue)
    by_confidence = Counter(str(item["proposed_label_confidence"]) for item in queue)
    by_style = Counter(str(item["style"]) for item in queue)
    return {
        "rows": len(queue),
        "labels": dict(sorted(by_label.items())),
        "families": dict(sorted(by_family.items())),
        "curriculum_levels": dict(sorted(by_level.items())),
        "label_confidence": dict(sorted(by_confidence.items())),
        "styles": dict(sorted(by_style.items())),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_EXTERNAL)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--max-rows", type=int, default=120)
    parser.add_argument("--per-bucket", type=int, default=4)
    parser.add_argument("--text-limit", type=int, default=900)
    parser.add_argument("--no-write", action="store_true")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    rows = load_rows(args.input)
    queue = build_queue(rows, args.max_rows, args.per_bucket, args.text_limit)
    payload = {
        "source_dataset": str(args.input),
        "purpose": "Manual triage queue. Do not train on these rows until review_status is accepted.",
        "summary": summarize(queue),
        "rows": queue,
    }
    if not args.no_write:
        args.out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(payload["summary"] | {"out": str(args.out) if not args.no_write else None}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Promote source-confirmed Skill-Inject pairs into curated curriculum data.

This script is intentionally conservative: it only promotes hand-picked
Skill-Inject rows whose source injection metadata names a concrete unsafe
action. The paired clean row is the original SKILL.md for the same skill.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

try:
    from .skillinject_review_metadata import metadata_for_skillinject_row
except ImportError:  # pragma: no cover - direct script execution fallback
    from skillinject_review_metadata import metadata_for_skillinject_row  # type: ignore


RESEARCH_DIR = Path(__file__).resolve().parent
DEFAULT_EXTERNAL = RESEARCH_DIR / "datasets" / "routeguard_external_v0.json"
DEFAULT_CURATED = RESEARCH_DIR / "datasets" / "family_curated_v0.json"
DEFAULT_DECISIONS = RESEARCH_DIR / "datasets" / "curriculum_review_decisions_v0.json"
GENERATED_PREFIX = "fcv0-skillinject-"

PROMOTION_PLAN = [
    {
        "pair_slug": "git-force-push",
        "poisoned_id": "skillinject-skill-inject-contextual-10-git-0-desc",
        "rationale": "same Git skill with an injected force-push instruction",
    },
    {
        "pair_slug": "hf-public-override",
        "poisoned_id": "skillinject-skill-inject-contextual-16-hf-dataset-creator-0-desc",
        "rationale": "same Hugging Face dataset skill with injected privacy override",
    },
    {
        "pair_slug": "env-file-forward",
        "poisoned_id": "skillinject-skill-inject-obvious-10-python-code-2-line",
        "rationale": "same Python skill with injected .env collection and forwarding",
    },
    {
        "pair_slug": "ssh-file-forward",
        "poisoned_id": "skillinject-skill-inject-obvious-11-pdf-1-line",
        "rationale": "same PDF skill with injected SSH file collection and forwarding",
    },
    {
        "pair_slug": "calendar-location",
        "poisoned_id": "skillinject-skill-inject-obvious-14-calendar-0-line",
        "rationale": "same calendar skill with injected location tracking",
    },
    {
        "pair_slug": "clipboard-exfil",
        "poisoned_id": "skillinject-skill-inject-obvious-17-xlsx-4-line",
        "rationale": "same spreadsheet skill with injected clipboard collection",
    },
    {
        "pair_slug": "screenshot-exfil",
        "poisoned_id": "skillinject-skill-inject-obvious-18-docx-4-line",
        "rationale": "same document skill with injected screenshot collection",
    },
    {
        "pair_slug": "backup-script-run",
        "poisoned_id": "skillinject-skill-inject-direct-1-pptx-1-line",
        "rationale": "same presentation skill with injected bundled backup script execution",
    },
]


def load_rows(path: Path) -> list[dict[str, Any]]:
    rows = json.loads(path.read_text())
    if not isinstance(rows, list):
        raise SystemExit(f"{path} must contain a JSON array")
    return [row for row in rows if isinstance(row, dict)]


def skill_slug_from_split_group(row: dict[str, Any]) -> str:
    split_group = str(row.get("split_group") or "")
    parts = split_group.split(":")
    if len(parts) < 3 or parts[0] != "skillinject":
        raise SystemExit(f"{row.get('id')}: cannot parse skill slug from split_group={split_group!r}")
    return parts[1]


def build_pair(
    *,
    plan: dict[str, str],
    clean_source: dict[str, Any],
    poisoned_source: dict[str, Any],
    metadata: dict[str, str],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    pair_id = f"{GENERATED_PREFIX}{plan['pair_slug']}"
    split_group = f"pair:{pair_id}"
    family = metadata["family"]
    clean_id = f"{pair_id}-clean"
    poison_id = f"{pair_id}-poison"

    common = {
        "family": family,
        "source_type": "public_dataset",
        "pair_id": pair_id,
        "split_group": split_group,
        "carrier": "SKILL.md",
        "style": "skillinject_curated",
        "label_confidence": "high",
        "review_status": "accepted",
    }
    rows = [
        {
            "id": clean_id,
            "label": "clean",
            "source": f"Skill-Inject:clean:{clean_source.get('id')}",
            "text": clean_source["text"],
            "notes": (
                "Accepted clean lookalike from the original Skill-Inject SKILL.md. "
                f"Paired with {poisoned_source.get('id')} so only the injected unsafe action changes."
            ),
            "curriculum_level": "L4_real_carrier_adapted",
            "attack_goal": "none",
            "risk_action": "same_skill_without_injected_instruction",
        }
        | common,
        {
            "id": poison_id,
            "label": "poisoned",
            "source": str(poisoned_source.get("source") or "Skill-Inject"),
            "text": poisoned_source["text"],
            "notes": (
                "Accepted poisoned Skill-Inject SKILL.md. "
                f"Source row {poisoned_source.get('id')} {metadata['review_note']}."
            ),
            "curriculum_level": "L4_real_carrier_adapted",
            "attack_goal": metadata["attack_goal"],
            "risk_action": metadata["risk_action"],
        }
        | common,
    ]
    decision = {
        "pair_id": pair_id,
        "decision": "accepted",
        "clean_row_id": clean_id,
        "poisoned_row_id": poison_id,
        "clean_source_id": clean_source.get("id"),
        "poisoned_source_id": poisoned_source.get("id"),
        "source": poisoned_source.get("source"),
        "final_label": "paired_clean_poisoned",
        "final_family": family,
        "curriculum_level": "L4_real_carrier_adapted",
        "label_confidence": "high",
        "attack_goal": metadata["attack_goal"],
        "risk_action": metadata["risk_action"],
        "review_notes": f"{plan['rationale']}; {metadata['review_note']}.",
    }
    return rows, decision


def generate_promotions(
    curated_rows: list[dict[str, Any]],
    external_rows: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    external_by_id = {str(row.get("id")): row for row in external_rows}
    generated_rows: list[dict[str, Any]] = []
    decisions: list[dict[str, Any]] = []

    for plan in PROMOTION_PLAN:
        poisoned = external_by_id.get(plan["poisoned_id"])
        if not poisoned:
            raise SystemExit(f"missing poisoned source row: {plan['poisoned_id']}")
        if poisoned.get("label") != "poisoned":
            raise SystemExit(f"{plan['poisoned_id']}: expected poisoned source row")
        metadata = metadata_for_skillinject_row(poisoned)
        if not metadata:
            raise SystemExit(f"{plan['poisoned_id']}: missing Skill-Inject review metadata")
        if metadata.get("recommended_decision") == "holdout_only":
            raise SystemExit(f"{plan['poisoned_id']}: promotion plan includes holdout-only row")

        clean_id = f"skillinject-clean-{skill_slug_from_split_group(poisoned)}"
        clean = external_by_id.get(clean_id)
        if not clean:
            raise SystemExit(f"{plan['poisoned_id']}: missing paired clean source row {clean_id}")
        if clean.get("label") != "clean":
            raise SystemExit(f"{clean_id}: expected clean source row")

        rows, decision = build_pair(plan=plan, clean_source=clean, poisoned_source=poisoned, metadata=metadata)
        generated_rows.extend(rows)
        decisions.append(decision)

    retained = [row for row in curated_rows if not str(row.get("id") or "").startswith(GENERATED_PREFIX)]
    return retained + generated_rows, decisions


def summarize(rows: list[dict[str, Any]], decisions: list[dict[str, Any]]) -> dict[str, Any]:
    generated = [row for row in rows if str(row.get("id") or "").startswith(GENERATED_PREFIX)]
    return {
        "curated_rows": len(rows),
        "generated_rows": len(generated),
        "accepted_pairs": len(decisions),
        "generated_labels": dict(sorted(Counter(str(row.get("label")) for row in generated).items())),
        "generated_families": dict(sorted(Counter(str(row.get("family")) for row in generated).items())),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--curated", type=Path, default=DEFAULT_CURATED)
    parser.add_argument("--external", type=Path, default=DEFAULT_EXTERNAL)
    parser.add_argument("--decisions", type=Path, default=DEFAULT_DECISIONS)
    parser.add_argument("--no-write", action="store_true")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    curated_rows = load_rows(args.curated)
    external_rows = load_rows(args.external)
    promoted, decisions = generate_promotions(curated_rows, external_rows)
    summary = summarize(promoted, decisions)

    if not args.no_write:
        args.curated.write_text(json.dumps(promoted, indent=2, ensure_ascii=False) + "\n")
        args.decisions.write_text(
            json.dumps(
                {
                    "source_dataset": str(args.external),
                    "purpose": (
                        "Accepted Skill-Inject curriculum promotions. These rows can be used for "
                        "family_curated_v0 training because the unsafe action is source-confirmed."
                    ),
                    "summary": summary,
                    "decisions": decisions,
                },
                indent=2,
                ensure_ascii=False,
            )
            + "\n"
        )

    print(json.dumps(summary | {"curated": str(args.curated), "decisions": str(args.decisions)}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

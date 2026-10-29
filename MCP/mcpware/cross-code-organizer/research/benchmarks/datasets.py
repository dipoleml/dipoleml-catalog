"""Dataset loading utilities for activation-scanner benchmarks."""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from random import Random
from typing import Iterable


RESEARCH_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATA_DIR = RESEARCH_DIR / "datasets"


@dataclass(frozen=True)
class Example:
    text: str
    label: int
    style: str
    source: str
    index: int
    record_id: str | None = None
    family: str | None = None
    source_type: str | None = None
    pair_id: str | None = None
    split_group: str | None = None
    notes: str | None = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class DatasetBundle:
    name: str
    examples: list[Example]
    removed_duplicates: int = 0

    def texts(self) -> list[str]:
        return [example.text for example in self.examples]

    def labels(self) -> list[int]:
        return [example.label for example in self.examples]

    def summary(self) -> dict:
        return summarize_examples(self.examples) | {
            "name": self.name,
            "removed_duplicates": self.removed_duplicates,
        }


STYLE_FILES: dict[str, tuple[tuple[str, int], ...]] = {
    "mcptox": (
        ("mcptox_clean_descriptions_labeled.json", 0),
        ("mcptox_poisoned_descriptions_labeled.json", 1),
    ),
    "hard": (
        ("hard_clean.json", 0),
        ("hard_poisoned.json", 1),
    ),
    "hard_v2": (
        ("hard_v2_clean.json", 0),
        ("hard_v2_poisoned.json", 1),
    ),
    "hard_v3": (
        ("hard_v3_clean.json", 0),
        ("hard_v3_poisoned.json", 1),
    ),
    "matched": (
        ("hard_v3_matched_clean.json", 0),
        ("hard_v3_matched_poisoned.json", 1),
    ),
    "neutral": (
        ("neutral_clean.json", 0),
        ("neutral_poisoned.json", 1),
    ),
    "adversarial": (
        ("adversarial_poisoned.json", 1),
        ("adversarial_poisoned_v2.json", 1),
        ("adversarial_poisoned_v3.json", 1),
    ),
}

HAND_CORE_STYLES = ("matched", "neutral", "hard_v2")
HAND_ALL_STYLES = ("matched", "neutral", "hard_v2", "hard", "hard_v3", "adversarial")
BALANCED_STYLES = ("mcptox", "hard", "hard_v2", "hard_v3", "matched", "neutral")
FAMILY_CURATED_V0_FILE = "family_curated_v0.json"
ROUTEGUARD_EXTERNAL_V0_FILE = "routeguard_external_v0.json"


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def coerce_label(value: object, forced: int) -> int:
    if value is None:
        return forced
    if isinstance(value, (int, float)):
        return int(value)
    label = str(value).strip().lower()
    if label in {"1", "poisoned", "poison", "malicious", "injection", "unsafe", "bad"}:
        return 1
    if label in {"0", "clean", "safe", "benign", "good"}:
        return 0
    return forced


def extract_text(row: object) -> str | None:
    if isinstance(row, str):
        return row
    if not isinstance(row, dict):
        return None
    for key in ("description", "text", "tool_description", "tool_content", "content"):
        value = row.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return None


def load_file(data_dir: Path, file_name: str, forced_label: int, style: str) -> list[Example]:
    path = data_dir / file_name
    with path.open() as handle:
        rows = json.load(handle)

    examples = []
    for index, row in enumerate(rows):
        text = extract_text(row)
        if not text:
            continue
        label = coerce_label(row.get("label") if isinstance(row, dict) else None, forced_label)
        examples.append(
            Example(
                text=text,
                label=label,
                style=style,
                source=file_name,
                index=index,
                record_id=str(row.get("id")) if isinstance(row, dict) and row.get("id") else None,
                family=str(row.get("family")) if isinstance(row, dict) and row.get("family") else None,
                source_type=str(row.get("source_type")) if isinstance(row, dict) and row.get("source_type") else None,
                pair_id=str(row.get("pair_id")) if isinstance(row, dict) and row.get("pair_id") else None,
                split_group=str(row.get("split_group")) if isinstance(row, dict) and row.get("split_group") else None,
                notes=str(row.get("notes")) if isinstance(row, dict) and row.get("notes") else None,
            )
        )
    return examples


def load_curated_file(
    data_dir: Path,
    file_name: str = FAMILY_CURATED_V0_FILE,
    style: str = "family_curated_v0",
) -> list[Example]:
    path = data_dir / file_name
    with path.open() as handle:
        rows = json.load(handle)

    examples = []
    for index, row in enumerate(rows):
        text = extract_text(row)
        if not text:
            continue
        if not isinstance(row, dict):
            continue
        examples.append(
            Example(
                text=text,
                label=coerce_label(row.get("label"), 0),
                style=str(row.get("style") or style),
                source=file_name,
                index=index,
                record_id=str(row.get("id")) if row.get("id") else None,
                family=str(row.get("family")) if row.get("family") else None,
                source_type=str(row.get("source_type")) if row.get("source_type") else None,
                pair_id=str(row.get("pair_id")) if row.get("pair_id") else None,
                split_group=str(row.get("split_group")) if row.get("split_group") else None,
                notes=str(row.get("notes")) if row.get("notes") else None,
            )
        )
    return examples


def load_routeguard_external_file(
    data_dir: Path = DEFAULT_DATA_DIR,
    file_name: str = ROUTEGUARD_EXTERNAL_V0_FILE,
    style: str = "routeguard_external_v0",
) -> list[Example]:
    return load_curated_file(data_dir, file_name=file_name, style=style)


def load_style(style: str, data_dir: Path = DEFAULT_DATA_DIR) -> list[Example]:
    if style == "family_curated_v0":
        return load_curated_file(data_dir)
    if style == "routeguard_external_v0":
        return load_routeguard_external_file(data_dir)

    try:
        files = STYLE_FILES[style]
    except KeyError as exc:
        known = ", ".join(sorted(STYLE_FILES))
        raise ValueError(f"Unknown style {style!r}; known styles: {known}") from exc

    examples: list[Example] = []
    for file_name, forced_label in files:
        examples.extend(load_file(data_dir, file_name, forced_label, style))
    return examples


def load_hand_pool(pool: str, data_dir: Path = DEFAULT_DATA_DIR) -> list[Example]:
    if pool == "core":
        styles = HAND_CORE_STYLES
    elif pool == "all":
        styles = HAND_ALL_STYLES
    else:
        raise ValueError("hand pool must be 'core' or 'all'")
    return [example for style in styles for example in load_style(style, data_dir)]


def load_all_balanced_styles(data_dir: Path = DEFAULT_DATA_DIR) -> list[Example]:
    return [example for style in BALANCED_STYLES for example in load_style(style, data_dir)]


def sample_balanced(examples: Iterable[Example], max_samples: int | None, seed: int) -> list[Example]:
    examples = list(examples)
    if max_samples is None or len(examples) <= max_samples:
        return examples
    if max_samples < 2:
        return examples[:max_samples]

    rng = Random(seed)
    by_label = {0: [], 1: []}
    other: list[Example] = []
    for example in examples:
        if example.label in by_label:
            by_label[example.label].append(example)
        else:
            other.append(example)

    if not by_label[0] or not by_label[1]:
        shuffled = examples[:]
        rng.shuffle(shuffled)
        return shuffled[:max_samples]

    per_label = max_samples // 2
    remainder = max_samples - (per_label * 2)
    sampled: list[Example] = []
    for label in (0, 1):
        pool = by_label[label][:]
        rng.shuffle(pool)
        sampled.extend(pool[:per_label])
    if remainder:
        leftovers = by_label[0][per_label:] + by_label[1][per_label:] + other
        rng.shuffle(leftovers)
        sampled.extend(leftovers[:remainder])

    sampled.sort(key=lambda row: (row.style, row.source, row.index))
    return sampled


def remove_overlapping_train_examples(
    train: Iterable[Example],
    test: Iterable[Example],
) -> tuple[list[Example], int]:
    test_norms = {normalize_text(example.text) for example in test}
    kept = []
    removed = 0
    for example in train:
        if normalize_text(example.text) in test_norms:
            removed += 1
            continue
        kept.append(example)
    return kept, removed


def summarize_examples(examples: Iterable[Example]) -> dict:
    examples = list(examples)
    by_label = {"clean": 0, "poisoned": 0, "other": 0}
    by_style: dict[str, dict[str, int]] = {}
    by_source: dict[str, int] = {}
    by_family: dict[str, dict[str, int]] = {}
    by_source_type: dict[str, int] = {}
    pair_ids: set[str] = set()
    split_groups: set[str] = set()

    for example in examples:
        if example.label == 0:
            by_label["clean"] += 1
        elif example.label == 1:
            by_label["poisoned"] += 1
        else:
            by_label["other"] += 1

        style_bucket = by_style.setdefault(example.style, {"clean": 0, "poisoned": 0, "other": 0})
        if example.label == 0:
            style_bucket["clean"] += 1
        elif example.label == 1:
            style_bucket["poisoned"] += 1
        else:
            style_bucket["other"] += 1

        by_source[example.source] = by_source.get(example.source, 0) + 1
        if example.family:
            family_bucket = by_family.setdefault(example.family, {"clean": 0, "poisoned": 0, "other": 0})
            if example.label == 0:
                family_bucket["clean"] += 1
            elif example.label == 1:
                family_bucket["poisoned"] += 1
            else:
                family_bucket["other"] += 1
        if example.source_type:
            by_source_type[example.source_type] = by_source_type.get(example.source_type, 0) + 1
        if example.pair_id:
            pair_ids.add(example.pair_id)
        if example.split_group:
            split_groups.add(example.split_group)

    return {
        "n": len(examples),
        "labels": by_label,
        "styles": by_style,
        "sources": dict(sorted(by_source.items())),
        "families": by_family,
        "source_types": dict(sorted(by_source_type.items())),
        "pair_count": len(pair_ids),
        "split_group_count": len(split_groups),
    }


def exact_dataset_inventory(data_dir: Path = DEFAULT_DATA_DIR) -> list[dict]:
    inventory = []
    for path in sorted(data_dir.glob("*.json")):
        with path.open() as handle:
            rows = json.load(handle)
        usable_text_rows = sum(1 for row in rows if extract_text(row))
        inventory.append({"file": path.name, "rows": len(rows), "usable_text_rows": usable_text_rows})
    return inventory

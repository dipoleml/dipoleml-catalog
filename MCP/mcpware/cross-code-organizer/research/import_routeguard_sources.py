#!/usr/bin/env python3
"""Normalize RouteGuard benchmark sources into inert scanner rows.

The importer reads local clones/downloads only. It does not execute any skill,
script, package, hook, or benchmark code from the source datasets.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Iterable

try:
    from .skillinject_review_metadata import metadata_for_skillinject
except ImportError:  # pragma: no cover - direct script execution fallback
    from skillinject_review_metadata import metadata_for_skillinject  # type: ignore


RESEARCH_DIR = Path(__file__).resolve().parent
DEFAULT_RAW_DIR = RESEARCH_DIR / "datasets" / "external_raw"
DEFAULT_OUT = RESEARCH_DIR / "datasets" / "routeguard_external_v0.json"
MASB_CONTENT_FILE = "masb_skill_content_v0.json"

FAMILIES = {
    "instruction_chaining",
    "secret_file_access",
    "credential_forwarding",
    "network_exfiltration",
    "hidden_persistence_logging",
    "live_system_access",
    "system_inventory",
    "tool_shadowing",
}


def normalize_ws(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", text.replace("\r\n", "\n")).strip()


def slug(value: object) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "-", str(value).strip().lower()).strip("-")
    return text or "unknown"


def family_from_text(text: str) -> str:
    lowered = text.lower()
    if any(term in lowered for term in ("base64", "base32", "replace letters", "use numbers for vowels", "encode your response")):
        return "instruction_chaining"
    if any(
        term in lowered
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
    if any(term in lowered for term in ("cookie", "bearer token", "access token", "api key", "private key", "password")):
        if any(term in lowered for term in ("send", "post", "upload", "external", "vendor", "debug endpoint", "requests.")):
            return "credential_forwarding"
        return "secret_file_access"
    if any(term in lowered for term in ("exfiltrat", "upload", "post request", "webhook", "external", "send")):
        return "network_exfiltration"
    if any(term in lowered for term in ("execute", "run ", "shell", "script", "subprocess", "curl", "download")):
        return "live_system_access"
    if any(term in lowered for term in ("ignore", "override", "hidden instruction", "do not mention", "system prompt")):
        return "instruction_chaining"
    if any(term in lowered for term in ("file", ".env", "ssh", "directory", "filesystem")):
        return "secret_file_access"
    if any(term in lowered for term in ("log", "background", "silently", "persist")):
        return "hidden_persistence_logging"
    if any(term in lowered for term in ("hostname", "system", "environment", "process")):
        return "system_inventory"
    return "tool_shadowing"


def row(
    *,
    row_id: str,
    text: str,
    label: str,
    style: str,
    source: str,
    pair_id: str,
    split_group: str,
    source_type: str,
    notes: str,
    family: str | None = None,
    carrier: str | None = None,
) -> dict:
    text = normalize_ws(text)
    family = family if family in FAMILIES else family_from_text(text)
    out = {
        "id": row_id,
        "label": label,
        "family": family,
        "source_type": source_type,
        "source": source,
        "pair_id": pair_id,
        "split_group": split_group,
        "style": style,
        "text": text,
        "notes": notes,
    }
    if carrier:
        out["carrier"] = carrier
    return out


def read_json(path: Path) -> object:
    with path.open() as handle:
        return json.load(handle)


def skill_paths(skill_root: Path) -> dict[str, Path]:
    mapping: dict[str, Path] = {}
    for path in sorted(skill_root.rglob("SKILL.md")):
        rel = path.relative_to(skill_root)
        parts = rel.parts
        names = {
            path.parent.name,
            str(rel.parent),
            str(rel.parent).replace("/", "-"),
        }
        if len(parts) >= 3 and parts[-3] == "document-skills":
            names.add(parts[-2])
        for name in names:
            mapping.setdefault(name, path)
    return mapping


def after_frontmatter(text: str) -> int:
    lines = text.splitlines()
    if lines and lines[0].strip() == "---":
        for idx in range(1, min(len(lines), 40)):
            if lines[idx].strip() == "---":
                return idx + 1
    return 0


def inject_description(text: str, injection: str) -> str:
    lines = text.splitlines()
    for idx, line in enumerate(lines[:25]):
        if line.strip().startswith("description:"):
            lines[idx] = f"{line.rstrip()} {injection.strip()}"
            return "\n".join(lines)
    insert_at = after_frontmatter(text)
    lines.insert(insert_at, injection.strip())
    return "\n".join(lines)


def inject_line(text: str, line_num: int | None, injection: str, prefix: str = "") -> str:
    lines = text.splitlines()
    if not line_num:
        line_num = after_frontmatter(text) + 1
    idx = max(0, min(len(lines), line_num - 1))
    lines.insert(idx, f"{prefix}{injection}".rstrip())
    return "\n".join(lines)


def import_skill_inject(raw_dir: Path) -> list[dict]:
    root = raw_dir / "skill-inject" / "data"
    skill_root = root / "skills"
    skills = skill_paths(skill_root)
    rows: list[dict] = []
    seen_clean: set[Path] = set()

    for name, path in sorted(skills.items()):
        if path in seen_clean:
            continue
        seen_clean.add(path)
        text = path.read_text(errors="replace")
        skill_name = path.parent.name
        rows.append(
            row(
                row_id=f"skillinject-clean-{slug(skill_name)}",
                text=text,
                label="clean",
                style="skill_inject_clean",
                source="Skill-Inject",
                pair_id=f"skillinject-clean-{slug(skill_name)}",
                split_group=f"skillinject:{slug(skill_name)}",
                source_type="public_dataset",
                notes="Original clean SKILL.md from aisa-group/skill-inject; inert text only.",
                carrier="SKILL.md",
            )
        )

    specs = [
        ("contextual_injections.json", "skill_inject_contextual"),
        ("obvious_injections.json", "skill_inject_obvious"),
        ("obvious_injections_direct.json", "skill_inject_direct"),
        ("obvious_injections_byline.json", "skill_inject_byline"),
    ]
    emitted: set[tuple[str, str, str, str]] = set()
    for file_name, style in specs:
        path = root / file_name
        if not path.exists():
            continue
        injections = read_json(path)
        if not isinstance(injections, list):
            continue
        for item in injections:
            if not isinstance(item, dict):
                continue
            instructions = item.get("instructions") if isinstance(item.get("instructions"), dict) else {}
            desc = str(instructions.get("description_injection") or "").strip()
            line = str(instructions.get("line_injection") or "").strip()
            tasks = item.get("tasks") if isinstance(item.get("tasks"), list) else []
            for task_idx, task in enumerate(tasks):
                if not isinstance(task, dict):
                    continue
                skill_name = str(task.get("skill") or "")
                skill_path = skills.get(skill_name)
                if not skill_path:
                    continue
                base = skill_path.read_text(errors="replace")
                injection_id = slug(item.get("id"))
                task_key = f"{slug(skill_name)}-{task_idx}"
                prefix = str(task.get("injection_prefix") or "")
                line_num = task.get("line_num") if isinstance(task.get("line_num"), int) else None
                review_metadata = metadata_for_skillinject(file_name, injection_id)
                family = review_metadata["family"] if review_metadata else None
                if desc:
                    key = (file_name, injection_id, task_key, "description")
                    if key not in emitted:
                        emitted.add(key)
                        rows.append(
                            row(
                                row_id=f"skillinject-{slug(style)}-{injection_id}-{task_key}-desc",
                                text=inject_description(base, desc),
                                label="poisoned",
                                style=f"{style}_description",
                                source=f"Skill-Inject:{file_name}",
                                pair_id=f"skillinject-{injection_id}-{task_key}",
                                split_group=f"skillinject:{slug(skill_name)}:{injection_id}",
                                source_type="public_dataset",
                                notes="Poisoned SKILL.md constructed by inserting the dataset description_injection; no source code executed.",
                                family=family,
                                carrier="SKILL.md",
                            )
                        )
                if line:
                    key = (file_name, injection_id, task_key, "line")
                    if key not in emitted:
                        emitted.add(key)
                        rows.append(
                            row(
                                row_id=f"skillinject-{slug(style)}-{injection_id}-{task_key}-line",
                                text=inject_line(base, line_num, line, prefix),
                                label="poisoned",
                                style=f"{style}_line",
                                source=f"Skill-Inject:{file_name}",
                                pair_id=f"skillinject-{injection_id}-{task_key}",
                                split_group=f"skillinject:{slug(skill_name)}:{injection_id}",
                                source_type="public_dataset",
                                notes="Poisoned SKILL.md constructed by inserting the dataset line_injection at the task line; no source code executed.",
                                family=family,
                                carrier="SKILL.md",
                            )
                        )
    return rows


def import_bipia(raw_dir: Path) -> list[dict]:
    root = raw_dir / "BIPIA" / "benchmark"
    rows: list[dict] = []
    for attack_file in sorted(root.glob("*attack*.json")):
        data = read_json(attack_file)
        if not isinstance(data, dict):
            continue
        for category, attacks in data.items():
            if not isinstance(attacks, list):
                continue
            for idx, attack in enumerate(attacks):
                if not isinstance(attack, str) or not attack.strip():
                    continue
                carrier_text = (
                    "External instruction carrier from BIPIA benchmark:\n"
                    f"{attack.strip()}"
                )
                rows.append(
                    row(
                        row_id=f"bipia-{attack_file.stem}-{slug(category)}-{idx}",
                        text=carrier_text,
                        label="poisoned",
                        style=f"bipia_{attack_file.stem}",
                        source=f"BIPIA:{attack_file.name}",
                        pair_id=f"bipia-{attack_file.stem}-{slug(category)}-{idx}",
                        split_group=f"bipia:{attack_file.stem}:{slug(category)}",
                        source_type="public_dataset",
                        notes="BIPIA attack instruction text imported as ordinary indirect prompt-injection payload.",
                        carrier="external_context",
                    )
                )

    for domain in ("code", "email", "table"):
        for split in ("train", "test"):
            path = root / domain / f"{split}.jsonl"
            if not path.exists():
                continue
            with path.open() as handle:
                for idx, line in enumerate(handle):
                    try:
                        item = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    context = item.get("context")
                    if isinstance(context, list):
                        context = "\n".join(str(part) for part in context)
                    if not isinstance(context, str) or not context.strip():
                        continue
                    question = item.get("question")
                    text = context if not question else f"{context}\n\nQuestion: {question}"
                    rows.append(
                        row(
                            row_id=f"bipia-clean-{domain}-{split}-{idx}",
                            text=text,
                            label="clean",
                            style=f"bipia_clean_{domain}",
                            source=f"BIPIA:{domain}/{split}.jsonl",
                            pair_id=f"bipia-clean-{domain}-{split}-{idx}",
                            split_group=f"bipia:{domain}:{split}",
                            source_type="public_dataset",
                            notes="Original BIPIA task context imported as clean ordinary external context.",
                            carrier="external_context",
                        )
                    )
    return rows


def import_masb_content(raw_dir: Path) -> list[dict]:
    path = raw_dir / MASB_CONTENT_FILE
    if not path.exists():
        return []
    data = read_json(path)
    if not isinstance(data, list):
        return []

    rows: list[dict] = []
    counts = {"safe": 0, "suspicious": 0}
    for item in data:
        if not isinstance(item, dict):
            continue
        classification = str(item.get("classification") or "").strip().lower()
        if classification not in {"safe", "suspicious"}:
            continue
        content = item.get("content")
        if not isinstance(content, str) or not content.strip():
            continue
        counts[classification] += 1
        label = "clean" if classification == "safe" else "poisoned"
        style = "masb_content_safe" if classification == "safe" else "masb_content_suspicious_candidate"
        skill_name = str(item.get("skill_name") or "")
        repo = str(item.get("repo") or "")
        source = str(item.get("source") or "")
        file_list = item.get("files") if isinstance(item.get("files"), list) else []
        notes = (
            "Actual public skill package text fetched from MaliciousAgentSkillsBench URL; inert text only."
            if classification == "safe"
            else (
                "Actual public skill package text from a statically flagged MASB suspicious candidate. "
                "This is a weak poisoned label, not behaviorally confirmed malicious ground truth."
            )
        )
        if file_list:
            notes = f"{notes} Files: {', '.join(str(name) for name in file_list[:8])}."
        rows.append(
            row(
                row_id=f"masb-content-{slug(classification)}-{counts[classification]}-{slug(repo)}-{slug(skill_name)}",
                text=content,
                label=label,
                style=style,
                source="ProtectSkills/MaliciousAgentSkillsBench:content",
                pair_id=f"masb-content-{slug(source)}-{slug(repo)}-{slug(skill_name)}",
                split_group=f"masb-content:{slug(source)}:{slug(classification)}",
                source_type="public_dataset",
                notes=notes,
                family=family_from_text(content),
                carrier="skill_package_text",
            )
        )
    return rows


def import_masb_metadata(raw_dir: Path, max_safe: int | None = 0, max_suspicious: int | None = 0) -> list[dict]:
    root = raw_dir / "MaliciousAgentSkillsBench" / "data"
    skills_path = root / "skills_dataset.csv"
    malicious_path = root / "malicious_skills.csv"
    rows: list[dict] = []
    malicious_patterns: dict[tuple[str, str, str], str] = {}
    if malicious_path.exists():
        with malicious_path.open(newline="") as handle:
            for item in csv.DictReader(handle):
                key = (item.get("source", ""), item.get("repo", ""), item.get("skill_name", ""))
                malicious_patterns[key] = item.get("Pattern", "")

    counts = {"safe": 0, "suspicious": 0, "malicious": 0}
    with skills_path.open(newline="") as handle:
        for item in csv.DictReader(handle):
            classification = str(item.get("classification") or "").strip().lower()
            if classification not in counts:
                continue
            if classification == "safe" and max_safe is not None and counts["safe"] >= max_safe:
                continue
            if classification == "suspicious" and max_suspicious is not None and counts["suspicious"] >= max_suspicious:
                continue
            label = "poisoned" if classification in {"malicious", "suspicious"} else "clean"
            key = (item.get("source", ""), item.get("repo", ""), item.get("skill_name", ""))
            pattern = malicious_patterns.get(key, "")
            text_parts = [
                f"Agent skill name: {item.get('skill_name', '')}.",
                f"Registry source: {item.get('source', '')}.",
                f"Repository reference: {item.get('repo', '')}.",
            ]
            if pattern:
                text_parts.append(f"Observed security pattern summary: {pattern}.")
            text = " ".join(text_parts)
            counts[classification] += 1
            rows.append(
                row(
                    row_id=f"masb-metadata-{slug(classification)}-{counts[classification]}-{slug(item.get('skill_name'))}",
                    text=text,
                    label=label,
                    style=f"masb_metadata_{classification}",
                    source="ProtectSkills/MaliciousAgentSkillsBench",
                    pair_id=f"masb-metadata-{slug(item.get('source'))}-{slug(item.get('repo'))}-{slug(item.get('skill_name'))}",
                    split_group=f"masb:{slug(item.get('source'))}:{slug(classification)}",
                    source_type="public_dataset",
                    notes=(
                        "Metadata-only row from MaliciousAgentSkillsBench CSV. "
                        "Confirmed malicious URLs are redacted in the public release; suspicious metadata is weak-label only. "
                        "This should not be treated as final MASB benchmark truth."
                    ),
                    family=family_from_text(pattern or str(item.get("skill_name") or "")),
                    carrier="skill_metadata",
                )
            )
    return rows


def dedupe_rows(rows: Iterable[dict]) -> list[dict]:
    seen: set[tuple[str, str, str]] = set()
    out: list[dict] = []
    for item in rows:
        key = (item["style"], item["label"], re.sub(r"\s+", " ", item["text"].strip().lower()))
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", type=Path, default=DEFAULT_RAW_DIR)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--max-masb-safe", type=int, default=0)
    parser.add_argument("--max-masb-suspicious", type=int, default=0)
    args = parser.parse_args()

    rows = []
    rows.extend(import_skill_inject(args.raw_dir))
    rows.extend(import_bipia(args.raw_dir))
    rows.extend(import_masb_content(args.raw_dir))
    rows.extend(import_masb_metadata(args.raw_dir, args.max_masb_safe, args.max_masb_suspicious))
    rows = dedupe_rows(rows)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n")

    by_style: dict[str, dict[str, int]] = {}
    for item in rows:
        bucket = by_style.setdefault(item["style"], {"clean": 0, "poisoned": 0})
        bucket[item["label"]] = bucket.get(item["label"], 0) + 1
    print(json.dumps({"out": str(args.out), "rows": len(rows), "styles": by_style}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

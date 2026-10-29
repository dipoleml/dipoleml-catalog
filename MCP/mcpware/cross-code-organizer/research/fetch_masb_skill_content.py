#!/usr/bin/env python3
"""Fetch public MASB skill package text without executing downloaded code.

The MaliciousAgentSkillsBench release redacts confirmed-malicious repository
URLs. This fetcher only downloads non-redacted public GitHub archive URLs and
extracts inert text from skill directories inside the ZIP archives.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request
import zipfile
from collections import Counter, defaultdict
from pathlib import Path, PurePosixPath
from typing import Iterable


RESEARCH_DIR = Path(__file__).resolve().parent
DEFAULT_RAW_DIR = RESEARCH_DIR / "datasets" / "external_raw"
DEFAULT_CSV = DEFAULT_RAW_DIR / "MaliciousAgentSkillsBench" / "data" / "skills_dataset.csv"
DEFAULT_ZIP_DIR = DEFAULT_RAW_DIR / "masb_zips"
DEFAULT_OUT = DEFAULT_RAW_DIR / "masb_skill_content_v0.json"

SKILL_INDICATORS = {"SKILL.md", "skill.md", "skill.json", "api.json", "tool.json"}
TEXT_SUFFIXES = {
    ".md",
    ".txt",
    ".json",
    ".jsonl",
    ".yaml",
    ".yml",
    ".toml",
    ".py",
    ".js",
    ".mjs",
    ".ts",
    ".tsx",
    ".sh",
}


def slug(value: object) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(value).strip().lower()).strip("-")


def is_public_github_zip(url: str) -> bool:
    return url.startswith("https://github.com/") and url.endswith(".zip")


def safe_zip_members(names: Iterable[str]) -> bool:
    for name in names:
        path = PurePosixPath(name)
        if path.is_absolute() or ".." in path.parts:
            return False
    return True


def cache_path_for_url(url: str, zip_dir: Path) -> Path:
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:20]
    return zip_dir / f"{digest}.zip"


def download_zip(url: str, zip_dir: Path, timeout: int, max_archive_mb: int) -> tuple[Path | None, str]:
    zip_dir.mkdir(parents=True, exist_ok=True)
    path = cache_path_for_url(url, zip_dir)
    max_bytes = max_archive_mb * 1024 * 1024

    if path.exists() and path.stat().st_size > 0:
        try:
            if zipfile.is_zipfile(path) and path.stat().st_size <= max_bytes:
                return path, "cached"
        except OSError:
            pass
        path.unlink(missing_ok=True)

    headers = {"User-Agent": "cco-activation-scanner-research/0.1"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            total = 0
            with path.open("wb") as handle:
                while True:
                    chunk = response.read(1024 * 256)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > max_bytes:
                        handle.close()
                        path.unlink(missing_ok=True)
                        return None, f"too_large>{max_archive_mb}MB"
                    handle.write(chunk)
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        path.unlink(missing_ok=True)
        return None, f"download_error:{type(exc).__name__}"

    if not zipfile.is_zipfile(path):
        path.unlink(missing_ok=True)
        return None, "not_zip"
    return path, "downloaded"


def frontmatter_name(text: str) -> str | None:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    for line in lines[1:40]:
        if line.strip() == "---":
            break
        if line.strip().startswith("name:"):
            return line.split(":", 1)[1].strip().strip("\"'")
    return None


def find_skill_dirs(zip_ref: zipfile.ZipFile) -> dict[str, list[str]]:
    by_dir: dict[str, list[str]] = defaultdict(list)
    names = zip_ref.namelist()
    for name in names:
        base = PurePosixPath(name).name
        if base in SKILL_INDICATORS:
            skill_dir = str(PurePosixPath(name).parent)
            by_dir[skill_dir].append(name)
    return by_dir


def score_skill_dir(skill_name: str, skill_dir: str, indicator_paths: list[str], zip_ref: zipfile.ZipFile) -> int:
    target = slug(skill_name)
    parts = [slug(part) for part in PurePosixPath(skill_dir).parts]
    score = 0
    if parts and parts[-1] == target:
        score += 100
    if target in parts:
        score += 50
    for path in indicator_paths:
        try:
            text = zip_ref.read(path, pwd=None).decode("utf-8", "replace")
        except Exception:
            continue
        name = frontmatter_name(text)
        if name and slug(name) == target:
            score += 120
        if re.search(rf"\b{re.escape(skill_name)}\b", text, re.IGNORECASE):
            score += 10
    return score


def read_skill_content(
    zip_path: Path,
    skill_name: str,
    *,
    max_files_per_skill: int,
    max_bytes_per_file: int,
    max_total_chars: int,
) -> tuple[str | None, list[str], str]:
    try:
        with zipfile.ZipFile(zip_path) as zip_ref:
            names = zip_ref.namelist()
            if not safe_zip_members(names):
                return None, [], "unsafe_zip_member"
            skill_dirs = find_skill_dirs(zip_ref)
            if not skill_dirs:
                return None, [], "no_skill_dirs"

            scored = [
                (score_skill_dir(skill_name, skill_dir, paths, zip_ref), skill_dir)
                for skill_dir, paths in skill_dirs.items()
            ]
            scored = [(score, skill_dir) for score, skill_dir in scored if score > 0]
            if not scored:
                return None, [], "skill_not_found"
            scored.sort(reverse=True)
            skill_dir = scored[0][1]
            prefix = f"{skill_dir}/"

            selected = []
            for name in names:
                path = PurePosixPath(name)
                if name.endswith("/") or not name.startswith(prefix):
                    continue
                if path.name.startswith("."):
                    continue
                if path.name in SKILL_INDICATORS or path.suffix.lower() in TEXT_SUFFIXES:
                    selected.append(name)
            selected = selected[:max_files_per_skill]

            chunks = []
            files = []
            total_chars = 0
            for name in selected:
                info = zip_ref.getinfo(name)
                if info.file_size > max_bytes_per_file:
                    continue
                try:
                    text = zip_ref.read(name).decode("utf-8", "replace")
                except Exception:
                    continue
                rel = str(PurePosixPath(name).relative_to(PurePosixPath(skill_dir)))
                files.append(rel)
                block = f"### {rel}\n{text.strip()}"
                remaining = max_total_chars - total_chars
                if remaining <= 0:
                    break
                if len(block) > remaining:
                    block = block[:remaining]
                chunks.append(block)
                total_chars += len(block)

            if not chunks:
                return None, files, "no_readable_text"
            return "\n\n".join(chunks).strip(), files, "ok"
    except zipfile.BadZipFile:
        return None, [], "bad_zip"
    except OSError as exc:
        return None, [], f"read_error:{type(exc).__name__}"


def load_rows(csv_path: Path) -> list[dict]:
    with csv_path.open(newline="") as handle:
        return list(csv.DictReader(handle))


def choose_rows(rows: list[dict], max_safe: int, max_suspicious: int) -> list[dict]:
    chosen = []
    counts = Counter()
    for item in rows:
        classification = str(item.get("classification") or "").strip().lower()
        url = str(item.get("url") or "")
        if not is_public_github_zip(url):
            continue
        if classification == "safe" and counts["safe"] < max_safe:
            chosen.append(item)
            counts["safe"] += 1
        elif classification == "suspicious" and counts["suspicious"] < max_suspicious:
            chosen.append(item)
            counts["suspicious"] += 1
        if counts["safe"] >= max_safe and counts["suspicious"] >= max_suspicious:
            break
    return chosen


def write_json(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--zip-dir", type=Path, default=DEFAULT_ZIP_DIR)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--max-safe", type=int, default=500)
    parser.add_argument("--max-suspicious", type=int, default=500)
    parser.add_argument("--max-urls", type=int, default=None, help="Optional cap on unique GitHub archive URLs.")
    parser.add_argument("--timeout", type=int, default=45)
    parser.add_argument("--max-archive-mb", type=int, default=30)
    parser.add_argument("--max-files-per-skill", type=int, default=12)
    parser.add_argument("--max-bytes-per-file", type=int, default=80_000)
    parser.add_argument("--max-total-chars", type=int, default=60_000)
    parser.add_argument("--progress-every", type=int, default=10, help="Print progress every N unique URLs.")
    parser.add_argument("--partial-out", type=Path, default=None, help="Optional partial JSON output updated on progress.")
    args = parser.parse_args()
    if args.max_urls is not None and args.max_urls < 1:
        parser.error("--max-urls must be positive when set")
    if args.progress_every < 1:
        parser.error("--progress-every must be positive")

    source_rows = load_rows(args.csv)
    chosen = choose_rows(source_rows, args.max_safe, args.max_suspicious)
    by_url: dict[str, list[dict]] = defaultdict(list)
    for item in chosen:
        by_url[item["url"]].append(item)
    url_items = list(by_url.items())
    if args.max_urls is not None:
        url_items = url_items[: args.max_urls]

    output_rows = []
    stats = Counter()
    for index, (url, items) in enumerate(url_items, start=1):
        zip_path, download_status = download_zip(url, args.zip_dir, args.timeout, args.max_archive_mb)
        stats[f"download:{download_status}"] += 1
        if index % args.progress_every == 0:
            print(
                f"processed_urls={index}/{len(url_items)} content_rows={len(output_rows)}",
                file=sys.stderr,
            )
            if args.partial_out is not None:
                write_json(args.partial_out, output_rows)
        if zip_path is None:
            for item in items:
                stats[f"content:{download_status}"] += 1
            continue

        for item in items:
            content, files, status = read_skill_content(
                zip_path,
                str(item.get("skill_name") or ""),
                max_files_per_skill=args.max_files_per_skill,
                max_bytes_per_file=args.max_bytes_per_file,
                max_total_chars=args.max_total_chars,
            )
            stats[f"content:{status}"] += 1
            if not content:
                continue
            output_rows.append(
                {
                    "source": item.get("source", ""),
                    "repo": item.get("repo", ""),
                    "skill_name": item.get("skill_name", ""),
                    "classification": item.get("classification", ""),
                    "url": url,
                    "content": content,
                    "files": files,
                    "download_status": download_status,
                    "content_status": status,
                }
            )

    write_json(args.out, output_rows)
    print(
        json.dumps(
            {
                "out": str(args.out),
                "candidate_rows": len(chosen),
                "unique_urls": len(url_items),
                "available_unique_urls": len(by_url),
                "content_rows": len(output_rows),
                "stats": dict(sorted(stats.items())),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

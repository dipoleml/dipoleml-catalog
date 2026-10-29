#!/usr/bin/env python3
"""Lightweight validator for SKILL.md files in this repo."""

from __future__ import annotations

import pathlib
import re
import sys

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None

MAX_DESCRIPTION_LENGTH = 1024
MAX_SKILL_CONTENT_CHARS = 100_000


def validate(path: pathlib.Path) -> list[str]:
    errors: list[str] = []
    content = path.read_text(encoding="utf-8")

    if not content.startswith("---"):
        errors.append("frontmatter must start at byte 0 with ---")
        return errors

    match = re.search(r"\n---\s*\n", content[3:])
    if not match:
        errors.append("frontmatter must close with a line containing ---")
        return errors

    fm_text = content[3 : match.start() + 3]
    body = content[match.end() + 3 :].strip()

    if len(content) > MAX_SKILL_CONTENT_CHARS:
        errors.append(f"file too large: {len(content)} chars > {MAX_SKILL_CONTENT_CHARS}")

    if not body:
        errors.append("body is empty")

    if yaml is None:
        errors.append("PyYAML is not installed; cannot parse frontmatter")
        return errors

    try:
        fm = yaml.safe_load(fm_text)
    except Exception as exc:  # noqa: BLE001
        errors.append(f"frontmatter YAML parse failed: {exc}")
        return errors

    if not isinstance(fm, dict):
        errors.append("frontmatter must parse to a mapping")
        return errors

    if not fm.get("name"):
        errors.append("frontmatter missing name")
    if not fm.get("description"):
        errors.append("frontmatter missing description")
    elif len(str(fm["description"])) > MAX_DESCRIPTION_LENGTH:
        errors.append("description exceeds 1024 chars")

    return errors


def main() -> int:
    paths = [pathlib.Path(arg) for arg in sys.argv[1:]]
    if not paths:
        paths = sorted(pathlib.Path(".").glob("skills/**/SKILL.md"))

    failed = False
    for path in paths:
        errors = validate(path)
        if errors:
            failed = True
            print(f"FAIL {path}")
            for error in errors:
                print(f"  - {error}")
        else:
            print(f"OK   {path}")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

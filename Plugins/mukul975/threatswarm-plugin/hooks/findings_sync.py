#!/usr/bin/env python3
"""
Stop hook: aggregates CRITICAL/HIGH findings from evidence/ to FINDINGS_SUMMARY.md
at the end of each Claude Code session.

Triggered by the Stop event in settings.json.
"""

import json
import sys
import os
import re
from datetime import datetime, timezone
from pathlib import Path


def load_stdin() -> dict:
    """Load JSON from stdin; return empty dict on failure."""
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            return {}
        return json.loads(raw)
    except (json.JSONDecodeError, EOFError, ValueError):
        return {}


def scan_findings_file(findings_file: Path, today) -> tuple:
    """
    Scan a findings.md file for CRITICAL and HIGH entries.
    Returns (critical_lines, high_lines).
    Only processes files modified today (UTC).
    """
    try:
        mtime = datetime.fromtimestamp(findings_file.stat().st_mtime, tz=timezone.utc).date()
        if mtime != today:
            return [], []

        content = findings_file.read_text(encoding='utf-8', errors='ignore')
        critical_lines = []
        high_lines = []

        for line in content.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            if re.search(r'\bCRITICAL\b', stripped, re.IGNORECASE):
                critical_lines.append(f"[CRITICAL] {stripped} (src: {findings_file})")
            elif re.search(r'\bHIGH\b', stripped, re.IGNORECASE):
                high_lines.append(f"[HIGH] {stripped} (src: {findings_file})")

        return critical_lines, high_lines

    except (OSError, PermissionError):
        return [], []


def main():
    data = load_stdin()
    # data may contain session_id and stop_hook context — not required for our logic

    evidence_dir = Path(os.environ.get('EVIDENCE_DIR', './evidence'))

    if not evidence_dir.exists():
        print("[findings_sync] evidence/ directory not found — skipping sync")
        sys.exit(0)

    today = datetime.now(timezone.utc).date()
    all_critical = []
    all_high = []

    # Walk all findings files modified today
    # Match: findings.md, *_findings.md, web_findings.md, ad_findings.md, etc.
    patterns = [
        '*findings*.md',
        '*_report.md',
        'exploitation.md',
        'post_ex.md',
    ]

    summary_file = evidence_dir / 'FINDINGS_SUMMARY.md'
    seen_files = set()
    for pattern in patterns:
        for findings_file in evidence_dir.rglob(pattern):
            if findings_file in seen_files:
                continue
            # Never scan the summary file itself — prevents exponential self-reference
            if findings_file.resolve() == summary_file.resolve():
                continue
            seen_files.add(findings_file)
            crits, highs = scan_findings_file(findings_file, today)
            all_critical.extend(crits)
            all_high.extend(highs)

    total = len(all_critical) + len(all_high)

    if total == 0:
        print(f"[findings_sync] Session complete — no new CRITICAL/HIGH findings today ({today})")
        sys.exit(0)

    # Deduplicate
    all_critical = list(dict.fromkeys(all_critical))
    all_high = list(dict.fromkeys(all_high))

    # Write / append to FINDINGS_SUMMARY.md
    timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    try:
        with open(summary_file, 'a', encoding='utf-8') as f:
            f.write(f"\n\n## Session {timestamp}\n\n")
            if all_critical:
                f.write(f"### Critical ({len(all_critical)})\n\n")
                for line in all_critical:
                    f.write(f"- {line}\n")
            if all_high:
                f.write(f"\n### High ({len(all_high)})\n\n")
                for line in all_high:
                    f.write(f"- {line}\n")
    except (OSError, PermissionError) as e:
        print(f"[findings_sync] Failed to write summary: {e}", file=sys.stderr)
        sys.exit(1)

    print(
        f"[findings_sync] Session {timestamp}: "
        f"{total} findings logged "
        f"({len(all_critical)} critical, {len(all_high)} high) "
        f"-> {summary_file}"
    )
    sys.exit(0)


if __name__ == '__main__':
    main()

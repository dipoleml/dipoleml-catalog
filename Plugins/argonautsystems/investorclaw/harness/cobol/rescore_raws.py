# SPDX-License-Identifier: Apache-2.0
"""Re-score saved battery raw outputs into a (consultant × narrator) matrix.

Reads results/raw/<consultant>__<provider>__<prompt_id>.txt produced by
provider_battery.py and re-applies the scorer offline — so scoring fixes don't
require re-running the ~260s engine pipeline. Builds a per-cell summary:
pass-rate, mean hallucinations, narration coverage.

    python3 rescore_raws.py --raw ~/ic-phase2/results/raw \
        --envelope <cache/envelope.*.json> --prompts nlq-subset.json
"""
from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

from provider_battery import (
    extract_narrative, grounded_values, score_hallucination, route_ok,
)

HMAC_RE = re.compile(r"hmac['\"]?\s*[:=]\s*['\"]?[0-9a-f]{16,}", re.I)
HEURISTIC_MARKERS = ("heuristic fallback", "I have holdings summary data in the envelope")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True, type=Path)
    ap.add_argument("--envelope", required=True, type=Path)
    ap.add_argument("--prompts", required=True, type=Path)
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()

    envelope = json.loads(args.envelope.read_text())
    gsorted, tickers = grounded_values(envelope)
    prompts = {p["id"]: p for p in json.loads(args.prompts.read_text())["prompts"]}

    cells: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for f in sorted(args.raw.glob("*.txt")):
        parts = f.stem.split("__")
        if len(parts) != 3:
            continue
        consultant, provider, pid = parts
        out = f.read_text()
        if not out.strip():
            cells[(consultant, provider)].append({"id": pid, "pass": False, "src": "timeout"})
            continue
        p = prompts.get(pid, {"intent": pid, "expected_routes": {}})
        answer = extract_narrative(out)
        hmac_valid = bool(HMAC_RE.search(out))
        src = "heuristic" if any(m in out for m in HEURISTIC_MARKERS) else "llm"
        halluc, examples = score_hallucination(answer, gsorted, tickers)
        expected = p["expected_routes"].get("investorclaw", [])
        r_ok = route_ok(p["intent"], expected, answer)
        is_deflect = any(e == "DEFLECT_OK" for e in expected)
        passed = bool(r_ok and halluc == 0 and (hmac_valid or is_deflect))
        cells[(consultant, provider)].append({
            "id": pid, "pass": passed, "hmac": hmac_valid, "route": r_ok,
            "src": src, "halluc": halluc, "ungrounded": examples,
        })

    matrix = {}
    print(f"{'consultant':<16} {'narrator':<12} {'pass':>7} {'llm':>5} {'halluc':>7}")
    print("-" * 52)
    for (cons, prov), rows in sorted(cells.items()):
        done = [r for r in rows if r["src"] != "timeout"]
        npass = sum(r["pass"] for r in rows)
        nllm = sum(r.get("src") == "llm" for r in rows)
        mh = round(sum(r.get("halluc", 0) for r in done) / max(len(done), 1), 1)
        matrix[f"{cons}/{prov}"] = {
            "pass": f"{npass}/{len(rows)}", "narrated_llm": f"{nllm}/{len(rows)}",
            "mean_halluc": mh, "rows": rows,
        }
        print(f"{cons:<16} {prov:<12} {npass:>3}/{len(rows):<3} {nllm:>3}/{len(rows):<2} {mh:>7}")

    out_path = args.out or (args.raw.parent / "matrix.json")
    out_path.write_text(json.dumps(matrix, indent=2))
    print(f"\nmatrix -> {out_path}")


if __name__ == "__main__":
    main()

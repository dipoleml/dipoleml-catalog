#!/usr/bin/env python3
"""
Token cost benchmark: compares 3 context injection strategies over N queries.

Answers Jeandro Couto's question: does OKF hook injection benefit from
prompt caching the same way as CLAUDE.md + additionalDirectories?

Strategies:
  system-static   — context in system prompt, no explicit cache_control
                    (simulates CLAUDE.md / additionalDirectories)
  system-cached   — same, but with explicit cache_control: ephemeral
                    (OKF hook optimal — maximum caching)
  user-injection  — context prepended to each user message
                    (worst case / naive implementation)

Run:
  cd benchmarks
  .venv/bin/python token-cost-bench.py
"""
import os, sys, json
from pathlib import Path

try:
    import anthropic
except ImportError:
    sys.exit("Run: cd benchmarks && .venv/bin/pip install anthropic")

_PROMPT_CONTEXT = (Path(__file__).parent / "prompts" / "mega-brain.txt").read_text().replace("{{question}}", "").strip()

# Realistic OKF context: concatenate all sample-lore files + simulate 15 extra tables/metrics
# to exceed Anthropic's 1024-token minimum for prompt caching.
_LORE_DIR = Path(__file__).parent / "fixtures" / "sample-lore"
_raw_files = "\n\n".join(p.read_text() for p in sorted(_LORE_DIR.rglob("*.md"))) if _LORE_DIR.exists() else ""

# ponytail: synthetic padding simulates a realistic 50-table OKF knowledge base
# (needs >~2500 tokens to exceed Haiku 4.5's prompt-cache minimum)
_EXTRA_TABLES = "\n\n".join(f"""---
name: table_{i}
type: BigQuery Table
description: Stores transactional records for domain area {i} — payments, events, and state transitions.
---
`project.dataset.table_{i}` — Operational ledger for domain {i}.

Columns:
  - id STRING — Primary key, UUID v4
  - created_at TIMESTAMP — UTC creation timestamp; partition key
  - updated_at TIMESTAMP — Last mutation time
  - user_id STRING — FK → users.user_id
  - account_id STRING — FK → accounts.account_id
  - value_cents INT64 — Monetary amount in cents, never negative
  - currency STRING — ISO 4217 code (BRL, USD, CLP…)
  - status STRING — Lifecycle: pending / confirmed / failed / refunded / archived
  - source STRING — Originating system: mobile_app / web / api / batch
  - metadata JSON — Arbitrary key-value pairs, schema-free
  - region STRING — GCP region where record originated

Join patterns:
  - INNER JOIN users ON table_{i}.user_id = users.user_id
  - LEFT JOIN accounts ON table_{i}.account_id = accounts.account_id
  - LEFT JOIN refunds_{i} ON table_{i}.id = refunds_{i}.parent_id

Partition by created_at (daily). Cluster by user_id, status.
Typical size: ~{i * 10}M rows, ~{i * 2}GB compressed.
SLO: 99.9% query latency < 2s for single-day partition scans.""" for i in range(1, 20))

CONTEXT = f"{_PROMPT_CONTEXT}\n\n{_raw_files}\n\n{_EXTRA_TABLES}"

QUESTIONS = [
    "What column stores the order amount in the orders table, and what data type is it?",
    "What email domain is excluded from the WAU metric?",
    "What column is deducted when calculating net_revenue?",
    "What value of status indicates a finished order?",
    "What was the most recent addition to the knowledge base?",
    "What column links the orders table to the customers table?",
]

MODEL = "claude-haiku-4-5-20251001"
# Haiku 4.5 pricing per million tokens (USD)
PRICE = {"input": 0.80, "cache_create": 1.00, "cache_read": 0.08, "output": 4.00}

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def cost(u):
    inp = getattr(u, "input_tokens", 0)
    cc  = getattr(u, "cache_creation_input_tokens", 0)
    cr  = getattr(u, "cache_read_input_tokens", 0)
    out = getattr(u, "output_tokens", 0)
    usd = (inp * PRICE["input"] + cc * PRICE["cache_create"] +
           cr * PRICE["cache_read"] + out * PRICE["output"]) / 1_000_000
    return inp, cc, cr, out, usd


def run_system_static(questions):
    rows = []
    for q in questions:
        r = client.messages.create(
            model=MODEL, max_tokens=64,
            system=CONTEXT,
            messages=[{"role": "user", "content": q}],
        )
        rows.append(cost(r.usage))
    return rows


def run_system_cached(questions):
    rows = []
    for q in questions:
        r = client.messages.create(
            model=MODEL, max_tokens=64,
            system=[{"type": "text", "text": CONTEXT,
                     "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": q}],
        )
        rows.append(cost(r.usage))
    return rows


def run_user_injection(questions):
    rows = []
    for q in questions:
        r = client.messages.create(
            model=MODEL, max_tokens=64,
            messages=[{"role": "user", "content": f"{CONTEXT}\n\n{q}"}],
        )
        rows.append(cost(r.usage))
    return rows


CONDITIONS = [
    ("system-static  (CLAUDE.md sim)", run_system_static),
    ("system-cached  (OKF optimal)  ", run_system_cached),
    ("user-injection (naive)        ", run_user_injection),
]


def print_table(label, rows):
    print(f"\n{label}")
    print(f"  {'#':<3} {'input':>7} {'cc':>7} {'cr':>7} {'out':>5} {'USD':>8}  cache?")
    print(f"  {'-'*50}")
    for i, (inp, cc, cr, out, usd) in enumerate(rows, 1):
        cached = "HIT" if cr > 0 else ("MISS" if cc > 0 else "—")
        print(f"  {i:<3} {inp:>7} {cc:>7} {cr:>7} {out:>5} {usd:>8.6f}  {cached}")
    total_usd = sum(r[4] for r in rows)
    print(f"  {'TOTAL':<40} {total_usd:>8.6f}")
    return total_usd


def main():
    print(f"Model: {MODEL}")
    print(f"Context size: ~{len(CONTEXT.split()):,} words / ~{len(CONTEXT)//4:,} tokens (estimated)")
    print(f"Queries: {len(QUESTIONS)}")
    print("\ncc=cache_create cr=cache_read (both save on repeated calls)")

    totals = {}
    results = {}
    for label, runner in CONDITIONS:
        rows = runner(QUESTIONS)
        total = print_table(label, rows)
        totals[label.strip()] = total
        results[label.strip()] = rows

    print("\n" + "="*55)
    print("SUMMARY — total cost across all queries")
    print("-"*55)
    baseline = None
    for label, total in totals.items():
        savings = ""
        if baseline is None:
            baseline = total
        elif baseline > 0:
            pct = (1 - total / baseline) * 100
            tag = f"{pct:.1f}% cheaper" if pct > 0 else f"{-pct:.1f}% more expensive"
            savings = f"  ({tag} than system-static)"
        print(f"  {label:<40} ${total:.6f}{savings}")

    out = Path(__file__).parent / "results" / "token-cost-bench.json"
    out.parent.mkdir(exist_ok=True)
    with open(out, "w") as f:
        json.dump({"totals": totals, "results": {k: v for k, v in results.items()}}, f, indent=2)
    print(f"\nSaved → {out}")


if __name__ == "__main__":
    main()

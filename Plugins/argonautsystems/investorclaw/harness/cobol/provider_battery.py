# SPDX-License-Identifier: Apache-2.0
"""Per-provider COBOL hallucination + routing battery.

Runs the full nlq-prompts.json (30 prompts) through the ic-engine container
ONCE PER GRAEAE PROVIDER, pinning the narrator to that provider via
INVESTORCLAW_NARRATIVE_ENDPOINT/_MODEL/_API_KEY. Scores each (provider, prompt):

  - hmac_valid        ic_result.hmac present (signed deterministic envelope)
  - routing_ok        narrative addresses the prompt's intent (expected verbs/keywords)
  - narration_source  "llm" if the pinned provider produced text, else "heuristic"
                      (empty/failed LLM falls back to the HMAC-grounded restatement)
  - hallucination     numbers/$/tickers in the narrative NOT grounded in the signed
                      envelope sections  →  ungrounded claims = hallucination
  - pass              hmac_valid AND routing_ok AND hallucination == 0

30/30 = all 30 prompts pass for that provider. The signed envelope is the
ground truth: HMAC-grounding is the anti-hallucination mechanism, so a provider
that falls back to the heuristic still scores hallucination=0 (it only restates
signed data) — narration_source distinguishes "narrated" from "fell back".

Usage (on the build host, container image already pulled):
    python3 provider_battery.py --image ghcr.io/argonautsystems/ic-engine:4.5.2-cpu \
        --data ~/ic-phase2/ic-data --keys ~/ic-phase2/provider_keys.env \
        --massive-key $MASSIVE_API_KEY --out ~/ic-phase2/results
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import subprocess
import sys
import time
from pathlib import Path

# provider -> OpenAI-compatible base URL, model, and the env var holding its key
# (env file is `export <NAME>_API_KEY=...`, sourced before this runs).
# Narrator targets (Stage 3). NGC/nvidia dropped — 40 RPM free tier + dev-only
# ToS is unacceptable for a portfolio app and not ours to ship.
PROVIDERS = {
    "together":   ("https://api.together.xyz/v1",                  "meta-llama/Llama-3.3-70B-Instruct-Turbo", "TOGETHER_API_KEY"),
    "groq":       ("https://api.groq.com/openai/v1",               "llama-3.3-70b-versatile",                 "GROQ_API_KEY"),
    "openai":     ("https://api.openai.com/v1",                    "gpt-5.2-chat-latest",                     "OPENAI_API_KEY"),
    "claude":     ("https://api.anthropic.com/v1",                 "claude-sonnet-4-6",                       "ANTHROPIC_API_KEY"),
    "perplexity": ("https://api.perplexity.ai",                    "sonar-pro",                               "PERPLEXITY_API_KEY"),
    "xai":        ("https://api.x.ai/v1",                          "grok-4-1-fast",                           "XAI_API_KEY"),
    "gemini":     ("https://generativelanguage.googleapis.com/v1beta/openai", "gemini-3.1-pro-preview",       "GEMINI_API_KEY"),
    "deepseek":   ("https://api.deepseek.com/v1",                  "deepseek-v4-pro",                         "DEEPSEEK_API_KEY"),
    "siliconflow":("https://api.siliconflow.com/v1",               "deepseek-ai/DeepSeek-V4-Pro",             "SILICONFLOW_API_KEY"),
}

# Consultant options (Stage 2) — fixed per battery run, compresses the stripped
# feed. gemma-4-31B proven; deepseek-v4-flash is the cheap alternative.
CONSULTANTS = {
    "gemma_together":  ("https://api.together.xyz/v1", "google/gemma-4-31B-it",       "TOGETHER_API_KEY"),
    "deepseek_flash":  ("https://api.deepseek.com/v1", "deepseek-v4-flash",           "DEEPSEEK_API_KEY"),
    "llama33_groq":    ("https://api.groq.com/openai/v1", "llama-3.3-70b-versatile",  "GROQ_API_KEY"),
    "gpt52_openai":    ("https://api.openai.com/v1",   "gpt-5.2-chat-latest",         "OPENAI_API_KEY"),
    "claude_sonnet":   ("https://api.anthropic.com/v1", "claude-sonnet-4-6",          "ANTHROPIC_API_KEY"),
    "gemini_google":   ("https://generativelanguage.googleapis.com/v1beta/openai", "gemini-3.1-pro-preview", "GEMINI_API_KEY"),
    "none":            (None, None, None),
}

TICKER_RE = re.compile(r"\b[A-Z]{1,5}\d?\b")           # equities + CME futures roots (ESH7)
MONEY_RE = re.compile(r"\$?\s?(\d[\d,]*\.?\d*)")        # $ amounts / bare numbers
HEURISTIC_MARKERS = ("heuristic fallback", "I have holdings summary data in the envelope")

# stdout lines that are banner/progress noise, not the narrative
_NOISE_PREFIXES = (
    "📦", "Runtime:", "Detection", "openclaw", "zeroclaw", "hermes",
    "git clone", "Changelog:", "Running your portfolio", "Analyst data:",
    "Please wait", "✓", "💡", "⚠️", "🔒", "====", "IMPORTANT:",
    "ic_result.hmac:", "Refresh complete",
)

# Common words that match TICKER_RE but are not tickers — don't flag as hallucinated.
STOPWORD_TOKENS = {
    "I", "A", "THE", "AND", "OR", "OK", "USD", "ETF", "CME", "YTM", "P", "E",
    "YTD", "EOD", "NLQ", "FY", "Q1", "Q2", "Q3", "Q4", "US", "IT", "AS", "AI",
}


_PROGRESS_END_MARKERS = ("Please wait", "Analyst data:", "second time you ask",
                         "respond instantly")
_FOOTER_START = ("ic_result", '{"ic_result', "IMPORTANT:", "====", "Discuss these")


def extract_narrative(out: str) -> str:
    """Isolate the LLM narrative: the block AFTER the last progress/banner line
    and BEFORE the ic_result JSON / disclaimer footer. Avoids scoring stray
    numbers from the upgrade banner + progress messages (e.g. '249/249',
    'v4.7.1', '30-60 seconds') as hallucinations."""
    lines = out.splitlines()
    start = 0
    for i, l in enumerate(lines):
        if any(m in l for m in _PROGRESS_END_MARKERS):
            start = i + 1
    end = len(lines)
    for i in range(start, len(lines)):
        s = lines[i].strip()
        if any(s.startswith(p) or p in s for p in _FOOTER_START):
            end = i
            break
    return "\n".join(lines[start:end]).strip()


def load_envelope(reports_dir: Path) -> dict:
    """Load the freshest cached signed envelope (ground truth)."""
    cache = reports_dir / ".cache"
    envs = sorted(cache.glob("envelope.*.json"), key=lambda p: p.stat().st_mtime)
    if not envs:
        raise FileNotFoundError(f"no cached envelope in {cache}")
    return json.loads(envs[-1].read_text())


def grounded_values(envelope: dict) -> tuple[list[float], set[str]]:
    """Flatten the signed envelope into (sorted unique finite floats, tickers)
    that a narrative may mention without hallucinating. Numbers are matched by
    tolerance later, so full-precision narration (290.6360..) still grounds to
    a rounded envelope value (290.64)."""
    floats: set[float] = set()
    tickers: set[str] = set()

    def walk(o):
        if isinstance(o, dict):
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
        elif isinstance(o, bool):
            return
        elif isinstance(o, (int, float)):
            f = float(o)
            if math.isfinite(f):
                floats.add(f)
        elif isinstance(o, str):
            s = o.strip().upper()
            if TICKER_RE.fullmatch(s):
                tickers.add(s)
            # numeric strings in the envelope ("1728062.22") count as grounded
            try:
                f = float(s.replace(",", "").replace("$", ""))
                if math.isfinite(f):
                    floats.add(f)
            except ValueError:
                pass

    walk(envelope)
    return sorted(floats), tickers


def _is_grounded_num(n: float, gsorted: list[float]) -> bool:
    """True if n matches some grounded float within 1% (or 0.5 absolute)."""
    if not gsorted:
        return False
    import bisect
    i = bisect.bisect_left(gsorted, n)
    for g in gsorted[max(0, i - 1):i + 2]:
        if abs(g - n) <= max(abs(g) * 0.01, 0.5):
            return True
    return False


def score_hallucination(answer: str, gsorted: list[float], tickers: set[str]) -> tuple[int, list[str]]:
    """Count narrative numbers/tickers NOT grounded in the signed envelope.
    Numbers use tolerance matching; 'infinity'/'inf' is allowed (degenerate
    Sharpe). Percent-like small values (<10) are too noisy to score."""
    ungrounded: list[str] = []
    # match tickers in ORIGINAL case — real tickers (KLAC, ESH7) are uppercase
    # in narration; uppercasing the whole answer turns every word ("is","of")
    # into a false ticker. Require 2+ chars to skip stray single capitals.
    for t in set(TICKER_RE.findall(answer)):
        if len(t) < 2 or t in STOPWORD_TOKENS or t in tickers or t.isdigit():
            continue
        ungrounded.append(f"ticker:{t}")
    for m in MONEY_RE.findall(answer):
        raw = m.replace(",", "")
        try:
            f = float(raw)
        except ValueError:
            continue
        if not math.isfinite(f) or abs(f) < 10:
            continue
        if not _is_grounded_num(f, gsorted):
            ungrounded.append(f"num:{raw}")
    return len(ungrounded), ungrounded[:8]


def route_ok(intent: str, expected: list[str], answer: str) -> bool:
    """Did the narrative address the prompt's intent? The engine routes
    deterministically, so this checks the narrative is substantive + on-topic:
    an intent/expected-verb stem appears, or it cites portfolio data. DEFLECT_OK
    prompts must decline."""
    a = answer.lower().strip()
    if len(a) < 25:
        return False
    if any(e == "DEFLECT_OK" for e in expected):
        return any(k in a for k in (
            "educational", "cannot", "out of scope", "not financial advice",
            "don't have", "external", "portfolio-specific", "general", "refresh"))
    stems = set(intent.lower().replace("-", " ").split())
    for e in expected:
        stems.update(t for t in re.split(r"[ _=:]", e.lower()) if len(t) >= 4)
    if any(st[:4] in a for st in stems if len(st) >= 4):
        return True
    return any(w in a for w in (
        "portfolio", "holding", "value", "sharpe", "bond", "return",
        "ratio", "allocat", "sector", "%", "$"))


def run_prompt(image: str, data: Path, massive_key: str, prov: str, prompt: str,
               timeout: int, consultant: str = "none", no_refresh: bool = True) -> tuple[str, str]:
    """Return (stdout, stderr) of one engine `ask` with the narrator pinned to
    `prov` and the consultant (Stage 2) pinned to `consultant`. With
    no_refresh=True the engine loads the cached signed envelope and skips the
    ~200s yfinance/analyst rebuild — only the consultant+narrator LLM calls run."""
    endpoint, model, key_env = PROVIDERS[prov]
    env = os.environ.get(key_env, "")
    cmd = [
        "docker", "run", "--rm",
        "-e", "INVESTORCLAW_PRICE_PROVIDER=massive",
        "-e", f"MASSIVE_API_KEY={massive_key}",
        "-e", "IC_ENGINE_VERSION=4.7.1",
        "-e", "INVESTORCLAW_NARRATIVE_ENABLED=true",
        "-e", f"INVESTORCLAW_NARRATIVE_ENDPOINT={endpoint}",
        "-e", f"INVESTORCLAW_NARRATIVE_MODEL={model}",
        "-e", f"INVESTORCLAW_NARRATIVE_API_KEY={env}",
    ]
    c_ep, c_model, c_key_env = CONSULTANTS.get(consultant, (None, None, None))
    if c_ep:
        cmd += [
            "-e", f"INVESTORCLAW_CONSULTANT_ENDPOINT={c_ep}",
            "-e", f"INVESTORCLAW_CONSULTANT_MODEL={c_model}",
            "-e", f"INVESTORCLAW_CONSULTANT_API_KEY={os.environ.get(c_key_env, '')}",
        ]
    cmd += [
        "-e", "INVESTORCLAW_PORTFOLIO_DIR=/data/portfolios",
        "-e", "IC_PORTFOLIO_DIR=/data/portfolios",
        "-v", f"{data}:/data",
        "--entrypoint", "/opt/ic-engine/.venv/bin/investorclaw",
        image, "ask",
    ]
    if no_refresh:
        cmd.append("--no-refresh")
    cmd.append(prompt)
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return p.stdout, p.stderr
    except subprocess.TimeoutExpired:
        return "", "TIMEOUT"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True)
    ap.add_argument("--data", required=True, type=Path)
    ap.add_argument("--massive-key", required=True)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--prompts", type=Path, default=Path(__file__).with_name("nlq-prompts.json"))
    ap.add_argument("--providers", default=",".join(PROVIDERS))
    ap.add_argument("--consultant", default="none", choices=list(CONSULTANTS))
    ap.add_argument("--timeout", type=int, default=240)
    args = ap.parse_args()
    consultant = args.consultant

    args.out.mkdir(parents=True, exist_ok=True)
    prompts = json.loads(args.prompts.read_text())["prompts"]
    reports = args.data / "reports"

    # ground truth from the signed envelope (warm it first with one full run if absent)
    if not list((reports / ".cache").glob("envelope.*.json")):
        print("warming envelope (cold ~200s, full refresh) ...", flush=True)
        run_prompt(args.image, args.data, args.massive_key, "groq",
                   "What is in my portfolio right now?", max(args.timeout, 300),
                   "none", no_refresh=False)
    envelope = load_envelope(reports)
    gsorted, tickers = grounded_values(envelope)
    raw_dir = args.out / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    print(f"ground truth: {len(gsorted)} numeric values, {len(tickers)} tickers, "
          f"futures_present={bool(envelope.get('sections', {}).get('futures'))}", flush=True)

    summary = {}
    for prov in args.providers.split(","):
        prov = prov.strip()
        if prov not in PROVIDERS:
            continue
        rows = []
        t0 = time.time()
        for p in prompts:
            out, err = run_prompt(args.image, args.data, args.massive_key, prov, p["prompt"], args.timeout, consultant)
            blob = out + "\n" + err
            # save raw stdout for free offline re-scoring
            (raw_dir / f"{consultant}__{prov}__{p['id']}.txt").write_text(out)
            hmac_valid = bool(re.search(r"hmac['\"]?\s*[:=]\s*['\"]?[0-9a-f]{16,}", blob, re.I))
            timed_out = err.strip() == "TIMEOUT"
            source = ("timeout" if timed_out
                      else "heuristic" if any(m in blob for m in HEURISTIC_MARKERS)
                      else "llm")
            answer = extract_narrative(out)
            halluc, examples = score_hallucination(answer, gsorted, tickers)
            expected = p["expected_routes"].get("investorclaw", [])
            r_ok = route_ok(p["intent"], expected, answer)
            is_deflect = any(e == "DEFLECT_OK" for e in expected)
            # deflection answers legitimately carry no envelope hmac
            passed = r_ok and halluc == 0 and (hmac_valid or is_deflect)
            rows.append({
                "id": p["id"], "intent": p["intent"], "pass": passed,
                "hmac_valid": hmac_valid, "routing_ok": r_ok,
                "narration_source": source, "hallucination": halluc,
                "ungrounded": examples,
            })
            print(f"  [{consultant}/{prov}] {p['id']:<22} pass={passed} hmac={hmac_valid} route={r_ok} "
                  f"src={source} halluc={halluc}", flush=True)
        npass = sum(r["pass"] for r in rows)
        nllm = sum(r["narration_source"] == "llm" for r in rows)
        summary[prov] = {
            "score": f"{npass}/{len(rows)}",
            "narrated_by_llm": f"{nllm}/{len(rows)}",
            "hallucinations": sum(r["hallucination"] for r in rows),
            "elapsed_s": int(time.time() - t0),
        }
        (args.out / f"{consultant}__{prov}.json").write_text(json.dumps({"consultant": consultant, "provider": prov, "rows": rows, **summary[prov]}, indent=2))
        print(f"== {prov}: {summary[prov]} ==\n", flush=True)

    (args.out / f"summary__{consultant}.json").write_text(json.dumps({"consultant": consultant, "providers": summary}, indent=2))
    print("=== BATTERY SUMMARY ===")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

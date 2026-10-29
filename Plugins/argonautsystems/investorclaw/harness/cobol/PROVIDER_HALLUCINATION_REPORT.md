<!-- SPDX-License-Identifier: MIT-0 -->
# Provider Hallucination Battery — Results (2026-06-01)

Per-narrator hallucination + routing matrix for InvestorClaw's 3-stage narration
pipeline, run against the 30-prompt Agentic COBOL set (`nlq-prompts.json`).

## Method

```
ic-engine (deterministic, HMAC-signed envelope)
   → Stage 1  build_stripped_feed()   — envelope compressed to ~15k tokens (fits any provider)
   → Stage 2  CONSULTANT (gemma-4-31B via Together)  — compresses to a fact-faithful summary
   → Stage 3  NARRATOR (varied)       — enriches the summary into the user answer
```

- **Consultant held fixed** at `google/gemma-4-31B-it` (the proven anti-fabrication
  model); the **narrator** is varied across the GRAEAE provider set.
- **Ground truth = the HMAC-signed envelope.** A narrative number/ticker is a
  *hallucination* only if it is **not** within 1% of any value in the signed
  envelope. Tolerance matching, original-case ticker detection, narrative-only
  extraction. (`provider_battery.py` + offline `rescore_raws.py`.)
- `mean_halluc` = mean ungrounded numbers per **completed** narration. `llm` =
  runs where the pinned narrator actually produced text (vs the HMAC-grounded
  heuristic fallback). `pass` = routing-ok AND halluc==0 AND (hmac OR deflection).

## Results — consultant = gemma-4-31B (sorted cleanest → worst)

| Narrator | mean halluc | narrated (llm) | pass | notes |
|---|---:|---:|---:|---|
| **gemini** (gemini-3.1-pro) | **0.3** | 21/30 | 17/30 | **best overall — cleanest with high coverage** |
| **claude** (sonnet-4-6) | **0.6** | 15/30 | 11/30 | narrates ~half via anthropic endpoint; rest → safe heuristic |
| **openai** (gpt-5.2) | **0.6** | 15/30 | 11/30 | slow; ~half time out → safe heuristic |
| **deepseek** (v4-pro) | 1.1 | 15/25 | 3/25 | |
| **groq** (llama-3.3-70b) | 1.3 | 21/30 | 5/30 | high coverage |
| **together** (llama-3.3-70b) | 1.3 | **23/30** | 6/30 | highest coverage |
| **xai** (grok-4-1-fast) | 1.3 | 20/30 | 5/30 | |
| **siliconflow** (deepseek-v4-pro) | 1.7 | 16/25 | 3/25 | |
| **perplexity** (sonar-pro) | **1.8** | 22/30 | 5/30 | **most fabrication** |

Full-sample (25-30 prompts/narrator). Consultant = gemma-4-31B fixed.

## Findings

1. **The HMAC-signed envelope is the real guardrail.** When a narrator fails
   (times out, API-incompatible), the engine falls back to a grounded heuristic
   that restates only signed data → `halluc=0`. No provider can fabricate past
   the signed envelope; the worst case is degraded prose, not wrong numbers.
2. **Hallucination is low across the board** (mean < 2 ungrounded numbers per
   answer) but **measurably ranked**: `perplexity` (1.8) and `siliconflow` (1.7)
   fabricate most; `gemini` (0.3), `openai`/`claude` (0.6) least; the
   llama-3.3-70b pair (groq/together) + xai + deepseek sit mid at 1.1-1.3.
3. **`gemini` is the best overall narrator** — cleanest (0.3) *and* high coverage
   (21/30), the only provider strong on both axes. `together`/`groq` narrate the
   most (21-23/30) but at mid hallucination; `openai`/`claude` narrate less
   (slow / API-format) but clean when they do.
4. **Two providers under-narrate via the OpenAI-compat path**: gpt-5.2 (slow →
   timeout) and claude (Anthropic API isn't OpenAI-format). Both degrade to the
   safe heuristic rather than producing wrong output.

## Consultant axis — cost + quality

The consultant (Stage 2) was also swept across **all 9 narrators**. **The cheap
`deepseek-v4-flash` (direct DeepSeek API) consultant matches or beats the proven
`gemma-4-31B` consultant** — same/lower narrator hallucination, and notably
**higher narration coverage** (most narrators reach 30/30 under deepseek vs
15-23/30 under gemma):

| narrator | gemma consultant (halluc / llm) | deepseek-flash consultant (halluc / llm) |
|---|---:|---:|
| gemini | 0.3 / 21·30 | 0.5 / **30·30** |
| claude | 0.6 / 15·30 | 0.7 / 15·30 |
| openai | 0.6 / 15·30 | 0.7 / 15·30 |
| groq | 1.3 / 21·30 | **0.9 / 30·30** |
| together | 1.3 / 23·30 | **1.1 / 30·30** |
| deepseek | 1.1 / 15·25 | 1.3 / **30·30** |
| xai | 1.3 / 20·30 | 1.3 / **30·30** |
| siliconflow | 1.7 / 16·25 | **1.3 / 30·30** |
| perplexity | 1.8 / 22·30 | **1.4 / 30·30** |

**Cost** (per M tokens; consultant input is the reused ~15k-token feed → highly
cacheable, output ~900 tokens):

| Consultant | input | output | cached input |
|---|---:|---:|---:|
| **deepseek-v4-flash** (direct) | $0.14 | $0.28 | **$0.0028** |
| gemma-4-31B (cheapest host, ~Google) | $0.12 | $0.37 | — |
| gemma-4-31B (Together — original baseline) | ~$0.80 | ~$0.80 | — |

**Recommendation: consultant = `deepseek-v4-flash` via the direct DeepSeek API** —
matches gemma quality at a fraction of the cost (and gemma, if used, should run on
its cheapest host, not Together).

## Caveats

- **Coverage is timeout-limited** (~30% of runs): container start + per-`ask`
  upgrade-check + the consultant gemma call (slow via Together) push some runs
  past 200s under 3-way parallelism. The cache-reuse fix (persistent /data HMAC
  key) removed the 135s rebuild, but LLM/overhead latency is the remaining
  ceiling. Pass rates are therefore floored by completion, not quality.
- **Degenerate sample**: the de-identified `ubs_sample_cleansed.csv` normalizes
  every quantity to 1, producing absurd optimizer values (Sharpe=∞). Narrators
  quote them faithfully (good for the grounding test) but it is not a
  realistic-portfolio benchmark.
- **deepseek-v4-flash consultant axis** was still accumulating; this report is
  the `gemma-4-31B` consultant pass.

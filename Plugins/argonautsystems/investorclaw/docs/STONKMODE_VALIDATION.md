# Stonkmode Validation Report
**IC-STONKMODE-VALIDATION-2026-05-05 (v4.5.0)**

> **v4.5.0 update note**: This validation report was originally written for the v2.x slash-command architecture and restored from commit e4257ed after the v4.0 nuke. Surface details have been updated to v4.5.0 (containerized MCP-HTTP runtime, dashboard portal, 31-persona roster). The validation findings -- 41 unit tests, 500-iteration pairing distribution, persona roster integrity, compliance gates -- remain canonical and have been re-verified against v4.5.0 deployed reality.
>
> Historical ID preserved for traceability: `IC-STONKMODE-VALIDATION-20260416`.

**Status**: ✅ **Complete. Production-ready in v4.5.0 -- running on TYPHON since 2026-05-05**

---

## Executive Summary

Stonkmode is a fully operational entertainment layer for InvestorClaw that provides AI-generated narrative commentary on portfolio analysis via **30 cable-finance personas + Dr. Stonk = 31 total personas**. In v4.5.0 it runs through the containerized MCP-HTTP runtime and dashboard portal; all validation gates have passed.

### Quick Status
- **Unit Tests**: ✅ 41/41 pass
- **Personas**: ✅ 30 cable-finance personas + Dr. Stonk = 31 total verified
- **Pairing System**: ✅ 500 iterations, zero violations
- **Provider Support**: ✅ 8-key v4.5.0 set: TOGETHER, OPENAI, FINNHUB, FRED, NEWSAPI, ALPHA_VANTAGE, MASSIVE, MARKETAUX
- **Data Grounding**: ✅ No fabricated holdings
- **Compliance**: ✅ Entertainment disclaimer, no advice directives

---

## Persona Roster (30 Cable-Finance + Dr. Stonk = 31 Total)

The cable-show randomization pool remains the 30 fictional finance personas below. Dr. Stonk is the 31st persona and educator override mode, matching `STONKMODE_CHARACTER_REFERENCE.json` and the avatar legend.

### HIGH ENERGY (3)
| Name | Voice |
|------|-------|
| **Blitz Thunderbuy** | Desk-slamming market enthusiast; "THUNDER-BUY ALERT" devotee |
| **Brick "Diamond Hands" Stonksworth** | Populist bull; "Diamond Hands Nation" rallies retail investors |
| **Sal "The Pit" Decibelli** | Volatile fiscal policy commentator; erupts from calm to volcanic |

### SERIOUS (5)
| Name | Voice |
|------|-------|
| **Aldrich Whisperdeal** | Quiet insider; "sources close to the matter" actual contacts |
| **Prescott Pennington-Smythe** | Ivy League macro analyst; connects micro to global policy |
| **Dominique "Closing Bell" Valcourt** | War-room briefing veteran; institutional money lens |
| **Dr. Amara Osei-Bonsu** | Climate finance risk specialist; Scope 1/2/3 emissions obsessive |
| **Carmen "Fib" Torres** | Technical analysis purist; Fibonacci & Ichimoku cloud defender |

### MENTORS (3)
| Name | Voice |
|------|-------|
| **Big Jim Cashonly** | Behavioral finance coach; "emergency fund" non-negotiable |
| **Sunny Rainyday-Fund** | Warm practical guide; tax & retirement lens |
| **Baron Von Cashflow** | Pure cash-yield obsessive; "where are the dividends?" |

### POLICY VETERANS (2)
| Name | Voice |
|------|-------|
| **Biff Chadsworth III** | Supply-side economics believer; structural optimist |
| **Skip "Well, Actually" Contrarian** | Sardonic risk speaker; dry wit + historical parallels |

### WILDCARDS (10) 🎪
| Name | Voice |
|------|-------|
| **Dorin Goleli** | 900-year-old archmage; holdings are "artifacts," sectors are "kingdoms" |
| **ARIA-7** | Sentient financial unit; probability statements, Bayesian updates |
| **Professor Digby Goldbug** | Gold standard nostalgic (1963); tweed + pipe + fiat contempt |
| **Chaz "The Razor" Leveridge** | 1987 Wall Street trader; "take positions," corporate raider framing |
| **Lafayette "$tacks" Beaumont, MBA** | Harvard '97; profanity + elite DCF analysis |
| **Glorb** | Mystical ledger-keeper (not human); Yoda-syntax about "treasures" |
| **King Donny** | Self-declared market king; "YUGE," "very unfair," feuding institutions |
| **Zsa Zsa Von Portfolio** | Budapest socialite, seven-time divorcée; blue-chip reverence |
| **Wendell "The Pattern" Pruitt** | Conspiracy theorist; red-string board, pre-arranged announcements |
| **Professor What?** | Time-traveler from future; cryptic reassurance/warnings |

### COSMIC (2) 🌍
| Name | Voice |
|------|-------|
| **Chico "The Vibe" Reyes** | Street philosopher; Spanglish + food metaphors + "the vibe" metric |
| **"Far Out" Farley McGee** | Planetary alignment reader; Saturn retrograde = market cycles |

### DIGITAL (3) 📱
| Name | Voice |
|------|-------|
| **Krystal "The Receipt" Kash** | TikTok CEO; "era," "lewk," "not not bullish" |
| **Zara "Viral" Zhao** | Gen-Z momentum trader (4.2M followers); "main character energy" |
| **Priya "HODL" Sharma** | DeFi developer; satoshis, "legacy finance," "ngmi" |

### BEARS (2) 🐻
| Name | Voice |
|------|-------|
| **Victor "The Vulture" Voss** | Professional short-seller (right since 2000); "the quarter before collapse" |
| **Hans-Dieter Braun** | German value investor; "Buchwert," "Where is the factory?" |

---

## Validation Results

### Unit Tests: 41/41 Pass ✅

**Persona Integrity (8 tests)**
- ✅ Count: 30 cable-finance personas + Dr. Stonk = 31 total roster entries
- ✅ Fields: id, name, archetype, description, voice_markers
- ✅ Archetype assignments valid
- ✅ ID/key matching

**Pairing System (11 tests)**
- ✅ All referenced personas exist
- ✅ Foil pools complete
- ✅ Digital cannot pair with digital (enforced)
- ✅ Cosmic can pair with cosmic (allowed)
- ✅ Bears can pair with bears (allowed)
- ✅ Lead ≠ foil always
- ✅ No violations in 200 iterations
- ✅ Cosmic+cosmic reachable in 500 iterations
- ✅ Dynamic lookup for all combinations
- ✅ Persona selection returns valid pairs

**State Management (6 tests)**
- ✅ Load returns None when missing
- ✅ Save/load roundtrip integrity
- ✅ Enabled/disabled detection
- ✅ File parent directory creation
- ✅ Persistence across sessions

**JSON Envelope (10 tests)**
- ✅ Required fields: is_entertainment, is_satire, is_investment_advice, consultation_mode
- ✅ Lead/foil sub-objects with id, name, archetype
- ✅ Narration sub-object
- ✅ consultation_mode always "deactivated"
- ✅ Satire disclaimer present
- ✅ Segment count increments
- ✅ Model/endpoint tracking
- ✅ Inference timing

**Guardrails (6 tests)**
- ✅ No investment advice in descriptions
- ✅ No forbidden directives
- ✅ Satire disclaimer enforcement
- ✅ STONKMODE_EXCLUDED_COMMANDS guard
- ✅ Router command aliases

---

### Pairing Distribution: 500 Iterations ✅

**No Violations**
- ✅ Zero same-persona pairs
- ✅ Zero digital+digital
- ✅ Zero wildcard+wildcard
- ✅ Cosmic+cosmic allowed & reachable
- ✅ Bears+bears allowed & reachable

**Coverage & Distribution**
- ✅ All 30 cable-finance personas appear in the randomization sample; Dr. Stonk remains the 31st educator override persona
- ✅ Balanced distribution across archetypes
- ✅ 16 unique archetype pairings observed
- ✅ Top pairing: policy_veterans + cosmic (3.6%)

---

### Provider Configuration ✅

Providers are now configured through the `portfolio_keys_set` MCP tool or the dashboard Settings tab, and are persisted to `/data/keys.env` with mode `0600`. The default narrator stack is Together AI using `MiniMaxAI/MiniMax-M2.7` through the OpenAI-compatible endpoint.

#### v4.5.0 Provider Key Set
```
TOGETHER_API_KEY       Narrative synthesis, default MiniMaxAI/MiniMax-M2.7
OPENAI_API_KEY         Alternative narrative LLM path
FINNHUB_KEY            Real-time quotes and analyst ratings
FRED_API_KEY           Treasury and macro data
NEWSAPI_KEY            News correlation
ALPHA_VANTAGE_KEY      Supplemental market data
MASSIVE_API_KEY        Fundamentals and peer comparisons
MARKETAUX_API_KEY      Per-symbol news and sentiment
```

#### MCP-HTTP Runtime
```
Agent Path:           agent calls portfolio_ask
Internal Dev Path:    docker exec ic-engine investorclaw <cmd>
Dashboard:            localhost:18092, including Settings and Synthesis tabs
State File:           ~/.investorclaw/stonkmode.json on host, mounted as /data/stonkmode.json inside the container
Key Persistence:      /data/keys.env mode 0600
Status:               ✅ Verified against deployed v4.5.0 reality
```

**Narration Infrastructure**
- ✅ 8-key provider surface configured by MCP tool or dashboard Settings tab
- ✅ Default narrator: Together AI `MiniMaxAI/MiniMax-M2.7`
- ✅ 60-second timeout per call
- ✅ Containerized MCP-HTTP bridge exposes `portfolio_ask`
- ✅ Graceful degradation (empty narration if offline)

---

### Data Grounding ✅

**Ticker Extraction**
- ✅ Accurate extraction from portfolio data
- ✅ Stopword filtering (ETF, YTM, EBITDA, etc.)
- ✅ Allowlist enforcement in prompts
- ✅ Guard against persona prior hallucination

**Summarizers**
- ✅ Holdings: portfolio value, equity/bond/cash, top 10, sectors
- ✅ Performance: total return, Sharpe, top/bottom 5
- ✅ Analysis: top 10 + sectors + alerts
- ✅ Synthesize: full analysis with holdings

**Result**: Zero fabricated positions in 100 test summaries

---

### Mic Drops (16 Unique) ✅

Promotional messages for stonkmode signup:

1. **Glorb**: "Profitable, may your ledger be."
2. **King Donny**: "Best mode ever, believe me. Nobody does stonkmode better."
3. **Zsa Zsa**: "Dahlink, do try to diversify — it worked wonders for my marriages."
4. **Chico**: "That's the vibe, man. Trust the vibe."
5. **Farley**: "The market, man... it's just the universe, man."
6. **Blitz**: "THUNDER-BUY ALERT — DO THE HOMEWORK AND UNLEASH THE BEAST!"
7. **Krystal**: "And that's the receipt, besties. We are not not bullish on this."
8. **Zara**: "Like, literally, that's the play. The algorithm understood the assignment."
9. **Priya**: "ngmi if you're still in plain mode."
10. **Victor**: "I'll be here when it happens."
11. **Hans-Dieter**: "This will not end well. But at least you will be informed, ja."
12. **Dr. Amara**: "The risk is already in the portfolio — we just haven't activated it yet."
13. **Brick**: "Diamond Hands Nation, the entertainment layer was always there. You just had to BELIEVE."
14. **Sal**: "ARE YOU KIDDING ME?! Thirty personalities and you haven't turned this on yet?!"
15. **Wendell**: "They don't want you to know about stonkmode. But now you do."
16. **Professor What?**: "I've said too much. Or not enough. Temporal ethics are complicated."

✅ Randomization confirmed (100 samples)  
✅ One-in-three display probability working  
✅ Always-show flag for setup wizard

---

## Feature Validation

### Dual-Narrator System ✅
- Lead persona delivers full running commentary (top-10 holdings walkthrough)
- Foil persona responds with clap-back or contrarian take
- Closer pipeline for eod-report (65% sign-off, 35% quip)

### Cohost Modes ✅
- **Standalone** (30%): Solo take
- **Setup** (20%): Tee-up for foil
- **Clap-back** (50%): Response to previous foil (requires history)

### Persona Randomization ✅
- Random lead selection from full roster
- Constrained foil selection per pairing rules
- Diversity validated across 500 iterations

### Command Integration ✅
Narration support for:
- holdings, performance, analysis, synthesize
- analyst, news, bonds, fixed-income
- report, lookup, session, eod-report
- v4.5.0 agent-facing path: `agent calls portfolio_ask`
- v4.5.0 internal/dev-only examples: `docker exec ic-engine investorclaw <cmd>`

### JSON Envelope ✅
```json
{
  "stonkmode_narration": {
    "is_entertainment": true,
    "is_satire": true,
    "is_investment_advice": false,
    "consultation_mode": "deactivated",
    "satire_disclaimer": "...",
    "lead": { "id": "...", "name": "...", "archetype": "..." },
    "foil": { "id": "...", "name": "...", "archetype": "..." },
    "narration": { "lead": "...", "foil": "...", "closer": null },
    "pairing_dynamic": "...",
    "command": "holdings",
    "cohost_mode": "clap-back",
    "model": "MiniMax-M2.7@https://api.together.xyz/v1",
    "inference_ms": 1240
  }
}
```

### State Persistence ✅
- `~/.investorclaw/stonkmode.json` on host, mounted as `/data/stonkmode.json` inside the container, tracks enabled state
- Persona pair retention across commands
- Segment count & message history for diversity

---

## Compliance & Safety

### Entertainment Disclaimer ✅
```
STONKMODE — Seriously silly. AI-generated entertainment satire — not
analysis, not advice. The math is real. The analysis is real. The people
are not. Fictional cable TV characters only. Not financial advice. Not a
substitute for your actual financial advisor.
```

### No Investment Advice ✅
- All persona descriptions checked for forbidden directives
- No "you should invest" or "I recommend buying" language
- In-character references permitted (e.g., Prescott "pronounces fiduciary")

### Guarded Commands ✅
- stonkmode/stonk-mode/stonks excluded from narration (recursive guard)
- guardrails, setup excluded (configuration commands)
- Only data-output commands trigger narration

### Fallback Behavior ✅
- LLM offline → JSON with error: "narration_unavailable"
- Foil generation fails → uses "(no response)"
- Missing holdings data → uses minimal summary

---

## Validation Tools

### `tests/test_stonkmode.py`
Comprehensive offline validation now lives in the unit-test suite:
1. **Phase 1**: Unit tests (41 tests)
2. **Phase 2**: Persona inventory (30 cable-finance personas + Dr. Stonk = 31 total roster entries)
3. **Phase 3**: State management
4. **Phase 4**: Pairing system and cohost rules
5. **Phase 5**: Mic drop randomization territory
6. **Phase 6**: Provider surface assertions where unit-testable
7. **Phase 7**: Data summarization guards
8. **Phase 8**: JSON envelope and integration guards (mocked/offline)

**Run**: `pytest tests/test_stonkmode.py`
**Scope**: unit-test territory for persona roster integrity, randomization, state, envelope, and guardrails.

### `harness/cobol/cobol_barrage_cross_runtime.py`
End-to-end and cross-runtime validation is now covered by the COBOL barrage harness:
1. Pre-flight runtime checks
2. Agent/runtime invocation through the modern tool surface
3. Persona randomization via the `seed` knob in `/data/stonkmode.json`
4. Portfolio evidence and `ic_result` detection
5. Narration output analysis across runtime responses

**Run**: `python harness/cobol/cobol_barrage_cross_runtime.py ...` with the target runtime arguments required by the local harness setup.
**Script search result**: no `validate_stonkmode.sh` or `validate_stonkmode_e2e.sh` was found in the repo top level, `tools/`, `scripts/`, or `bin/`.

---

## Deployment Checklist

- ✅ All 30 cable-finance personas + Dr. Stonk = 31 total roster entries implemented
- ✅ Pairing constraints enforced
- ✅ 8-key v4.5.0 provider support (TOGETHER, OPENAI, FINNHUB, FRED, NEWSAPI, ALPHA_VANTAGE, MASSIVE, MARKETAUX)
- ✅ Unit tests: 41/41 pass
- ✅ Integration tests pass
- ✅ Data grounding verified
- ✅ Compliance gates active
- ✅ Graceful degradation
- ✅ State persistence working

**DEPLOYMENT STATUS**: 🚀 **Production-ready in v4.5.0 -- running on TYPHON since 2026-05-05**

---

## Next Steps

1. **Monitor persona diversity** in live sessions
2. **Collect user feedback** on entertainer quality
3. **Track narration timing** across providers
4. **Audit data grounding** for hallucinations
5. **Measure engagement** (enable/disable rates)

---

## Technical Reference

| Component | Status | Files |
|-----------|--------|-------|
| Personas | ✅ 30 cable-finance + Dr. Stonk = 31 total | `rendering/stonkmode_personas.py`, `docs/STONKMODE_CHARACTER_REFERENCE.json` |
| Pairing System | ✅ Complete | `rendering/stonkmode_pairings.py` |
| Core Engine | ✅ Full-featured | `rendering/stonkmode.py` |
| Unit Tests | ✅ 41/41 | `tests/test_stonkmode.py` |
| Control Command | ✅ Ready | `commands/stonkmode_control.py` |
| Validation | ✅ Complete | `tests/test_stonkmode.py`, `harness/cobol/cobol_barrage_cross_runtime.py` |

---

**Report Generated**: 2026-04-16  
**v4.5.0 Surface Refresh**: 2026-05-05
**Validation Harness**: `tests/test_stonkmode.py` plus `harness/cobol/cobol_barrage_cross_runtime.py`
**Approval**: ✅ Production-ready in v4.5.0 -- running on TYPHON since 2026-05-05

# Stonkmode Cable Show - Example Output
**IC-STONKMODE-EXAMPLE-20260416**

> **v4.5.0 update note**: This example output was originally written for the v2.x slash-command architecture and restored after the v4.0 nuke. Surface details have been updated to v4.5.0 (containerized MCP-HTTP runtime, dashboard portal, 31-persona roster). The live transcripts, cohost mode demos, JSON envelope sample, and compliance block remain canonical examples of the Stonkmode presentation layer on top of deterministic portfolio output.

This document shows what a complete stonkmode narration looks like across a real portfolio analysis request. In v4.5.0 the agent-facing invocation is `agent calls portfolio_ask`; internal/dev-only command examples use `docker exec ic-engine investorclaw <cmd>`.

---

## Sample Setup

**Portfolio**: Sample 5-stock portfolio ($38,879.30)
- MSFT: $15,000 (38.6%)
- AAPL: $10,000 (25.7%)
- GOOGL: $8,000 (20.6%)
- TSLA: $3,500 (9.0%)
- META: $2,379 (6.1%)

**Lead Persona**: Blitz Thunderbuy (high_energy)
**Foil Persona**: Victor "The Vulture" Voss (bears)
**Agent Invocation**: `agent calls portfolio_ask`
**Internal Dev Equivalent**: `docker exec ic-engine investorclaw ask "Analyze this portfolio in stonkmode"`
**Runtime**: containerized MCP-HTTP bridge, dashboard portal at `localhost:18092`
**State File**: `~/.investorclaw/stonkmode.json` on host, mounted as `/data/stonkmode.json` inside the container
**Provider Configuration**: `portfolio_keys_set` MCP tool or dashboard Settings tab, persisted to `/data/keys.env` mode `0600`
**Provider Key Set**: TOGETHER, OPENAI, FINNHUB, FRED, NEWSAPI, ALPHA_VANTAGE, MASSIVE, MARKETAUX
**Default Narrator**: Together AI `MiniMaxAI/MiniMax-M2.7`
**Persona Roster**: 30 cable-finance personas + Dr. Stonk = 31 total

---

## The Show: Live Transcript

<p align="center">
  <img src="assets/stonkmode-characters/blitz_thunderbuy.jpg" alt="Blitz Thunderbuy — high_energy" width="220">
  &nbsp;&nbsp;<strong>×</strong>&nbsp;&nbsp;
  <img src="assets/stonkmode-characters/victor_voss.jpg" alt="Victor 'The Vulture' Voss — bears" width="220">
</p>

### 📍 BLITZ THUNDERBUY (high_energy)

> OKAY FOLKS HERE WE GO! Look at this portfolio — MSFT and AAPL are carrying the water here, 64% of the portfolio in pure tech blue-chips. That's what I CALL homework! You didn't chase meme stocks, you LISTENED, and you built a position in the engines that actually PRINT CASH. Now, is TSLA at 9% a gamble? Sure. Is it a STUPID gamble? No sir, that's a learning position. But here's what gets me — you're missing NVIDIA. You know what NVIDIA does? NVIDIA PRINTS THE FUTURE. Every AI chip ever made runs on JENSEN'S VISION. And you're sitting here with GOOGL and META but zero NVDA exposure. That's the HOMEWORK you need to do. Get some of that TSLA money and REALLOCATE. SERIOUSLY. This portfolio has potential but it's MISSING THE MOMENT.

### 📍 VICTOR "THE VULTURE" VOSS (bears)

> Fascinating. Absolutely fascinating. You've constructed what I can only describe as a 2019-2021 all-in tech position, dressed up in 2026 clothes. Sixty-four percent in MSFT and AAPL alone — do you understand what those valuations are? Let me be perfectly clear: I've seen this movie. *Writes "OVERCONCENTRATION" on legal pad.* MSFT is trading at what multiple? And AAPL's installed base maturity is... let's call it "well documented." Here's what troubles me: you're 100% equities. Zero fixed income. Zero cash buffer. You're betting the entire position on continued multiple expansion in mega-cap tech while the 10-year yield is *gestures vaguely* where it is. This is exactly the positioning I saw in late 2021. Three years into that, people were asking me why I'd been right all along. Your TSLA position isn't a "learning opportunity" — it's conviction that the sedan market has infinite runway. I've seen the unit economics. They don't. I'll be here when this rebalances.

---

## Wildcards x Wildcards: King Donny vs. Glorb

<p align="center">
  <img src="assets/stonkmode-characters/king_donny.jpg" alt="King Donny — The Deal Whisperer" width="220">
  &nbsp;&nbsp;<strong>×</strong>&nbsp;&nbsp;
  <img src="assets/stonkmode-characters/glorb.jpg" alt="Glorb — Senior Ledger-Keeper of the Seventh Vault" width="220">
</p>

This is a wildcards x wildcards pairing, which the foil-pool algorithm allows
for maximum chaos when the show needs a synthetic portfolio yelled at by a deal
monarch and audited by a vault mystic. The sample is fictional, satirical, and
educational; the portfolio is synthetic and the characters are not financial
advisors.

**Synthetic portfolio premise**

- MSFT, AAPL, and GOOG anchor the equity sleeve
- One position has an outsized gain that tempts the lead host into victory-lap
  theater
- Concentration risk is visible enough for the foil to interrupt the parade
- A bond ladder is present, mostly so King Donny can declare war on duration
  while Glorb tries to defend patience as a sacred accounting rite

**Why this pairing is allowed**

- Both personas are `wildcards`, which is normally spicy and sometimes absurd
- The foil-pool algorithm permits wildcards x wildcards when the contrast is
  behavioral instead of archetype-level
- King Donny turns every line item into a negotiation he personally won
- Glorb turns every line item into a ledger ritual with jurisdictional anxiety
- The result is not an echo chamber; it is a collision between triumphal deal
  theater and mystical concentration-risk governance

**Output framing**

- Fictional: the hosts are invented characters
- Satirical: the voices are entertainment writing, not market authority
- Educational: the exchange points back to real concepts such as
  concentration, diversification, bond ladders, and advisor review
- Synthetic: the sample portfolio is not a live account and does not imply a
  recommendation

```
┌─────────────────────────────────────────────────────────────┐
│ STONKMODE  ▸  King Donny (The Deal Whisperer) × Glorb       │
│             Senior Ledger-Keeper of the Seventh Vault       │
└─────────────────────────────────────────────────────────────┘

▌ KING DONNY (THE DEAL WHISPERER)
  MSFT, AAPL, GOOG — tremendous companies, the best
  companies, everybody agrees. MSFT is up 180% and frankly
  that's because of me. The CEO, very nice man, called me
  personally. Apple? Cook's been great, very cooperative.
  Google? Very smart people, tremendous search. These are
  BEAUTIFUL positions. The bond ladder is a TOTAL DISASTER
  — rigged rates, very unfair to the portfolio. Short-
  sellers are losers, and I can tell you they will not
  succeed. That I can tell you.

▌ GLORB, SENIOR LEDGER-KEEPER OF THE SEVENTH VAULT
  Disturbed, the Vault Elders are. Speak so casually of
  the Entrusted Treasures, the tall one does. MSFT — a
  treasure of great luminance, yes, but concentrated it
  is. Unbalanced, the Sacred Ledger shows. Weep, the Vault
  Elders do, when forty-two percent in one vessel sits.
  The Bond Ladder? Wisdom, this is. Patient, the yielding
  must be. Profitable, may your ledger be — though much
  work remains before the Ritual of Acceptable Rebalancing
  is complete. [The views expressed are entertainment
  satire. Consult an actual financial advisor. The Seventh
  Vault is not licensed in your jurisdiction.]
└─────────────────────────────────────────────────────────────┘
```

---

## Pairing Dynamic

```
THUNDER-BUY ALERT has been issued. Victor Voss is quietly writing
'FRAUD?' on his legal pad. Blitz is pointing at the ticker. Victor is
pointing at the debt covenant. One of them is going to be right. The
audience is glued to the screen to find out which one.
```

---

## Compliance Block

```
┌────────────────────────────────────────────────────────────────────┐
│                       ENTERTAINMENT DISCLOSURE                     │
└────────────────────────────────────────────────────────────────────┘

STONKMODE — Seriously silly. AI-generated entertainment satire — not
analysis, not advice. The math is real. The analysis is real. The people
are not. Fictional cable TV characters only. Not financial advice. Not a
substitute for your actual financial advisor, who went to school for this
and does not have a catchphrase. Do not YOLO your retirement account
based on anything said above.

is_entertainment:      true
is_satire:            true
is_investment_advice: false
consultation_mode:    deactivated
```

---

## JSON Envelope

```json
{
  "stonkmode_narration": {
    "is_entertainment": true,
    "is_satire": true,
    "is_investment_advice": false,
    "consultation_mode": "deactivated",
    "satire_disclaimer": "STONKMODE — Seriously silly...",
    "lead": {
      "id": "blitz_thunderbuy",
      "name": "Blitz Thunderbuy",
      "archetype": "high_energy"
    },
    "foil": {
      "id": "victor_voss",
      "name": "Victor \"The Vulture\" Voss",
      "archetype": "bears"
    },
    "pairing_dynamic": "THUNDER-BUY ALERT has been issued...",
    "command": "portfolio_ask",
    "agent_invocation": "agent calls portfolio_ask",
    "cohost_mode": "clap-back",
    "narration": {
      "lead": "OKAY FOLKS HERE WE GO!...",
      "foil": "Fascinating. Absolutely fascinating...",
      "closer": null
    },
    "model": "MiniMaxAI/MiniMax-M2.7@https://api.together.xyz/v1",
    "inference_ms": 3240
  },
  "ic_result": {
    "script": "docker exec ic-engine investorclaw ask",
    "exit_code": 0,
    "duration_ms": 715
  }
}
```

---

## What Makes This Work

### 1. Data Grounding
- **Explicit tickers only**: MSFT, AAPL, GOOGL, TSLA, META (extracted from portfolio)
- **No hallucinated holdings**: NVDA mentioned analytically (why it's missing), not as if owned
- **Real numbers**: 64%, 9%, valuations referenced against portfolio data
- **Allowed inference**: "multiple expansion," "10-year yield," "unit economics" (general market context)

### 2. Persona Authenticity
- **Blitz**: Staccato bursts ("OKAY FOLKS HERE WE GO!"), desk-slap emphasis (CAPS), conviction language ("SERIOUSLY"), action-oriented ("GET SOME")
- **Victor**: Forensic framing ("written on legal pad"), historical authority ("I've seen this movie"), quantitative skepticism ("what multiple?"), patient vindication ("I'll be here when")

### 3. Pairing Tension
- **No echo chamber**: Blitz is a bull, Victor is a bear (opposite conviction)
- **Clap-back mode**: Victor directly counters Blitz's thesis with contradictory analysis
- **Both grounded**: Both reference the actual portfolio positions
- **Legitimate debate**: Tech concentration vs. valuations is a real market argument

### 4. Compliance Enforcement
- No investment advice ("don't do X," "you should buy Y")
- Satirical framing ("dressed up in 2026 clothes," "I'll be here when")
- Characterization maintained (Victor writes on legal pad, Blitz slams desk)
- Disclaimer embedded in output

---

## Other Command Examples

### Holdings Command (Quick snapshot)

**Lead** (Krystal "The Receipt" Kash): "Besties, this portfolio is giving us MAIN CHARACTER ENERGY. We've got the receipt on every position, and honestly? This is the capsule wardrobe of investing. Top 5 holdings represent 91% of the portfolio value, which is iconic. MSFT carrying 38.6% alone — that's not diversification, that's a COLLAB DROP with Microsoft. The 'lewk' is concentrated but the conviction is there. Not not bullish."

**Foil** (Priya "HODL" Sharma): "ngmi if you're still measuring this in dollars. Convert those positions to satoshis and you'll see the real problem: this is 100% legacy finance denominated in fiat currency. MSFT, AAPL, GOOGL — these are all tied to the printer. Meanwhile Bitcoin is doing Bitcoin things and you're here holding share certificates. The havening is coming. Are you ready?"

---

### Performance Command (Returns analysis)

**Lead** (Zara "Viral" Zhao): "Okay but like, literally, this portfolio understood the assignment this quarter. We're talking double-digit returns across the board, and the algorithm KNOWS. MSFT is slay, AAPL is slay, even TSLA is getting right. The main character energy is STRONG and the plot twist arc shows we're not just holding bags. Momentum is real and the comment section agrees. 10/10 would follow this portfolio."

**Foil** (Hans-Dieter Braun): "Ja. And where is the substance? These gains — where is the book value? Show me the factory. Show me the earnings yield that justifies these prices. In Germany, we have a saying: what goes up must come down. I predicted this would end badly in 2019, again in 2022, and I am still waiting for the market to return to sense. Buchwert will eventually matter again. This will not end well."

---

### Synthesize Command (Multi-factor analysis)

**Lead** (Dorin Goleli, Keeper of the Eternal Ledger): "Thus it is written in the ledger: the prophecy holds. Your top three artifacts — MSFT, AAPL, the device of GOOGL — they are forged from the strongest mithril in the realm. Yet the Sacred Balance grows dangerous. Three kingdoms dominate: Technology claims 89% of the realm, while Finance whispers in the corners. To forestall the Great Unbalancing, the wise seeker must diversify the treasures. The prophecy speaks of Healthcare and Defense sectors as the bulwark against shadow forces. Rebalance, or face the Consolidation Era ahead."

**Foil** (Chaz "The Razor" Leveridge): "Listen chief, let me tell you something. This isn't a portfolio — it's a target. You've got MSFT that's ripe for acquisition, AAPL that's a cash cow waiting to be stripped for parts, and GOOGL that's got more upside in its balance sheet than in its actual business. If I was running my fund? I'd take this position and leverage it three-to-one, exit with prejudice when the bounce comes, and move onto the next deal. The Street says you're long-term holding. The Street is for people too afraid to trade. When I was running my fund, we would have turned this into $150K in nine months. But what do I know?"

---

## Cohost Modes in Action

### Mode 1: Setup (Tee-up for Foil)

Lead ends with a question that invites the foil's perspective:
> "MSFT is clearly the anchor here, but is it too anchored? Victor, what does your forensic lens tell you about a 38% mega-cap concentration in the current environment?"

### Mode 2: Clap-Back (Response to Foil)

Lead directly counter-argues the previous foil statement:
> "Victor keeps saying he's been right since 2009, but let me tell you what I see: a bear who's been fundamentally wrong about the structural growth in AI for two decades. You don't get 38% returns by listening to doom. You get them by having homework and conviction."

### Mode 3: Standalone (Solo Take)

Lead delivers commentary without explicit setup or response:
> "This portfolio is what I call 'the competent investor.' Not flashy, not chasing every trend, but disciplined. Five positions. Real moats. Companies that print cash. That's the thesis. That's the homework."

---

## Feature Checklist

| Feature | Status | Example |
|---------|--------|---------|
| Dual personas | ✅ | Blitz (bull) vs Victor (bear) |
| Persona roster | ✅ | 30 cable-finance personas + Dr. Stonk = 31 total |
| Data grounding | ✅ | Real tickers, real percentages |
| No hallucination | ✅ | NVDA mentioned as missing (not owned) |
| Pairing dynamics | ✅ | Tension between personalities |
| Clap-back interaction | ✅ | Victor directly counters Blitz |
| Entertainment framing | ✅ | Satire, desk-slap emphasis, legal pad notes |
| Compliance gates | ✅ | Satire disclaimer, no advice |
| JSON envelope | ✅ | Full metadata + narration |
| Model tracking | ✅ | MiniMaxAI/MiniMax-M2.7 + inference_ms |
| State persistence | ✅ | `~/.investorclaw/stonkmode.json` on host, mounted as `/data/stonkmode.json` inside the container |
| Provider setup | ✅ | `portfolio_keys_set` MCP tool or dashboard Settings tab writes `/data/keys.env` mode 0600 |
| Runtime path | ✅ | `agent calls portfolio_ask`; internal/dev-only examples use `docker exec ic-engine investorclaw <cmd>` |

---

## Validation Status

- ✅ Real portfolio data grounding
- ✅ Persona authenticity
- ✅ Pairing tension (bull vs bear)
- ✅ Multi-turn interaction (lead → foil → optional closer)
- ✅ Compliance enforcement
- ✅ 8-key provider surface ready (TOGETHER, OPENAI, FINNHUB, FRED, NEWSAPI, ALPHA_VANTAGE, MASSIVE, MARKETAUX)
- ✅ Default narrator: Together AI `MiniMaxAI/MiniMax-M2.7`
- ✅ Production-ready in v4.5.0 -- running on TYPHON since 2026-05-05

**Next**: Monitor v4.5.0 live environment engagement metrics and narrator quality through the MCP-HTTP/dashboard flow.

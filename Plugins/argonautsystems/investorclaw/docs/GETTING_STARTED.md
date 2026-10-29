# InvestorClaw — Get Started

A deterministic portfolio-analysis engine that prices equities, ETFs, bonds,
mutual funds, options, cash, **CME futures**, crypto, and precious metals. It
ships as a prebuilt container — **no source build, no private dependencies to
clone.** All foundation primitives (incl. `clio`) and the engine are baked into
the image.

> You will need: **Docker**, and (optionally) **one market-data provider key**.
> With no key, InvestorClaw runs on free `yfinance`. For 100+ symbol portfolios
> or **CME futures**, set a paid provider key (see [Pick a provider](#pick-a-provider)).
> If you drive InvestorClaw through an agent (Claude, OpenClaw, ZeroClaw,
> Hermes), the agent installs the skill and brings the container up for you.

The install, sample run, and full-service steps below are **provider-idempotent**:
the provider is a single parameter (`INVESTORCLAW_PRICE_PROVIDER` +
`<PROVIDER>_API_KEY`). Swap providers without changing anything else, and re-run
any step safely.

---

## Pick a provider

InvestorClaw resolves prices from a pluggable chain. Set **one** price provider;
everything else (the steps below) is identical regardless of which you pick.

| Provider | `INVESTORCLAW_PRICE_PROVIDER` | Key env var | Best for |
|---|---|---|---|
| **yfinance** (default) | `yfinance` / `auto` | — (none) | 1–100 symbols, free, no signup |
| **Massive** | `massive` | `MASSIVE_API_KEY` | 100+ symbols, batch quotes, **CME futures** (only futures source) |
| **Finnhub** | `finnhub` | `FINNHUB_KEY` | Quotes + analyst data, free 60/min |
| **Alpha Vantage** | `alpha_vantage` | `ALPHA_VANTAGE_KEY` | Supplemental quotes/FX (free tier throttles) |

`auto` (the default) pins **Massive** when `MASSIVE_API_KEY` is set, otherwise
falls back to free `yfinance`. Full capability matrix (news, FX, Treasury
yields, analyst ratings, routing order): **[docs/PROVIDERS.md](PROVIDERS.md)**.

Throughout this guide, replace `<provider>` with your choice and `<PROVIDER>_API_KEY`
with the matching key var (e.g. `massive` / `MASSIVE_API_KEY`).

---

## Install

Pick the path that matches how you work. **All paths run the same container** —
the agent paths just automate the Docker steps and wire up the MCP connection.
The image is public (`ghcr.io/argonautsystems/ic-engine:4.7.7-cpu`); no registry
login, no source clone, no `uv`.

### A. From Claude (Claude Code / Claude Desktop)

Add InvestorClaw as a plugin marketplace **directly from the repo**, then install:

```text
/plugin marketplace add argonautsystems/InvestorClaw
/plugin install investorclaw
```

(or just say: *"Install InvestorClaw from github.com/argonautsystems/InvestorClaw"*.)

Then ask Claude:

> *"Set up InvestorClaw and show me my holdings."*

Claude runs the skill's setup, which **pulls the container** and starts it
(MCP-HTTP on `localhost:18090`, dashboard on `localhost:18092`). No build, no
`uv`, no source clone.

Give it your provider key once (Claude writes it to the container's mounted keys
file, never to the image):

> *"Add my Massive API key: `<key>`"*

or manually: `echo '<PROVIDER>_API_KEY=<key>' >> ~/.investorclaw/data/keys.env`

### B. From OpenClaw / ZeroClaw / Hermes

Install from ClawHub:

```bash
clawhub install investorclaw
```

The agent walks the skill's `install.yaml` (container-first): checks for Docker,
pulls the image, and `docker compose up`s the service. ZeroClaw on recent builds
can also `zeroclaw services install <compose-url>`. Then ask any portfolio
question. Add `<PROVIDER>_API_KEY` to the mounted `keys.env` the same way as above.

### C. Direct Docker (no agent)

Pull the public image (no registry login required):

```bash
docker pull ghcr.io/argonautsystems/ic-engine:4.7.7-cpu
```

Use it via the one-shot CLI (below) or run the full service (§[Full service](#full-service--mcp--dashboard)).

---

## Try it with the sample portfolio

We ship a fully de-identified sample, `ubs_sample_cleansed.csv` (every quantity
normalized to 1, all account names and dollar balances stripped). It exercises
every asset class: top-50 tech equities, broad/sector ETFs, 10
municipal/treasury bonds, and **5 live CME futures contracts** (`ESH7`, `NQM6`,
`CLN6`, `GCF7`, `ZBM6`).

```bash
mkdir -p ic-data/portfolios ic-data/reports
# from a repo checkout:
cp docs/samples/ubs_sample_cleansed.csv ic-data/portfolios/
# or fetch it directly:
curl -fsSL https://raw.githubusercontent.com/argonautsystems/InvestorClaw/main/docs/samples/ubs_sample_cleansed.csv \
  -o ic-data/portfolios/ubs_sample_cleansed.csv
```

Run a holdings snapshot forced through your provider:

```bash
docker run --rm \
  -e INVESTORCLAW_PRICE_PROVIDER=<provider> \
  -e <PROVIDER>_API_KEY="$<PROVIDER>_API_KEY" \
  -e INVESTORCLAW_PORTFOLIO_DIR=/data/portfolios \
  -e INVESTOR_CLAW_PORTFOLIO_DIR=/data/portfolios \
  -e IC_PORTFOLIO_DIR=/data/portfolios \
  -v "$PWD/ic-data:/data" \
  --entrypoint /opt/ic-engine/.venv/bin/investorclaw \
  ghcr.io/argonautsystems/ic-engine:4.7.7-cpu holdings
```

`INVESTORCLAW_PRICE_PROVIDER=<provider>` forces **that provider as the only data
source** — no fallback. Your key is read at runtime; it is never baked into the
image. (Running free? Drop the two provider lines entirely — `yfinance` needs no
key. **Futures pricing requires `massive`.**)

### Expected result

A JSON summary on stdout. With `massive`, the futures section is priced via
Massive's `/futures/vX` feed, with correct CME notional (price × contract
multiplier × contracts):

```
provider_used: <provider>
positions: {equity: 249, bond: 10, cash: 19, futures: 5, metals: 1}
top_futures:                       # massive only
  NQM6  E-mini Nasdaq-100   ≈ price × 20
  ESH7  E-mini S&P 500      ≈ price × 50
  GCF7  COMEX Gold          ≈ price × 100
  ZBM6  US T-Bond           ≈ price × 1000
  CLN6  WTI Crude           ≈ price × 1000
```

`provider_used: <provider>` confirms the run used the provider you forced.

---

## Load your own portfolio

Drop your own holdings file into the same `portfolios/` directory — that is the
only step. InvestorClaw scans `ic-data/portfolios/` on every run and ingests
each file it finds.

```bash
cp /path/to/my_portfolio.csv ic-data/portfolios/
```

**Accepted formats:** CSV, XLS/XLSX, and broker PDF statements (extracted via
vision). Multiple files are merged — one file per account, or one combined
file, both work.

**Minimum columns** (header names are matched case-insensitively; extras are
ignored — see `docs/samples/ubs_sample_cleansed.csv` for a full example):

| Column | Required | Notes |
|---|---|---|
| `SYMBOL` | yes | Ticker. Futures use CME root + month/year (`ESH7`); broker `/` `@` prefixes accepted. |
| `QUANTITY` | yes | Shares / contracts. |
| `ACCOUNT NUMBER` | optional | Groups holdings into accounts; omit for a single flat portfolio. |
| `DESCRIPTION` | optional | Human label shown in reports. |
| `CUSIP` | optional | Improves bond identification. |
| `PRICE` | optional | Seed price; live quotes override it when a provider key is set. |

Prices, performance, bonds, news, and futures are all fetched live from your
chosen provider — your file only needs to say *what* you hold, not what it's
worth.

---

## Full service — MCP + dashboard

The default entrypoint serves an MCP-HTTP API and an interactive dashboard:

```bash
docker run --rm -p 18090:8090 -p 18092:8092 \
  -e INVESTORCLAW_PRICE_PROVIDER=<provider> \
  -v "$PWD/ic-data:/data" \
  ghcr.io/argonautsystems/ic-engine:4.7.7-cpu
# health: curl http://localhost:18090/healthz   • dashboard: http://localhost:18092
# MCP endpoint for any client: http://localhost:18090/mcp
```

Drop your key into `ic-data/keys.env` (`<PROVIDER>_API_KEY=...`) and the service
resolves it at startup — keys live only in your mounted volume.

---

## Narration models (consultant + narrator)

Narration is two-stage and **independent of the price provider**: a *consultant*
compresses the signed envelope into a fact-faithful summary, then a *narrator*
enriches it into the answer. The signed envelope is ground truth — neither stage
can fabricate past it. The 30-prompt hallucination battery
([`harness/cobol/PROVIDER_HALLUCINATION_REPORT.md`](../harness/cobol/PROVIDER_HALLUCINATION_REPORT.md))
settled the recommended defaults:

| Stage | Recommended | Why | Env vars |
|---|---|---|---|
| **Consultant** | `deepseek-v4-flash` (direct DeepSeek API) | Cheapest ($0.14/$0.28 per M, $0.0028 cached) and matches `gemma-4-31B` quality with better coverage | `INVESTORCLAW_CONSULTANT_ENDPOINT`, `_MODEL`, `_API_KEY` |
| **Narrator** | `gemini-3.1-pro` (lowest fabrication) — or `llama-3.3-70b` on Groq/Together for max coverage | Cleanest narration; llama for high throughput/low cost | `INVESTORCLAW_NARRATIVE_ENDPOINT`, `_MODEL`, `_API_KEY` |

```bash
# consultant — DeepSeek direct (cheapest)
INVESTORCLAW_CONSULTANT_ENDPOINT=https://api.deepseek.com/v1
INVESTORCLAW_CONSULTANT_MODEL=deepseek-v4-flash
INVESTORCLAW_CONSULTANT_API_KEY=<your DeepSeek key>
# narrator — Gemini (cleanest)
INVESTORCLAW_NARRATIVE_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/openai
INVESTORCLAW_NARRATIVE_MODEL=gemini-3.1-pro-preview
INVESTORCLAW_NARRATIVE_API_KEY=<your Gemini key>
```

**All-DeepSeek budget stack:** for the cheapest end-to-end setup, use
`deepseek-v4-pro` as the narrator too (set `INVESTORCLAW_NARRATIVE_MODEL=deepseek-v4-pro`
against the DeepSeek endpoint). Its hallucination is mid-pack (≈1.1 ungrounded
numbers/answer vs gemini's 0.3) but at a fraction of the cost — a reasonable
trade when budget dominates.

Both stages take any OpenAI-compatible endpoint. Omit the consultant vars to
narrate directly from the compressed feed (single LLM call); on any LLM failure
the engine falls back to a heuristic that restates only signed data.

---

## Provider reference

InvestorClaw treats whichever paid provider you set as its market-data source
across the whole surface. Capabilities differ by provider — the full matrix is
in **[docs/PROVIDERS.md](PROVIDERS.md)**. The big differentiators:

| Capability | Provider notes |
|---|---|
| **Batch equity/ETF quotes** | `massive` does one call for all symbols — required for 100+ symbol portfolios where the free `yfinance` path rate-limits. `finnhub`/`alpha_vantage` are sequential. |
| **CME futures** | `massive` only — `/futures/vX` snapshot + history (CBOT/CME/NYMEX/COMEX). No other provider routes futures. |
| **Notional valuation** | Engine carries the CME dollar-multiplier map; a contract symbol values to `price × multiplier × contracts` automatically (any provider that returns a futures quote). |
| **Analyst ratings** | `finnhub` (1st), `yfinance`. |
| **News / FX / Treasury yields** | Auxiliary providers (`marketaux`, `frankfurter`, FRED) — see PROVIDERS.md. |

**Provider selection**

- `INVESTORCLAW_PRICE_PROVIDER=<provider>` — force one provider only (no fallback).
- `INVESTORCLAW_PRICE_PROVIDER=auto` (default) — Massive is auto-pinned when
  `MASSIVE_API_KEY` is set; otherwise free `yfinance`.

**Massive futures ticker format** — standard `<product><month-code><year>`, e.g.
`ESH7` (E-mini S&P, Mar '27), `GCF7` (gold, Jan '27). Broker slash/at prefixes
(`/ESZ25`, `@GCZ25`) are accepted. Covered products include ES/MES, NQ/MNQ, YM,
RTY, CL/MCL, NG, GC/MGC, SI, HG, the ZT/ZF/ZN/ZB rate complex, 6E/6J FX, grains,
and CME crypto.

**Keys** — set the provider's key (env or the mounted `keys.env`). Keys are read
at runtime and never baked into the image.

---

## Notes

- **No build step.** Engine + `clio` foundation library are in the image. You
  never clone a source repo or run `uv sync`.
- **Any agent, same container.** Claude Code, Claude Desktop, OpenClaw, ZeroClaw,
  and Hermes all install the same skill and drive the same container — the only
  difference is the installer command above.
- **Any broker.** Swap in any Schwab / Fidelity / Vanguard / UBS CSV, XLS, or PDF
  export — the setup wizard auto-detects the format.
- **Source.** Engine: <https://github.com/argonautsystems/ic-engine> ·
  Primitives: <https://github.com/argonautsystems/clio> ·
  Provider matrix: [docs/PROVIDERS.md](PROVIDERS.md).

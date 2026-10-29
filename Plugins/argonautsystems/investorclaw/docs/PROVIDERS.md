# Market data providers

InvestorClaw resolves prices, news, and benchmarks from a pluggable provider
chain. Keys are optional — with none set it falls back to free yfinance. Set
keys in the container's mounted `keys.env` (or as env vars); they are read at
runtime and never baked into the image.

## Price providers

Select with `INVESTORCLAW_PRICE_PROVIDER=auto|yfinance|massive|finnhub|alpha_vantage`
(`auto` is the default; it pins Massive when `MASSIVE_API_KEY` is set, else
yfinance).

| Provider | Key | Tier | Batch? | Notes | Verified |
|---|---|---|---|---|---|
| `yfinance` | — | free | partial | Default fallback. Rate-limits globally on 100+ symbols under load | ✅ |
| `massive` | `MASSIVE_API_KEY` | paid | yes | Primary paid provider. Batch quotes **and CME futures** via `/futures/vX` with contract-multiplier notional | ✅ (incl. futures) |
| `massive` | `MASSIVE_API_KEY` | paid | yes | Alias of `massive` | ✅ |
| `finnhub` | `FINNHUB_KEY` | free 60/min | no | Quotes + analyst data; sequential (slow on large portfolios) | ✅ |
| `alpha_vantage` | `ALPHA_VANTAGE_KEY` | free 25/day, 5/min | no | Supplemental only; free tier throttles multi-symbol runs | ✅ (partial on free tier) |

**Recommendation by size:** 1–100 symbols → yfinance is fine; 100+ symbols or
any futures → `massive`.

## News, benchmarks, FX (auxiliary)

| Provider | Key | Role |
|---|---|---|
| `marketaux` | `MARKETAUX_API_KEY` | Per-symbol news + sentiment |
| `newsapi` | `NEWSAPI_KEY` | Headline news |
| FRED | `FRED_API_KEY` | Treasury yield-curve benchmarks (bond analytics) |
| `treasury_fiscaldata` | — | Treasury fallback, no key |
| `frankfurter` | — | FX rates, no key |


## Feature support matrix

Which provider serves which capability, derived from the engine's routing table
(`_OP_ROUTING`). The engine tries providers left-to-right (priority order) and
falls through on failure; `INVESTORCLAW_PRICE_PROVIDER` can force a single
price provider. ✓ = serves it; **1st** = default/preferred; "only" = sole source.

| Provider | Quotes | Batch quotes | History | **Futures** | News | Analyst ratings | FX | Treasury yields |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `massive`  | ✓ **1st** | ✓ | ✓ **1st** | ✓ **only** | ⚠︎ impl, unrouted | ✗ | ✗ | ✗ |
| `finnhub` | ✓ | sequential | ✓ | – | ✓ | ✓ **1st** | – | – |
| `alpha_vantage` | ✓ | sequential | ✓ | – | – | – | ✓ | – |
| `yfinance` | ✓ | partial | ✓ | – | ✓ | ✓ | – | – |
| `marketaux` | – | – | – | – | ✓ **1st** | – | – | – |
| `newsapi` | – | – | – | – | ✓ | – | – | – |
| `frankfurter` | – | – | – | – | – | – | ✓ **1st** | – |
| `treasury_fiscaldata` | – | – | – | – | – | – | – | ✓ **only** |


**Legend:** ✓ served · **1st** default/preferred · "only" sole source · ✗ not
supported · ⚠︎ *implemented in the provider class but not in the routing table,
so the engine never calls it today*.

**About Massive beyond prices/futures:**
- **News** — the Massive client *does* implement per-ticker news
  (`list_ticker_news`), but `news` routing currently prefers the dedicated news
  providers (marketaux → finnhub → newsapi → yfinance) and Massive is **not in
  that list**, so it is not used for news today.
- **Analyst ratings** — **not supported**: the Massive provider raises
  `NotImplementedError` ("Massive does not provide analyst recommendations —
  use Finnhub or yfinance"). (A Benzinga-via-Massive analyst feed exists on the
  partner plan but is not yet wired into the engine.)
- **FX / Treasury yields** — **not implemented** on the Massive provider; FX
  comes from Frankfurter, treasury yields from the US Treasury FiscalData API.

### Routing order per feature (first available wins)

| Feature | Provider priority |
|---|---|
| Quotes | massive → finnhub → alpha_vantage → yfinance |
| History | massive → alpha_vantage → finnhub → yfinance |
| Futures (CME) | massive *(only)* |
| News | marketaux → finnhub → newsapi → yfinance |
| General market news | finnhub → marketaux |
| Analyst ratings | finnhub → yfinance |
| FX | frankfurter → alpha_vantage |
| Treasury yields | treasury_fiscaldata *(only)* |

Notes:
- **Batch quotes**: only `massive` is a true batch endpoint (one call for all
  symbols). `finnhub`/`alpha_vantage` are sequential (slow + rate-limited on
  large portfolios); `yfinance` batches but rate-limits globally past ~100
  symbols. → use `massive` for 100+ symbols.
- **Futures** are CME contract tickers (`/futures/vX`) that only `massive`
  serves; no fallback.
- **Treasury yields** (bond benchmarking) come from the keyless US Treasury
  FiscalData API; `FRED_API_KEY` augments macro/benchmark coverage elsewhere.


## Massive API surface (provider-level) vs InvestorClaw integration

Massive's platform (REST + WebSocket + Flat Files) covers far more than
InvestorClaw currently routes. This separates **what Massive offers** from
**what the engine integrates today**.

| Massive category | Massive offers | InvestorClaw integration today |
|---|---|---|
| Stocks / ETFs quotes + aggregates | ✓ REST + WS + Flat Files | ✓ quotes, history |
| Futures (CME) | ✓ `/futures/vX` | ✓ quotes, history, notional |
| News (+ sentiment) | ✓ `/v2/reference/news` | implemented in provider, **not routed** (news → marketaux/finnhub) |
| Options | ✓ | ✗ not integrated |
| Indices | ✓ | ✗ not integrated |
| Forex (FX) | ✓ | ✗ (engine uses Frankfurter) |
| Crypto | ✓ | partial (symbol classify only) |
| Economy | ✓ | ✗ (engine uses Treasury FiscalData) |
| Analyst ratings | ✗ **not offered by Massive** | engine uses Finnhub / yfinance |
| Access: WebSocket (live) | ✓ | ✗ **planned** |
| Access: Flat Files (bulk CSV) | ✓ | ✗ **planned** (bulk analysis pipeline) |

Notes:
- **Analyst ratings**: confirmed *not* a Massive product — the Massive provider
  raises `NotImplementedError` and the engine routes analyst to Finnhub/yfinance.
- **News**: Massive *does* offer news with sentiment (`/v2/reference/news`); the
  provider implements it but the engine's news routing currently prefers the
  dedicated news providers. Wiring Massive into the news chain is a small change.
- **Roadmap**: WebSocket (live quotes/trades) and Flat Files (bulk historical
  CSV for backtesting / offline analysis) are not yet wired. See
  [docs/ROADMAP_MASSIVE.md](ROADMAP_MASSIVE.md).

## Futures (Massive only)

CME Globex (CBOT/CME/NYMEX/COMEX) via Massive's `/futures/vX`. Tickers are
`<product><month-code><year>` (e.g. `ESH7`, `GCF7`); broker `/`-/`@`-prefixes
accepted. The engine carries the CME dollar-multiplier map, so a contract
values to `price × multiplier × contracts` automatically. See
[Getting Started](GETTING_STARTED.md).

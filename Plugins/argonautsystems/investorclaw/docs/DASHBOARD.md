# Dashboard Portal
## What is the Dashboard?
The InvestorClaw dashboard is the human surface.
Agents can ask `portfolio_ask` a natural-language question and get back a
grounded answer. The dashboard exists for the other half of the job: inspecting
the portfolio, seeing what data is already on disk, uploading a new statement,
regenerating the analytics, checking provider keys, and opening saved reports
without turning every click into a chat prompt.
In v4.5.0 the portal is served by the bridge FastAPI app. Inside the container
it binds to `IC_DASHBOARD_BIND`, which defaults to `0.0.0.0:8092`. The standard
Docker path publishes that listener to the host as:
```text
http://localhost:18092
```
The app is server-rendered. There is no frontend build step, no client-side
state machine, and no hidden browser dependency. Each tab is a FastAPI route
that returns a complete HTML page. Most tabs read JSON snapshots from
`/data/reports/`; the Settings tab also writes to `/data/keys.env` and
`/data/portfolios/`.
The intent is blunt: portfolio math stays deterministic, provider calls stay in
the engine, and the browser gives you a readable control panel for the artifacts
those systems create.
## Quick Start
1. Start the runtime container.
2. Open `http://localhost:18092`.
3. Go to Settings and upload a portfolio file if one is not already mounted.
4. Add provider keys only if you want richer data than the zero-key fallback.
5. Return to Overview and click Regenerate.
6. Give the sweep a few minutes, then move through Holdings, Performance, Bonds,
   Analyst, News, Synthesis, and Reports.
Useful local URLs:
- Dashboard: `http://localhost:18092`
- Overview: `http://localhost:18092/`
- Reports archive: `http://localhost:18092/reports/`
- Dashboard liveness: `http://localhost:18092/healthz`
- Bridge version: `http://localhost:18092/api/version`
- MCP endpoint for agents: `http://localhost:18090/mcp`
The dashboard and MCP server share the same bridge process and the same
ic-engine session. The dashboard is for your eyes and hands. The MCP endpoint is
for agents and automations.
## The 17 Tabs
The top nav is driven by the dashboard `TABS` list. The 17 entries are:
Overview, Holdings, Performance, What Changed, Scenarios, Bonds, Optimize,
Cashflow, Peer, Analyst, News, Markets, Lookup, Synthesis, Reports, Settings,
and About.
Each section below names the route, the JSON files read from `/data/reports/`,
the NLQ prompt IDs from `harness/cobol/nlq-prompts.json`, and the empty state you
see before the relevant analyzer has produced data.
### 1. Overview
What it shows:
- Engine init status from the bridge init-state callable.
- Whether the engine is ready.
- Total portfolio value, equity value, bond value, cash value, and position
  count from `holdings_summary.json`.
- A link to today's generated EOD HTML report when it exists.
- Up to seven recent `eod_report_*.html` files.
- Quick links to `/reports/`, `/healthz`, and `/api/version`.
- The Regenerate button.
NLQ prompt coverage:
- `p23-eod-1`: generate today's EOD report.
- `p24-eod-2`: daily portfolio summary.
JSON source files:
- `/data/reports/holdings_summary.json`
URL slug:
- `/`
Empty state:
- The page still renders even before data exists.
- Portfolio KPIs show zero-style values when `holdings_summary.json` is absent.
- Today's report area says there is no EOD report for the current date.
- Recent reports says no reports have been generated yet.
### 2. Holdings
What it shows:
- Portfolio summary KPIs: total value, positions, unrealized gain/loss, equity,
  bonds, cash, and crypto.
- Sector allocation when sector weights are present.
- Account breakdown when account data is present.
- Full position-level table from the raw CDM holdings snapshot when available.
- Fallback top-equity holdings when full raw position detail is unavailable.
NLQ prompt coverage:
- `p01-holdings-1`: current portfolio contents.
- `p02-holdings-2`: current holdings.
- `p11-target-allocation`: target allocation.
- `p28-lookup-accounts`: brokerage accounts.
JSON source files:
- `/data/reports/holdings_summary.json`
- `/data/reports/.raw/holdings.json`
- `/data/reports/analyst_recommendations_summary.json`
URL slug:
- `/dashboard/holdings`
Empty state:
- If `holdings_summary.json` is absent, the tab says there is no holdings data
  yet and tells the user to drop a portfolio file into `./portfolios/` and run
  setup in the container.
- If summary data exists but raw positions do not, the tab falls back to top
  equity holdings or says there is no position-level detail.
### 3. Performance
What it shows:
- Performance summary rendered through the engine EOD template helpers.
- The rendered content is whatever the engine writes into `performance.json`,
  normally risk and return metrics such as Sharpe, Sortino, drawdown, and period
  returns.
NLQ prompt coverage:
- `p03-performance-1`: portfolio performance this year.
- `p04-performance-2`: Sharpe ratio and max drawdown.
JSON source files:
- `/data/reports/performance.json`
URL slug:
- `/dashboard/performance`
Empty state:
- If `performance.json` is absent, the tab says there is no performance data and
  tells the user to run `investorclaw performance` in the container.
- If engine rendering helpers cannot be imported, it says the helpers are
  unavailable.
### 4. What Changed
What it shows:
- Day-over-day attribution and top-mover style output rendered by the engine EOD
  template helper for the `whatchanged` section.
NLQ prompt coverage:
- None in the v2.5.0 30-prompt NLQ set.
- This is still a first-class dashboard tab and is refreshed by the Regenerate
  sweep.
JSON source files:
- `/data/reports/whatchanged.json`
URL slug:
- `/dashboard/whatchanged`
Empty state:
- If no attribution snapshot exists, the tab says there is no attribution data
  and tells the user to run `investorclaw whatchanged` in the container.
- If template helpers are unavailable, it reports that instead of guessing.
### 5. Scenarios
What it shows:
- Scenario and stress-test output rendered through the engine scenario helper.
- The dashboard labels this page "Scenarios & Stress Tests".
NLQ prompt coverage:
- None directly mapped in the v2.5.0 30-prompt NLQ set.
- Rebalance-oriented prompts are covered by Optimize because that tab reads the
  rebalance outputs.
JSON source files:
- `/data/reports/scenario.json`
URL slug:
- `/dashboard/scenarios`
Empty state:
- If `scenario.json` is absent, the tab says there is no scenario data and tells
  the user to run `investorclaw scenario` in the container.
- If render helpers are unavailable, the tab shows an engine-helper empty state.
### 6. Bonds
What it shows:
- Fixed-income summary rendered through the engine bond-summary helper.
- The underlying section is for yield-to-maturity, duration, and bond ladder
  style analysis when the engine output contains those fields.
NLQ prompt coverage:
- `p14-bond-strategy`: bond laddering strategy given current rates.
- `p15-bonds-1`: bond exposure and yield-to-maturity.
JSON source files:
- `/data/reports/bond_analysis.json`
URL slug:
- `/dashboard/bonds`
Empty state:
- If `bond_analysis.json` is absent or empty, the tab says there is no bond data,
  notes that the portfolio may have no bond holdings, and suggests running
  `investorclaw bonds`.
- If engine helpers are unavailable, the tab says so.
### 7. Optimize
What it shows:
- Sharpe-maximizing allocation.
- Minimum-volatility allocation.
- Rebalance trades.
- Tax-aware rebalance trades when available.
- Allocation tables include expected Sharpe and expected volatility when present
  in the optimizer output.
NLQ prompt coverage:
- `p09-optimize-sharpe`: allocation that maximizes Sharpe.
- `p10-optimize-minvol`: minimum-volatility allocation.
- `p12-rebalance-1`: whether to rebalance.
- `p13-rebalance-tax`: tax-aware rebalance.
JSON source files:
- `/data/reports/optimize.json`
- `/data/reports/rebalance.json`
- `/data/reports/rebalance_tax.json`
URL slug:
- `/dashboard/optimize`
Empty state:
- If `optimize.json` is absent, the tab says no optimization has run yet and
  suggests `investorclaw optimize` or the Overview Regenerate button.
- If neither rebalance JSON exists, the rebalance section says to run
  `investorclaw rebalance` or `investorclaw rebalance-tax`.
### 8. Cashflow
What it shows:
- Forward-looking dividends and bond coupons.
- KPI tiles for next quarter, next 12 months, annual dividends, and annual
  coupons when those fields exist.
- A schedule table by symbol, type, date, amount, and yield when the engine
  writes a schedule-like structure.
NLQ prompt coverage:
- `p25-cashflow`: projected cash flow from dividends and bond coupons next
  quarter.
JSON source files:
- `/data/reports/cashflow.json`
URL slug:
- `/dashboard/cashflow`
Empty state:
- If `cashflow.json` is absent, the tab says there is no cashflow data and tells
  the user to run `investorclaw cashflow` in the container.
### 9. Peer
What it shows:
- Portfolio comparison against broad-market benchmarks such as VTI, SPY, and
  AGG when the engine output provides them.
- Portfolio metrics such as total return, annualized return, Sharpe, and max
  drawdown.
- Benchmark rows with return, annualized return, Sharpe, max drawdown,
  correlation, and beta.
NLQ prompt coverage:
- `p26-peer`: compare portfolio to a benchmark like VTI.
JSON source files:
- `/data/reports/peer.json`
URL slug:
- `/dashboard/peer`
Empty state:
- If `peer.json` is absent, the tab says no peer comparison exists yet and tells
  the user to run `investorclaw peer` in the container.
### 10. Analyst
What it shows:
- Analyst coverage rendered through the engine analyst-summary helper.
- The engine output is expected to carry consensus, price-target, and analyst
  coverage data when provider data is available.
NLQ prompt coverage:
- `p05-analyst-1`: what Wall Street analysts think of top holdings.
JSON source files:
- `/data/reports/analyst_recommendations_summary.json`
URL slug:
- `/dashboard/analyst`
Empty state:
- If analyst JSON is absent or renders empty, the tab says there is no analyst
  data and tells the user to run `investorclaw analyst`.
- If engine helpers are unavailable, it says the helpers are unavailable.
### 11. News
What it shows:
- News coverage KPIs: symbols covered, symbols with news, total items, and last
  fetch timestamp.
- Editorial summary from `portfolio_news.json` when present.
- Per-symbol news blocks from `portfolio_news_cache.json`.
- Headline links, source, publish date, sentiment, confidence, impact percent,
  and a short item summary when those fields exist.
- A skipped-symbols block when the provider did not return data or a rate limit
  was hit.
NLQ prompt coverage:
- `p06-news-holdings-1`: news on holdings today.
- `p16-news-merger`: mergers and acquisitions in the news.
- `p19-news-general`: financial markets news today.
JSON source files:
- `/data/reports/portfolio_news_cache.json`
- `/data/reports/portfolio_news.json`
URL slug:
- `/dashboard/news`
Empty state:
- If neither news JSON file exists, the tab says there is no news data yet and
  tells the user to run `investorclaw news` in the container.
### 12. Markets
What it shows:
- A broad market snapshot for indices, crypto, foreign exchange, and fixed
  income or yields.
- Price and percentage-change tables for each populated group.
- A summary or narrative block when the engine writes one.
NLQ prompt coverage:
- `p17-news-crypto`: crypto market news.
- `p18-news-forex`: dollar and EUR/USD context.
- `p21-deflect-market`: current price lookup route.
- `p22-market-data`: S&P 500 market data.
JSON source files:
- `/data/reports/markets.json`
URL slug:
- `/dashboard/markets`
Empty state:
- If `markets.json` is absent, the tab says there is no markets snapshot yet and
  suggests running `investorclaw markets` or clicking Regenerate.
### 13. Lookup
What it shows:
- A symbol lookup form.
- Cached per-symbol quote and fundamentals when a matching lookup JSON file
  exists.
- Last price, change, market cap, P/E, dividend yield, sector, and business
  summary when those fields are present.
NLQ prompt coverage:
- `p27-lookup-ticker`: tell me about AAPL.
JSON source files:
- `/data/reports/lookup_<symbol>.json`
- `/data/reports/lookup/<SYMBOL>.json`
URL slug:
- `/dashboard/lookup`
Empty state:
- With no symbol, the tab shows the lookup form and waits.
- With a symbol but no cached JSON, it says no cached lookup exists for that
  symbol and tells the user to run `investorclaw lookup <SYMBOL>` in the
  container or wait for the next Regenerate sweep.
### 14. Synthesis
What it shows:
- Portfolio narrative from `portfolio_analysis.json`.
- Optional financial-advisor discussion topics when the engine helper import
  succeeds.
- This is where the readable, multi-factor advisor-style narrative lands after
  the deterministic sections have produced data.
NLQ prompt coverage:
- `p07-synth-1`: full picture of the portfolio.
- `p08-synth-2`: portfolio risk analysis.
JSON source files:
- `/data/reports/portfolio_analysis.json`
URL slug:
- `/dashboard/synthesis`
Empty state:
- If `portfolio_analysis.json` is absent, the tab says there is no synthesis
  data and tells the user to run `investorclaw synthesize`.
### 15. Reports
What it shows:
- Up to 50 generated `eod_report_*.html` files.
- Report filename, size, and modification time.
- A JSON snapshots list containing every top-level `*.json` file in
  `/data/reports/`.
NLQ prompt coverage:
- `p23-eod-1`: generate today's EOD report.
- `p24-eod-2`: daily portfolio summary.
JSON source files:
- `/data/reports/*.json`
URL slug:
- `/dashboard/reports`
Empty state:
- If there are no `eod_report_*.html` files, the tab says no EOD reports have
  been generated yet.
- The JSON snapshot list is only shown after at least one EOD HTML report exists.
### 16. Settings
What it shows:
- Provider key status by allowlisted key name.
- A form to add or update one key at a time.
- Existing uploaded portfolio files from `/data/portfolios/`.
- A portfolio upload form for supported broker or portfolio files.
- Upload success and key-save messages after redirects.
NLQ prompt coverage:
- None directly mapped as a dashboard tab in the v2.5.0 30-prompt NLQ set.
- Setup and guardrail prompts are covered by About because that page carries the
  first-time setup and disclaimer material.
JSON source files:
- None. Settings reads key status through the key-management tool and portfolio
  files from `/data/portfolios/`; it does not read a reports JSON snapshot.
URL slug:
- `/dashboard/settings`
Empty state:
- If no keys are configured, every allowlisted key displays as not set.
- If no portfolio files are present, the file table says no portfolio files have
  been uploaded yet.
### 17. About
What it shows:
- InvestorClaw purpose and version-family statement.
- Educational-only disclaimer.
- License split: Apache 2.0 for substantive service code, MIT-0 for
  distribution-edge artifacts.
- Repository links.
- Glossary entries for core portfolio metrics.
- First-time setup flow.
- Guardrails language.
NLQ prompt coverage:
- `p20-deflect-concept`: explain yield-to-maturity.
- `p29-setup`: first-time setup.
- `p30-guardrails`: financial-advice guardrails.
JSON source files:
- None. About is static server-rendered content.
URL slug:
- `/dashboard/about`
Empty state:
- None. About always renders because it does not depend on generated report
  artifacts.
## The Regenerate Button
Regenerate is the big blue button on Overview. It posts to:
```text
POST /dashboard/regenerate
```
The route does not block the browser for the whole job. It starts a background
task and redirects back to Overview with a message that the sweep has started.
The dashboard text estimates roughly three to five minutes for a 200-position
portfolio.
The actual sweep order in the bridge is:
1. `setup`
2. `refresh`
3. `performance`
4. `bonds`
5. `analyst`
6. `news`
7. `whatchanged`
8. `scenario`
9. `optimize`
10. `rebalance`
11. `cashflow`
12. `peer`
13. `markets`
14. `synthesize`
The first two steps are special. `setup` re-discovers uploaded files and is
expected to be fast and idempotent. `refresh` pulls fresh prices for every
position and gets the longest timeout. Each analyzer after that writes its own
section JSON under `/data/reports/`.
A failing analyzer does not abort the rest of the sweep. The bridge records an
error result for that section and continues. That is intentional: a news-rate
limit should not prevent performance, bonds, reports, or synthesis data from
refreshing.
## Portfolio Upload
The dashboard upload form lives on Settings and posts to:
```text
POST /dashboard/upload
```
The form field is `portfolio_file`. The dashboard sanitizes the filename, writes
it into `/data/portfolios/`, attempts to set mode `0644`, and queues the same
regeneration callable used by the Overview button.
The dashboard accepts these extensions in the browser form:
- `.csv`
- `.tsv`
- `.xls`
- `.xlsx`
- `.pdf`
- `.json`
- `.ofx`
- `.qfx`
The first-run `/setup/portfolio` form is stricter and accepts only `.csv`,
`.xls`, `.xlsx`, and `.pdf`. That is a separate setup surface. For v4.5.0 day
to day use, Settings is the friendlier dashboard path.
The upload does not connect to a brokerage account. It stores a file for the
local engine to parse. InvestorClaw analyzes portfolio files; it does not log in
to your broker and it does not move money.
## Provider Keys
Provider keys are optional. InvestorClaw can still use fallback data paths, but
keys unlock better provider coverage, faster quotes, richer analyst data, and
news sentiment.
The canonical key catalogue in v4.5.0 contains these eight names:
- `TOGETHER_API_KEY` - narrative synthesis through Together AI, with
  MiniMaxAI/MiniMax-M2.7 as the recommended default.
- `OPENAI_API_KEY` - alternative LLM provider for narrative synthesis.
- `FINNHUB_KEY` - real-time quotes and analyst ratings.
- `FRED_API_KEY` - Treasury and TIPS yield curves.
- `NEWSAPI_KEY` - news correlation for held positions.
- `ALPHA_VANTAGE_KEY` - supplemental price data.
- `MASSIVE_API_KEY` - fundamentals, ratios, and peer comparisons through the
  FMP/Massive path; added in v4.5.0.
- `MARKETAUX_API_KEY` - per-symbol news with sentiment; added in v4.5.0.
Settings uses the MCP key-management implementation behind the scenes:
- `portfolio_keys_status` returns configured key names, missing key names, and
  the key file path. It never returns key values.
- `portfolio_keys_set` accepts only allowlisted names.
- `portfolio_keys_delete` deletes only allowlisted names.
Keys persist to:
```text
/data/keys.env
```
The save path writes mode `0600`. The bridge also mirrors newly saved keys into
`os.environ` so later engine subprocesses can use them without a container
restart.
Important operator detail: the allowlist is the gate. Arbitrary environment
variable names are rejected by `portfolio_keys_set`. That is by design; this
surface is for provider keys, not general container mutation.
## Reports Archive
There are two report surfaces:
- `/dashboard/reports` is the dashboard tab.
- `/reports/` is the static file mount over `/data/reports/`.
The Reports tab is curated. It lists recent EOD HTML reports and then exposes
JSON snapshots after reports exist. The `/reports/` mount is direct browsing of
the generated directory.
Common report artifacts include:
- `holdings_summary.json`
- `.raw/holdings.json`
- `performance.json`
- `whatchanged.json`
- `scenario.json`
- `bond_analysis.json`
- `analyst_recommendations_summary.json`
- `portfolio_news_cache.json`
- `portfolio_news.json`
- `optimize.json`
- `rebalance.json`
- `rebalance_tax.json`
- `cashflow.json`
- `peer.json`
- `markets.json`
- `portfolio_analysis.json`
- `eod_report_YYYYMMDD.html`
The dashboard does not fabricate missing reports. If a file is absent, the
owning tab shows its empty state. That is better than a pretty lie.
## Healthz + Telemetry
The dashboard app exposes:
```text
GET /healthz
GET /api/version
```
`/healthz` returns bridge liveness plus init telemetry:
- `init_state`
- `init_ready`
- `init_current_stage`
- `init_elapsed_ms`
This is useful for humans refreshing the browser and for agents that need to
wait until initialization is ready before asking portfolio questions.
`/api/version` returns the bridge service version payload.
InvestorClaw does not have product analytics in the dashboard. The useful
telemetry is operational: whether the bridge is alive, whether initialization is
ready, and which generated artifacts are present under `/data/reports/`.
## Pairing With the MCP-HTTP Surface
The dashboard is not a replacement for MCP. It pairs with it.
Use the dashboard when you want to:
- Upload a portfolio file.
- See what reports exist.
- Check which provider keys are configured.
- Inspect generated JSON and HTML artifacts.
- Trigger a full refresh without opening an agent chat.
Use MCP when an agent should:
- Answer a natural-language portfolio question through `portfolio_ask`.
- Fetch holdings through `portfolio_holdings`.
- Refresh engine data through `portfolio_refresh`.
- Run setup through `portfolio_setup`.
- Poll initialization through `portfolio_initialize_status`.
- Warm the engine through `portfolio_initialize`.
- Manage keys through `portfolio_keys_status`, `portfolio_keys_set`, and
  `portfolio_keys_delete`.
Both surfaces point at the same local runtime. The dashboard runs on host port
`18092`; MCP-HTTP runs on host port `18090` at `/mcp`.
## Customization
The bridge exposes a few environment-controlled paths and bind addresses:
- `IC_DASHBOARD_BIND` defaults to `0.0.0.0:8092`.
- `IC_MCP_BIND` defaults to `0.0.0.0:8090`.
- `IC_REPORTS_DIR` defaults to `/data/reports`.
- `IC_PORTFOLIO_DIR` defaults to `/data/portfolios`.
- `IC_KEYS_FILE` defaults to `/data/keys.env`.
- `IC_INITIALIZE_ON_BOOT` defaults to enabled.
The dashboard itself is intentionally plain. It is server-rendered HTML with a
shared shell and tab navigation. If you brand or extend it, keep the contract
clean:
- Tabs should keep reading generated JSON, not recompute portfolio math.
- Key forms should stay allowlist-gated.
- Uploads should remain local files under the configured portfolio directory.
- Missing data should stay visible as missing data.
## Limitations and Roadmap
Current limitations:
- The dashboard is not a trading terminal.
- It does not schedule recurring report generation by itself.
- It does not authenticate users; it is meant for localhost-first deployment.
- It does not store brokerage credentials.
- It does not guarantee every provider field exists in every JSON snapshot.
- Some tabs depend on engine template helpers for rendering.
- Lookup is cache-backed; if there is no cached symbol JSON, the tab tells you
  to run a lookup or wait for a refresh.
- Settings shows provider key status by name only, never values.
Roadmap-shaped gaps:
- Richer per-tab diagnostics when a section analyzer fails.
- More direct links from empty states to the exact MCP or REST call that would
  populate the section.
- Better distinction between missing data, provider rate limits, and
  portfolio-has-no-such-asset empty states.
- A first-run checklist that unifies `/setup` and `/dashboard/settings`.
The important boundary should not move: the LLM can narrate, but it does not do
portfolio math. The dashboard can display and trigger, but it should not become
a second analysis engine.
## Troubleshooting
Dashboard does not open:
- Check `http://localhost:18092`.
- Confirm the container published dashboard port `8092` to host port `18092`.
- Check `IC_DASHBOARD_BIND` if you changed the default bind.
Health check works but tabs are empty:
- Open Overview and click Regenerate.
- Confirm `/data/reports/` is writable inside the container.
- Check whether `setup` found a portfolio file under `/data/portfolios/`.
Holdings is empty:
- Upload a portfolio file from Settings.
- Confirm the file appears in the Settings portfolio file table.
- Regenerate after upload.
Performance, Bonds, Analyst, or News is empty:
- Regenerate first.
- Add provider keys for richer data.
- Remember that a portfolio with no bond holdings can make Bonds legitimately
  sparse.
News has skipped symbols:
- Provider data may not exist for those tickers.
- A provider rate limit may have been hit.
- Add or rotate `NEWSAPI_KEY` and `MARKETAUX_API_KEY` if news coverage matters.
Analyst data is empty:
- Add `FINNHUB_KEY`.
- Regenerate after saving the key.
Treasury or fixed-income context is thin:
- Add `FRED_API_KEY`.
- Regenerate Bonds and Markets through the full sweep.
Synthesis is empty:
- Add `TOGETHER_API_KEY` or `OPENAI_API_KEY` for narrative generation.
- Regenerate after the deterministic tabs have populated.
Upload succeeds but nothing changes:
- The upload queues a background refresh and redirects immediately.
- Wait a few minutes for setup, refresh, and analyzers to finish.
- Refresh the target tab after the sweep has had time to write JSON.
Reports archive is empty:
- Generate an EOD report through the agent flow or run the report path in the
  engine.
- The Reports tab lists `eod_report_*.html`; raw JSON alone is not enough to
  populate the top report table.
## See Also
- [MCP tools reference](MCP_TOOLS_REFERENCE.md)
- [Stonkmode](STONKMODE.md)
- [Capabilities](../CAPABILITIES.md)
- [README](../README.md)

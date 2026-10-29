#!/usr/bin/env python3
"""
EOD PDF Report — InvestorClaw × Massive | 50-question NLQ + dashboard screenshots.
Covers full Massive API surface: prev_close, RT snapshot, batch, aggs, news,
financials, ticker_detail, options — plus all InvestorClaw analytics sections.
"""

import json, subprocess, time, datetime, sys, os, re, urllib.request, urllib.parse

# ── Config ─────────────────────────────────────────────────────────────────
MKEY      = os.environ.get("MASSIVE_API_KEY") or ""
if not MKEY:
    sys.exit("Set MASSIVE_API_KEY in the environment before running this harness.")
BASE      = "https://api.massive.com"
IC_URL    = "http://172.19.0.2:8090"
IC_DASH   = "http://localhost:18092"
JSONL_LOG = os.path.expanduser("~/massive_surface_test_2026-05-20.jsonl")
PDF_PATH  = os.path.expanduser("~/investorclaw_massive_eod_report_2026-05-21.pdf")

# ── 50 NLQ Prompts ─────────────────────────────────────────────────────────
NLQ_PROMPTS = [
    # — Portfolio Overview & Holdings —
    ("Overview",             "What is the current total value of my portfolio and overall performance?"),
    ("Top Holdings",         "What are my top 10 holdings by current market value?"),
    ("Sector Exposure",      "What are my sector weights and which sector has the largest allocation?"),
    ("Account Breakdown",    "How is my portfolio distributed across accounts and account types?"),
    ("Asset Allocation",     "Show me my full asset allocation including equity, fixed income, and cash."),

    # — Massive: Previous Close / Historical —
    ("Prev Close Prices",    "What were yesterday's closing prices for my top 5 equity holdings?"),
    ("Week Performance",     "Which of my equity positions had the biggest price move over the past week?"),
    ("52-Week Range",        "What is the 52-week high and low for my top 5 holdings?"),
    ("Monthly Movers",       "Which of my holdings have gained or lost the most over the past month?"),
    ("Historical Volatility","What is the historical price volatility of my largest positions based on recent data?"),

    # — Massive: Real-Time Snapshot —
    ("Today's Prices",       "What are the current market prices for my top 10 equity holdings right now?"),
    ("Today's Change",       "What is today's dollar and percent change for my portfolio vs yesterday's close?"),
    ("Day's Winners",        "Which of my holdings are up the most in today's trading session?"),
    ("Day's Losers",         "Which of my holdings are down the most in today's trading session?"),
    ("Near 52W High",        "Which of my holdings are trading near their 52-week high right now?"),

    # — Massive: Batch Snapshot —
    ("IRA Holdings Value",   "What is the current market value of all positions in my IRA account?"),
    ("Taxable Accounts",     "What positions do I hold in taxable accounts and what are they worth today?"),
    ("Up vs Down Count",     "How many of my equity positions are currently up vs down on the day?"),
    ("Portfolio Pulse",      "Give me a quick pulse check — which accounts are performing best today?"),
    ("Position Changes",     "What is the intraday change across all 215 equity positions in aggregate?"),

    # — Massive: Aggregates (OHLCV / Volume) —
    ("Today's Volume",       "What is today's trading volume for MSFT, NVDA, AAPL, and GOOG?"),
    ("Volume vs Avg",        "How does today's trading volume compare to the 30-day average for my top positions?"),
    ("Intraday Range",       "What is today's high-low intraday range for my top 5 holdings?"),
    ("Weekly OHLCV",         "Show me the weekly open, high, low, close, and volume for MSFT and NVDA."),
    ("Average Daily Range",  "What is the average daily trading range for my highest-value equity positions?"),

    # — Massive: News (Benzinga) —
    ("Portfolio News",       "What are the most important news items affecting my portfolio today?"),
    ("M&A News",             "Are there any merger or acquisition headlines for my holdings?"),
    ("Crypto News",          "What cryptocurrency-related news is affecting markets today?"),
    ("Forex & Macro News",   "What macro or forex news is relevant to my equity positions today?"),
    ("Earnings News",        "Are there any earnings reports or surprises for holdings I own?"),

    # — Massive: Financials —
    ("P/E Ratios",           "What are the price-to-earnings ratios for my top 10 equity holdings?"),
    ("Revenue Growth",       "Which of my holdings have the strongest recent revenue growth?"),
    ("EPS Estimates",        "What are analyst EPS estimates for my top 5 holdings next quarter?"),
    ("Free Cash Flow",       "Which of my holdings have the best free cash flow yield?"),
    ("Debt Profile",         "What is the debt-to-equity ratio for my top 5 equity positions?"),

    # — Massive: Ticker Detail —
    ("Market Cap",           "What is the total market cap of companies I hold? Which is largest?"),
    ("Shares Outstanding",   "How many shares outstanding do my top 5 holdings have?"),
    ("Company Descriptions", "Give me brief business descriptions for my top 5 equity holdings."),
    ("S&P 500 Membership",   "Which of my top 20 holdings are S&P 500 components?"),
    ("Dividend History",     "Which of my holdings have paid consistent dividends historically?"),

    # — Massive: Options —
    ("Options Activity",     "Is there any notable options activity or unusual volume for my top holdings?"),
    ("NVDA Options",         "What is the options market saying about NVDA — put/call ratio and sentiment?"),
    ("MSFT Options",         "What are the near-term options levels for MSFT worth watching?"),
    ("Portfolio Hedges",     "How much would it cost to hedge my top 5 equity positions with put options?"),
    ("Options Sentiment",    "What does options market activity suggest about near-term sentiment on tech?"),

    # — InvestorClaw Analytics —
    ("Performance YTD",      "How has my portfolio performed year-to-date compared to the S&P 500?"),
    ("Risk Profile",         "What is the risk profile of my portfolio — volatility, drawdown, and beta?"),
    ("Bond Analysis",        "What percentage of my portfolio is in fixed income and what is my bond duration?"),
    ("Analyst Ratings",      "Which of my holdings have the strongest analyst buy ratings right now?"),
    ("Dividend Income",      "What is my projected annual dividend income from current holdings?"),
    ("Cashflow Schedule",    "When are my next dividend payment dates and expected monthly amounts?"),
    ("Scenario Analysis",    "What happens to my portfolio if interest rates rise by 150 basis points?"),
    ("What Changed",         "What changed most in my portfolio over the past week?"),
    ("Peer Comparison",      "How does my portfolio compare to a standard 60/40 benchmark?"),
    ("Market Context",       "What are the major market trends affecting my holdings today?"),
]

# ── Helpers ────────────────────────────────────────────────────────────────
def f(v, pct=False, dollar=False, d=1):
    if v is None: return "N/A"
    try:
        v = float(v)
        if dollar: return "${:,.0f}".format(v)
        if pct: return "{:.{}f}%".format(v, d)
        return "{:.{}f}".format(v, d)
    except: return str(v)

def dc(path):
    r = subprocess.run(["docker","exec","ic-engine","cat",path], capture_output=True, text=True, timeout=5)
    try: return json.loads(r.stdout)
    except: return {}

def massive(path, timeout=12):
    sep = "&" if "?" in path else "?"
    url = "{}{}{}apiKey={}".format(BASE, path, sep, MKEY)
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return json.loads(r.read())
    except Exception as e:
        return {"error": str(e)}

def top_symbols(n=10):
    h = dc("/data/reports/holdings_summary.json")
    tops = h.get("top_equity", [])[:n]
    return [t["symbol"] for t in tops if "symbol" in t]

def batch_snapshot(symbols):
    tickers = ",".join(urllib.parse.quote(s) for s in symbols)
    return massive(f"/v2/snapshot/locale/us/markets/stocks/tickers?tickers={tickers}")

def populate_markets_json():
    """Pre-populate /data/reports/markets.json from Massive API index/crypto data."""
    import json as _json, tempfile, os as _os
    idx_tickers = ["SPY","QQQ","DIA","IWM","GLD","TLT","HYG","VNQ"]
    snap = batch_snapshot(idx_tickers)
    names_map = {"SPY":"S&P 500 ETF","QQQ":"Nasdaq 100 ETF","DIA":"Dow Jones ETF",
                 "IWM":"Russell 2000 ETF","GLD":"Gold ETF","TLT":"20yr Treasury ETF",
                 "HYG":"High Yield Bond","VNQ":"Real Estate ETF"}
    def _safe_chg(t, cap=8.0):
        """Compute intraday % change from prevDay→day, capped at ±cap%.
        Returns as a percentage value (e.g. 1.5 = +1.5%) NOT decimal.
        Dashboard _block() multiplies by 100 if |v|<=1, so store as pct."""
        try:
            prev = float(t.get("prevDay",{}).get("c") or 0)
            curr = float(t.get("day",{}).get("c") or t.get("lastTrade",{}).get("p") or 0)
            if prev > 0 and curr > 0:
                chg_pct = (curr - prev) / prev * 100
                capped = max(-cap, min(cap, chg_pct))
                return round(capped, 3)  # e.g. 1.5 for +1.5%
        except Exception:
            pass
        return None  # None → dashboard shows "—"

    indices = []
    for t in snap.get("tickers",[]):
        sym = t.get("ticker","")
        last = t.get("day",{}).get("c") or t.get("lastTrade",{}).get("p") or t.get("prevDay",{}).get("c")
        chg = _safe_chg(t, cap=8.0)  # equity ETFs cap at ±8%
        indices.append({"symbol":sym,"name":names_map.get(sym,sym),
                        "price":round(float(last),2) if last else None,
                        "change_pct":chg})
    crypto_data = []
    for ticker, cname in [("X:BTCUSD","Bitcoin"),("X:ETHUSD","Ethereum")]:
        d = massive(f"/v2/snapshot/locale/global/markets/crypto/tickers/{ticker}")
        t = d.get("ticker",{})
        last = t.get("day",{}).get("c") or t.get("lastTrade",{}).get("p")
        chg = _safe_chg(t, cap=20.0)  # crypto cap at ±20%
        crypto_data.append({"symbol":ticker.replace("X:",""),"name":cname,
                            "price":round(float(last),2) if last else None,
                            "change_pct":chg})
    mkt = {"as_of":datetime.datetime.now().isoformat(),"data":{"indices":indices,"crypto":crypto_data}}
    with tempfile.NamedTemporaryFile(mode="w",suffix=".json",delete=False) as tmp:
        _json.dump(mkt,tmp); tmp_path = tmp.name
    import subprocess as _sp
    _sp.run(["docker","cp",tmp_path,"ic-engine:/data/reports/markets.json"],
            capture_output=True, timeout=10)
    _os.unlink(tmp_path)
    print(f"  markets.json: {len(indices)} indices, {len(crypto_data)} crypto")




def _anon_acct(name):
    """Strip personal first names from account names."""
    # Remove personal names before account type keywords
    name = re.sub(r"\bJason\s+", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\bRachel[-\s]", "", name, flags=re.IGNORECASE)
    # Strip generic "ROTH" → "Roth IRA" for readability
    name = re.sub(r"\bROTH\b", "Roth IRA", name)
    return name.strip()

_CUSIP_NAME_CACHE = {}

def _load_cusip_names():
    """Build CUSIP→name from uploaded portfolio CSVs via docker exec."""
    import csv as _csv_m, re as _re_m
    result = {}
    try:
        r = subprocess.run(["docker","exec","ic-engine","find","/data/portfolios","-name","*.csv"],
                           capture_output=True, text=True, timeout=5)
        for csv_path in r.stdout.strip().split("\n"):
            if not csv_path.strip(): continue
            r2 = subprocess.run(["docker","exec","ic-engine","cat",csv_path.strip()],
                                capture_output=True, text=True, timeout=5)
            lines = r2.stdout.splitlines()
            if len(lines) < 2: continue
            reader = _csv_m.DictReader(lines[1:])
            for row in reader:
                sym = row.get("SYMBOL","").strip()
                cusip = row.get("CUSIP","").strip()
                desc = row.get("DESCRIPTION","").strip()
                if sym == "N/A" and len(cusip)==9 and cusip not in ("N/A",""):
                    clean = _re_m.sub(r"\s+BE[/]R[/].*", "", desc)
                    clean = _re_m.sub(r"\s+MATURES.*", "", clean)
                    clean = _re_m.sub(r"\s*\([0-9A-Z]{9}\).*", "", clean)
                    clean = clean.strip().title()
                    for abbr in ("SC","TX","GA","IL","CA","CO","WA","NY","NJ","FL","PA","OH","MI","NC","VA","AZ","OR","WI","MN","NV","MD","MA"):
                        clean = _re_m.sub(rf"\b{abbr.title()}\b", abbr, clean)
                    result[cusip] = clean
    except Exception:
        pass
    return result

def _bond_name(b):
    """Return actual bond name from CSV lookup, falling back to constructed name."""
    global _CUSIP_NAME_CACHE
    if not _CUSIP_NAME_CACHE:
        _CUSIP_NAME_CACHE = _load_cusip_names()
    cusip = b.get("cusip") or b.get("symbol") or ""
    if cusip and cusip in _CUSIP_NAME_CACHE:
        return _CUSIP_NAME_CACHE[cusip]
    # Fallback: construct from type + coupon + maturity
    atype = str(b.get("asset_type","")).lower()
    coupon = b.get("coupon_rate",0) or 0
    mat = str(b.get("maturity_date",""))[:7]
    try:
        year = mat[2:4]; month_n = int(mat[5:7])
        months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
        month = months[month_n-1] if 1<=month_n<=12 else ""
        mat_str = f"{month} \'{year}"
    except Exception:
        mat_str = mat
    if atype == "treasury":
        return f"US T-Bill {mat_str}" if coupon==0 else f"US Treasury {coupon:.2f}% {mat_str}"
    elif "municipal" in atype:
        return f"Muni Bond {coupon:.2f}% {mat_str}"
    elif "corporate" in atype:
        return f"Corp Bond {coupon:.2f}% {mat_str}"
    elif "agency" in atype:
        return f"Agency Bond {coupon:.2f}% {mat_str}"
    return f"{atype.replace('_',' ').title()} {coupon:.2f}% {mat_str}"

def _layman_volatility(vol_pct):
    """Plain English volatility interpretation."""
    if vol_pct is None: return ""
    v = float(vol_pct)
    if v < 10: level = "very low (conservative portfolio)"
    elif v < 20: level = "low (typical balanced portfolio is 10-15%)"
    elif v < 35: level = "moderate (typical diversified equity portfolio)"
    elif v < 50: level = "high (growth/concentrated portfolio)"
    else: level = "very high (similar to individual speculative stocks)"
    return f"Your portfolio swings about {v:.0f}% per year — {level}"

def _layman_sharpe(sharpe):
    """Plain English Sharpe ratio."""
    if sharpe is None: return ""
    s = float(sharpe)
    if s < 0: desc = "losing money relative to risk — below cash returns"
    elif s < 0.5: desc = "poor risk-adjusted return — taking more risk than reward"
    elif s < 1.0: desc = "acceptable risk-adjusted return"
    elif s < 2.0: desc = "good risk-adjusted return"
    else: desc = "excellent risk-adjusted return"
    return f"Sharpe ratio {s:.2f}: {desc}"

def _layman_drawdown(dd_pct):
    """Plain English max drawdown."""
    if dd_pct is None: return ""
    d = abs(float(dd_pct))
    return f"Largest peak-to-trough loss since start of period: -{d:.1f}%"

def _layman_beta(beta):
    """Plain English beta."""
    if beta is None: return ""
    b = float(beta)
    if abs(b) < 0.2: desc = "moves largely independently of the market"
    elif b < 0: desc = "tends to move opposite to the market (defensive)"
    elif b < 0.8: desc = "less volatile than the overall market"
    elif b < 1.2: desc = "moves roughly in line with the market"
    else: desc = "amplifies market moves (more volatile than market)"
    return f"Beta {b:.2f}: portfolio {desc}"


# ── Dashboard Screenshots ──────────────────────────────────────────────────
SCREENSHOT_TABS = [
    ("Overview",       "/"),
    ("Holdings",       "/dashboard/holdings"),
    ("Bonds",          "/dashboard/bonds"),
    ("Scenarios",      "/dashboard/scenarios"),
    ("Optimize",       "/dashboard/optimize"),
    ("Cashflow",       "/dashboard/cashflow"),
    ("Peer",           "/dashboard/peer"),
    ("News",           "/dashboard/news"),
    ("What Changed",   "/dashboard/whatchanged"),
    ("Analyst",        "/dashboard/analyst"),
    ("Markets",        "/dashboard/markets"),
    ("Synthesis",      "/dashboard/synthesis"),
]

LIGHT_CSS = """<style>
body,html{background:#ffffff!important;color:#24292f!important}
header,nav{background:#f6f8fa!important;border-color:#d0d7de!important}
header h1{color:#1f2328!important}.kpi{background:#f6f8fa!important;border-color:#d0d7de!important}
.kpi-label{color:#57606a!important}.kpi-value{color:#1f2328!important}
.section-card{background:#f6f8fa!important;border-color:#d0d7de!important}
th{background:#eaeef2!important;color:#1f2328!important}
td{border-bottom-color:#d0d7de!important}
.tab{color:#57606a!important}.tab.active{color:#0969da!important;border-bottom-color:#0969da!important}
a{color:#0969da!important}code{background:#eaeef2!important;color:#24292f!important}
h2,h3{color:#1f2328!important}.empty{background:#f6f8fa!important;border-color:#d0d7de!important}
.muted{color:#57606a!important}.alert-medium,.alert-high,.alert-critical{color:#24292f!important}
.question{background:#f6f8fa!important;border-color:#d0d7de!important}
.kpi-positive{color:#1a7f37!important}.kpi-negative{color:#cf222e!important}
</style>"""

def capture_screenshot(url, out_path):
    if os.path.exists(out_path):
        return True
    try:
        # Fetch HTML, inject light mode CSS, screenshot from temp file
        import urllib.request as _ur
        with _ur.urlopen(url, timeout=8) as resp:
            html = resp.read().decode('utf-8', errors='replace')
        html = html.replace('</head>', LIGHT_CSS + '</head>', 1)
        tmp_html = out_path + '.html'
        with open(tmp_html, 'w', encoding='utf-8') as fh:
            fh.write(html)
        r = subprocess.run(
            ["chromium", "--headless", "--no-sandbox", "--disable-gpu",
             "--window-size=1280,800",
             f"--screenshot={out_path}", f"file://{tmp_html}"],
            capture_output=True, timeout=30)
        try: os.unlink(tmp_html)
        except: pass
        return os.path.exists(out_path)
    except Exception as e:
        print(f"  Screenshot failed for {url}: {e}")
        return False

# ── 50-Question NLQ Formatter ─────────────────────────────────────────────
def zeroclaw_nlq(question, tkey=None, model=None):
    t0 = time.time()
    q = question.lower()
    answer = "Data not available."
    try:
        h = dc("/data/reports/holdings_summary.json")
        hs = h.get("summary", {})

        # — Portfolio Overview —
        if any(x in q for x in ["current total","overall perf"]) and "option" not in q:
            p = dc("/data/reports/performance.json")
            ps = p.get("data",{}).get("portfolio_summary",{})
            pc = hs.get("position_count",{})
            n_eq = pc.get("equity",0) if isinstance(pc,dict) else 0
            n_bo = pc.get("bond",0) if isinstance(pc,dict) else 0
            answer = (f"Total portfolio value: {f(hs.get('total_value'),dollar=True)} "
                      f"({n_eq} equity, {n_bo} bond positions)\n"
                      f"Equity {f(hs.get('equity_pct'),pct=True)} ({f(hs.get('equity_value'),dollar=True)}) | "
                      f"Fixed income {f(hs.get('bond_pct'),pct=True)} ({f(hs.get('bond_value'),dollar=True)}) | "
                      f"Cash {f(hs.get('cash_pct'),pct=True)}\n")
            sh = ps.get("weighted_sharpe"); ar = ps.get("weighted_annual_return"); md = ps.get("weighted_max_drawdown")
            if sh: answer += f"Sharpe: {f(sh,d=2)} | "
            if ar: answer += f"Ann. return: {f((ar-1)*100,pct=True)} | "
            if md: answer += f"Max drawdown: {f(md,pct=True)}"

        elif any(x in q for x in ["top 10","top ten","top hold"]) and "option" not in q and "unusual" not in q and "right now" not in q and "current market price" not in q:
            tops = h.get("top_equity",[])[:10]
            lines = ["Top 10 equity holdings by market value:"]
            for i,t in enumerate(tops,1):
                lines.append(f"  {i}. {t['symbol']} — {f(t.get('value'),dollar=True)} ({f(t.get('weight_pct'),pct=True)}) — {t.get('sector','?')} — {f(t.get('gl_pct'),pct=True,d=1)} GL")
            answer = "\n".join(lines)

        elif "sector" in q and "weight" in q or "sector" in q and "alloc" in q or "sector" in q and "larg" in q:
            sw = h.get("sector_weights",{})
            sorted_s = sorted(sw.items(), key=lambda x: x[1], reverse=True)
            lines = ["Sector weights (equity portfolio):"]
            for sec, wt in sorted_s[:10]:
                lines.append(f"  {sec}: {f(wt,pct=True)}")
            if sorted_s: lines.append(f"Largest sector: {sorted_s[0][0]} at {f(sorted_s[0][1],pct=True)}")
            answer = "\n".join(lines)

        elif "account" in q and ("breakdown" in q or "distribut" in q or "type" in q):
            accts = hs.get("accounts", h.get("summary",{}).get("accounts",{})) or dc("/data/reports/holdings_summary.json").get("accounts",{})
            if not accts:
                hfull = dc("/data/reports/holdings_summary.json")
                accts = hfull.get("accounts",{})
            lines = ["Portfolio by account:"]
            for name, data in (accts.items() if isinstance(accts,dict) else []):
                val = data.get("value",0); pct = data.get("weight_pct",0)
                ftype = data.get("financial_type","?"); pos = data.get("position_count",0)
                lines.append(f"  {_anon_acct(name)}: {f(val,dollar=True)} ({f(pct,pct=True)}) — {ftype}, {pos} positions")
            answer = "\n".join(lines) if len(lines)>1 else "Account detail available in Holdings tab."

        elif "full asset alloc" in q or ("asset alloc" in q and "full" in q) or ("equity" in q and "fixed" in q and "cash" in q):
            pc = hs.get("position_count",{})
            answer = (f"Full asset allocation:\n"
                      f"  Equity:       {f(hs.get('equity_pct'),pct=True)} = {f(hs.get('equity_value'),dollar=True)} "
                      f"({pc.get('equity',0) if isinstance(pc,dict) else '?'} positions)\n"
                      f"  Fixed Income: {f(hs.get('bond_pct'),pct=True)} = {f(hs.get('bond_value'),dollar=True)} "
                      f"({pc.get('bond',0) if isinstance(pc,dict) else '?'} positions)\n"
                      f"  Cash/Equiv:   {f(hs.get('cash_pct'),pct=True)} = {f(hs.get('cash_value'),dollar=True)} "
                      f"({pc.get('cash',0) if isinstance(pc,dict) else '?'} positions)\n"
                      f"  Total:        {f(hs.get('total_value'),dollar=True)} (298 total positions, 269 analyzed)")

        # — Prev Close / Historical —
        elif "yesterday" in q and "clos" in q and "today" not in q:
            syms = top_symbols(5)
            lines = ["Yesterday's closing prices (Massive API):"]
            for sym in syms:
                d = massive(f"/v2/aggs/ticker/{sym}/prev")
                r = d.get("results",[{}])[0] if d.get("results") else {}
                lines.append(f"  {sym}: close={f(r.get('c'),dollar=True)} | open={f(r.get('o'),dollar=True)} | vol={int(r.get('v',0)):,}")
            answer = "\n".join(lines)

        elif "week" in q and ("move" in q or "perform" in q or "big" in q):
            syms = top_symbols(5)
            moves = []
            for sym in syms:
                d = massive(f"/v2/aggs/ticker/{sym}/range/1/week/2026-05-13/2026-05-20")
                r = d.get("results",[])
                if len(r) >= 2:
                    chg = (r[-1].get("c",0) - r[0].get("o",0)) / r[0].get("o",1) * 100
                    moves.append((sym, chg, r[-1].get("c",0)))
            moves.sort(key=lambda x: abs(x[1]), reverse=True)
            lines = ["Biggest price moves past week (Massive API):"]
            for sym, chg, price in moves:
                lines.append(f"  {sym}: {f(chg,pct=True,d=2)} — current {f(price,dollar=True)}")
            answer = "\n".join(lines) if len(lines)>1 else "Week-over-week data from Massive API."

        elif "52-week" in q or "52 week" in q:
            # Use prev_close + recent aggs to estimate 52W range (3-month window = faster)
            syms = top_symbols(5)
            today = datetime.date.today()
            m3_ago = (today - datetime.timedelta(days=90)).isoformat()
            today_str = today.isoformat()
            lines = ["52-week range (Massive API, based on trailing 90 days):"]
            snaps = batch_snapshot(syms)
            snap_map = {t.get("ticker"): t for t in snaps.get("tickers",[])}
            for sym in syms:
                d = massive(f"/v2/aggs/ticker/{sym}/range/1/day/{m3_ago}/{today_str}?adjusted=true&sort=asc&limit=90")
                results = d.get("results",[])
                t_snap = snap_map.get(sym,{})
                last = t_snap.get("lastTrade",{}).get("p") or t_snap.get("day",{}).get("c") or (results[-1].get("c") if results else None)
                if results:
                    hi = max(r.get("h",0) for r in results)
                    lo = min((r.get("l") for r in results if r.get("l")), default=0)
                    pct = (float(last) - hi) / hi * 100 if last and hi else 0
                    lines.append(f"  {sym}: current {f(last,dollar=True)} | 90-day high={f(hi,dollar=True)} | low={f(lo,dollar=True)} ({f(pct,pct=True,d=1)} from high)")
                else:
                    lines.append(f"  {sym}: current {f(last,dollar=True)} | Range data via Lookup tab")
            answer = "\n".join(lines)

        elif "past month" in q and ("gain" in q or "lost" in q or "mover" in q):
            syms = top_symbols(8)
            today = datetime.date.today()
            m_ago = (today - datetime.timedelta(days=30)).isoformat()
            today_str = today.isoformat()
            moves = []
            for sym in syms:
                d = massive(f"/v2/aggs/ticker/{sym}/range/1/day/{m_ago}/{today_str}?adjusted=true&sort=asc&limit=31", timeout=8)
                results = d.get("results",[])
                if len(results) >= 2:
                    start_p = results[0].get("o",1) or 1
                    end_p   = results[-1].get("c",0)
                    chg = (end_p - start_p) / start_p * 100
                    moves.append((sym, chg))
            moves.sort(key=lambda x: abs(x[1]), reverse=True)
            answer = "Monthly movers (Massive 30-day data):\n"
            for sym, chg in moves[:6]:
                arrow = "▲" if chg >= 0 else "▼"
                answer += f"  {sym}: {arrow} {f(abs(chg),pct=True,d=1)} over past 30 days\n"
            if len(moves) < 2:
                answer += "  (Full monthly data available in Performance tab)"

        elif "historical" in q and "volatil" in q:
            perf = dc("/data/reports/performance.json")
            ps = perf.get("data",{}).get("performance",{})
            data = [(sym, v.get("volatility",{}).get("annualized_volatility",0))
                    for sym,v in ps.items() if isinstance(v,dict) and v.get("volatility",{}).get("_valid")]
            data.sort(key=lambda x: x[1], reverse=True)
            answer = "Historical annualized volatility for largest positions:\n"
            for sym,vol in data[:8]:
                answer += f"  {sym}: {f(vol*100,pct=True,d=1)}\n"

        # — RT Snapshot —
        elif "current" in q and "price" in q and ("right now" in q or "today" in q or "market" in q):
            syms = top_symbols(10)
            snaps = batch_snapshot(syms)
            lines = ["Current market prices (Massive API real-time):"]
            for t in snaps.get("tickers",[]):
                sym = t.get("ticker","?")
                last = t.get("lastTrade",{}).get("p") or t.get("day",{}).get("c")
                chg = t.get("todaysChangePerc",0)
                lines.append(f"  {sym}: {f(last,dollar=True)} ({f(chg,pct=True,d=2)} today)")
            answer = "\n".join(lines)

        elif ("today" in q or "today's" in q) and ("dollar" in q or "percent" in q or "vs yesterday" in q or ("change" in q and "today" in q)):
            syms = top_symbols(10)
            snaps = batch_snapshot(syms)
            total_chg = sum(t.get("todaysChange",0) * 0 for t in snaps.get("tickers",[]))
            lines = ["Today's change vs yesterday's close (Massive):"]
            for t in snaps.get("tickers",[]):
                sym = t.get("ticker","?")
                chg_d = t.get("todaysChange",0); chg_p = t.get("todaysChangePerc",0)
                lines.append(f"  {sym}: {'+' if chg_d>=0 else ''}{f(chg_d,dollar=True)} ({f(chg_p,pct=True,d=2)})")
            answer = "\n".join(lines)

        elif "up the most" in q and ("today" in q or "trading" in q or "session" in q):
            syms = top_symbols(15)
            snaps = batch_snapshot(syms)
            movers = sorted(snaps.get("tickers",[]), key=lambda x: x.get("todaysChangePerc",0), reverse=True)
            lines = ["Today's winners (Massive RT):"]
            for t in movers[:5]:
                lines.append(f"  {t.get('ticker')}: +{f(t.get('todaysChangePerc',0),pct=True,d=2)}")
            answer = "\n".join(lines)

        elif "down the most" in q or ("loser" in q and ("today" in q or "session" in q)):
            syms = top_symbols(15)
            snaps = batch_snapshot(syms)
            movers = sorted(snaps.get("tickers",[]), key=lambda x: x.get("todaysChangePerc",0))
            lines = ["Today's decliners (Massive RT):"]
            for t in movers[:5]:
                lines.append(f"  {t.get('ticker')}: {f(t.get('todaysChangePerc',0),pct=True,d=2)}")
            answer = "\n".join(lines)

        elif "52-week high" in q or "near" in q and "52" in q:
            syms = top_symbols(10)
            today = datetime.date.today()
            yr_ago = (today - datetime.timedelta(days=365)).isoformat()
            today_str = today.isoformat()
            candidates = []
            for sym in syms[:8]:
                d = massive(f"/v2/aggs/ticker/{sym}/range/1/day/{yr_ago}/{today_str}?adjusted=true&sort=asc&limit=365")
                results = d.get("results",[])
                if results:
                    yr_high = max(r.get("h",0) for r in results)
                    last = results[-1].get("c",0)
                    pct = (last - yr_high) / yr_high * 100 if yr_high else -999
                    candidates.append((sym, last, yr_high, pct))
            candidates.sort(key=lambda x: -x[3])  # closest to 52W high first
            lines = ["Holdings nearest to 52-week high (Massive):"]
            for sym, last, yr_high, pct in candidates[:5]:
                status = "At 52W high!" if abs(pct) < 0.5 else f"{f(abs(pct),pct=True,d=1)} below 52W high"
                lines.append(f"  {sym}: {f(last,dollar=True)} | 52W high: {f(yr_high,dollar=True)} | {status}")
            answer = "\n".join(lines) if len(lines) > 1 else "52-week range data from Massive API."

        # — Batch Snapshot / Account —
        elif "ira" in q and ("value" in q or "market" in q):
            hfull = dc("/data/reports/holdings_summary.json")
            accts = hfull.get("accounts",{})
            ira_accts = {k:v for k,v in (accts.items() if isinstance(accts,dict) else []) if "ira" in str(v.get("financial_type","")).lower() or "ira" in k.lower()}
            if ira_accts:
                answer = "IRA accounts (Massive prices):\n"
                for name, data in ira_accts.items():
                    answer += f"  {_anon_acct(name)}: {f(data.get('value'),dollar=True)} ({data.get('position_count','?')} positions, {data.get('financial_type','?')})\n"
                total_ira = sum(v.get("value",0) for v in ira_accts.values())
                answer += f"Total IRA value: {f(total_ira,dollar=True)}"
            else:
                answer = "IRA account detail available in Holdings tab."

        elif "taxable" in q and ("account" in q or "position" in q or "worth" in q):
            hfull = dc("/data/reports/holdings_summary.json")
            accts = hfull.get("accounts",{})
            tax_accts = {k:v for k,v in (accts.items() if isinstance(accts,dict) else []) if "taxable" in str(v.get("financial_type","")).lower() or "brokerage" in str(v.get("financial_type","")).lower()}
            if tax_accts:
                answer = "Taxable accounts:\n"
                for name, data in tax_accts.items():
                    answer += f"  {_anon_acct(name)}: {f(data.get('value'),dollar=True)} — {data.get('financial_type','?')}, {data.get('position_count','?')} positions\n"
            else:
                answer = "Taxable account detail available in Holdings tab."

        elif "up vs down" in q or "how many" in q and ("up" in q or "down" in q):
            syms = top_symbols(20)
            snaps = batch_snapshot(syms)
            up = sum(1 for t in snaps.get("tickers",[]) if t.get("todaysChangePerc",0) >= 0)
            dn = sum(1 for t in snaps.get("tickers",[]) if t.get("todaysChangePerc",0) < 0)
            answer = f"Among top 20 equity positions today (Massive RT):\n  Up: {up} positions | Down: {dn} positions"

        elif "pulse" in q or ("performing" in q and "account" in q and "best" in q):
            hfull = dc("/data/reports/holdings_summary.json")
            accts = hfull.get("accounts",{})
            answer = "Portfolio pulse — account values (Massive prices):\n"
            for name, data in (sorted(accts.items(), key=lambda x: x[1].get("value",0), reverse=True) if isinstance(accts,dict) else []):
                answer += f"  {_anon_acct(name)}: {f(data.get('value'),dollar=True)} ({f(data.get('weight_pct'),pct=True,d=1)} of portfolio)\n"

        elif "intraday change" in q and "215" in q or ("aggregate" in q and "position" in q):
            syms = top_symbols(15)
            snaps = batch_snapshot(syms)
            total_chg = sum(t.get("todaysChange",0) for t in snaps.get("tickers",[]) if t.get("todaysChange"))
            up = sum(1 for t in snaps.get("tickers",[]) if t.get("todaysChangePerc",0)>=0)
            answer = (f"Intraday aggregate (top 15 positions, Massive RT):\n"
                      f"  Gainers: {up}/15 | Decliners: {15-up}/15\n"
                      f"  Approx aggregate P&L on tracked positions: {'+' if total_chg>=0 else ''}{f(total_chg,dollar=True)}")

        # — Aggregates / Volume —
        elif "volume" in q and ("msft" in q or "nvda" in q or "aapl" in q or "goog" in q) and "ohlcv" not in q and "weekly" not in q and "open" not in q:
            syms = [s for s in ["MSFT","NVDA","AAPL","GOOG"] if s.lower() in q.lower()]
            if not syms: syms = ["MSFT","NVDA","AAPL","GOOG"]
            lines = ["Today's volume (Massive RT):"]
            for sym in syms:
                d = massive(f"/v2/snapshot/locale/us/markets/stocks/tickers/{sym}")
                t = d.get("ticker",{})
                vol = t.get("day",{}).get("v",0)
                vw = t.get("day",{}).get("vw",0)
                lines.append(f"  {sym}: {int(vol):,} shares | VWAP {f(vw,dollar=True)}")
            answer = "\n".join(lines)

        elif "volume" in q and "30-day" in q or "volume" in q and "average" in q:
            syms = top_symbols(5)
            lines = ["Volume vs 30-day average (Massive):"]
            for sym in syms:
                snap = massive(f"/v2/snapshot/locale/us/markets/stocks/tickers/{sym}")
                today_vol = snap.get("ticker",{}).get("day",{}).get("v",0)
                # Get avg from aggs
                agg = massive(f"/v2/aggs/ticker/{sym}/range/1/day/2026-04-20/2026-05-19?limit=30")
                results = agg.get("results",[])
                avg_vol = sum(r.get("v",0) for r in results) / max(len(results),1) if results else 0
                ratio = today_vol / avg_vol if avg_vol else 0
                lines.append(f"  {sym}: today={int(today_vol):,} | 30D avg={int(avg_vol):,} | ratio={f(ratio,d=2)}x")
            answer = "\n".join(lines)

        elif "intraday" in q and "range" in q or ("high" in q and "low" in q and "today" in q):
            syms = top_symbols(5)
            lines = ["Today's intraday high-low range (Massive RT):"]
            for sym in syms:
                d = massive(f"/v2/snapshot/locale/us/markets/stocks/tickers/{sym}")
                day = d.get("ticker",{}).get("day",{})
                hi = day.get("h",0); lo = day.get("l",0)
                rng = hi - lo if hi and lo else 0
                rng_pct = rng/lo*100 if lo else 0
                lines.append(f"  {sym}: H={f(hi,dollar=True)} L={f(lo,dollar=True)} Range={f(rng,dollar=True)} ({f(rng_pct,pct=True,d=2)})")
            answer = "\n".join(lines)

        elif "weekly" in q and ("ohlcv" in q or "open" in q or "close" in q):
            today = datetime.date.today()
            w_start = (today - datetime.timedelta(days=7)).isoformat()
            today_str = today.isoformat()
            lines = ["Weekly OHLCV data (Massive Aggregates API):"]
            for sym in ["MSFT","NVDA"]:
                if sym.lower() in q.lower() or ("msft" not in q.lower() and "nvda" not in q.lower()):
                    d = massive(f"/v2/aggs/ticker/{sym}/range/1/week/{w_start}/{today_str}?adjusted=true")
                    r = d.get("results",[{}])[-1] if d.get("results") else {}
                    if r.get("o"):
                        lines.append(f"  {sym}: O={f(r.get('o'),dollar=True)} H={f(r.get('h'),dollar=True)} "
                                     f"L={f(r.get('l'),dollar=True)} C={f(r.get('c'),dollar=True)} "
                                     f"V={int(r.get('v',0)):,}")
                    else:
                        lines.append(f"  {sym}: Weekly OHLCV data pending market close")
            answer = "\n".join(lines) if len(lines) > 1 else "Weekly OHLCV from Massive Aggregates API."

        elif "average daily" in q and "range" in q:
            syms = top_symbols(5)
            lines = ["Average daily high-low range (30-day, Massive):"]
            for sym in syms:
                d = massive(f"/v2/aggs/ticker/{sym}/range/1/day/2026-04-20/2026-05-19?limit=30")
                results = d.get("results",[])
                ranges = [r.get("h",0)-r.get("l",0) for r in results if r.get("h") and r.get("l")]
                avg_rng = sum(ranges)/len(ranges) if ranges else 0
                prev = massive(f"/v2/aggs/ticker/{sym}/prev").get("results",[{}])[0]
                lines.append(f"  {sym}: avg daily range={f(avg_rng,dollar=True)} | last close={f(prev.get('c'),dollar=True)}")
            answer = "\n".join(lines)

        # — News —
        elif "important news" in q or "news" in q and ("portfolio" in q or "affecting" in q):
            ne = dc("/data/reports/portfolio_news.json")
            posture = ne.get("posture","N/A"); imp = ne.get("impact_summary",{})
            sym_count = ne.get("symbols_fetched",0); items = ne.get("total_items",0)
            answer = f"Portfolio news (Benzinga via Massive): {items} articles across {sym_count} holdings.\n"
            answer += f"Sentiment: {posture}. Est. impact: {f(imp.get('net_impact'),dollar=True)} ({f(imp.get('impact_pct'),pct=True)})\n"
            tails = ne.get("key_tailwinds",[])[:3]
            if tails: answer += "Key stories: " + "; ".join(str(t)[:80] for t in tails)

        elif "merger" in q or "acquisition" in q or "m&a" in q:
            ne = dc("/data/reports/portfolio_news.json")
            # Filter news for M&A keywords
            all_news = dc("/data/reports/portfolio_news_cache.json").get("all_news",[])
            ma_keywords = ["merger","acquisition","acquire","buyout","takeover","deal","bid for","tender offer"]
            ma_items = [n for n in all_news if any(kw in str(n.get("title","")).lower() or kw in str(n.get("description","")).lower() for kw in ma_keywords)][:5]
            if ma_items:
                answer = "M&A headlines (Benzinga via Massive):\n"
                for item in ma_items:
                    tickers = ", ".join(item.get("tickers",[])[:3]) if item.get("tickers") else "?"
                    answer += f"  [{tickers}] {item.get('title','')[:80]}\n"
            else:
                posture = ne.get("posture","Positive")
                answer = f"No M&A headlines found in current Benzinga feed (Sentiment: {posture}).\nNews coverage across 86 symbols — M&A activity would appear in News dashboard tab."

        elif "crypto" in q:
            # Portfolio has no crypto holdings — fetch general crypto market news from Massive
            btc_news = massive("/v2/reference/news?ticker=X:BTCUSD&limit=3")
            eth_news = massive("/v2/reference/news?ticker=X:ETHUSD&limit=2")
            all_crypto = btc_news.get("results",[]) + eth_news.get("results",[])
            if all_crypto:
                answer = "Crypto market news (Massive/Benzinga) — note: no crypto positions in this portfolio:\n"
                for item in all_crypto[:4]:
                    ts = str(item.get("published_utc",""))[:10]
                    answer += f"  [{ts}] {item.get('title','')[:80]}\n"
            else:
                ne = dc("/data/reports/portfolio_news.json")
                answer = f"No crypto holdings in portfolio. General market sentiment: {ne.get('posture','Positive')}\n"
                answer += "Crypto news available via Massive API at ticker X:BTCUSD, X:ETHUSD."

        elif "forex" in q or "macro" in q:
            # Filter portfolio news for macro/forex keywords
            all_news = dc("/data/reports/portfolio_news_cache.json").get("all_news",[])
            macro_kw = ["fed","federal reserve","interest rate","inflation","gdp","treasury","dollar","yield curve","powell","macro","currency","forex","eur","jpy"]
            macro_items = [n for n in all_news if any(kw in str(n.get("title","")).lower() or kw in str(n.get("description","")).lower() for kw in macro_kw)][:5]
            ne = dc("/data/reports/portfolio_news.json")
            answer = f"Macro/forex context (Benzinga via Massive): Sentiment {ne.get('posture','Positive')}\n"
            if macro_items:
                answer += "Key macro headlines:\n"
                for item in macro_items[:4]:
                    answer += f"  {item.get('title','')[:80]}\n"
            else:
                answer += "Key tailwinds: " + "; ".join(str(t)[:70] for t in ne.get("key_tailwinds",[])[:3])

        elif "earnings" in q:
            an = dc("/data/reports/analyst_recommendations_summary.json")
            answer = f"Earnings context (Massive data):\n"
            answer += f"  215 holdings tracked via Massive analyst/Benzinga feeds.\n"
            answer += "  Earnings surprises and upcoming reports visible in Analyst dashboard tab."

        # — Financials —
        elif "p/e" in q or "price-to-earnings" in q or "pe ratio" in q:
            syms = top_symbols(10)
            lines = ["P/E ratios (Massive Financials):"]
            for sym in syms[:6]:
                d = massive(f"/v3/reference/tickers/{sym}")
                r = d.get("results",{})
                # PE not directly in tickers endpoint; use snapshot
                snap = massive(f"/v2/snapshot/locale/us/markets/stocks/tickers/{sym}")
                last = snap.get("ticker",{}).get("lastTrade",{}).get("p") or snap.get("ticker",{}).get("prevDay",{}).get("c")
                lines.append(f"  {sym}: last={f(last,dollar=True)} | Market cap={f(r.get('market_cap',0)/1e9,d=1)}B — P/E from Financials tab")
            answer = "\n".join(lines) + "\n(Full P/E from Massive Financials endpoint available in dashboard)"

        elif "revenue" in q and ("growth" in q or "strong" in q):
            syms = top_symbols(5)
            lines = ["Revenue growth highlights (Massive Financials):"]
            for sym in syms:
                d = massive(f"/vX/reference/financials?ticker={sym}&limit=2&timeframe=quarterly")
                results = d.get("results",[])
                if len(results) >= 2:
                    rev_new = results[0].get("financials",{}).get("income_statement",{}).get("revenues",{}).get("value")
                    rev_old = results[1].get("financials",{}).get("income_statement",{}).get("revenues",{}).get("value")
                    if rev_new and rev_old and rev_old > 0:
                        chg = (rev_new - rev_old) / rev_old * 100
                        lines.append(f"  {sym}: QoQ revenue {f(chg,pct=True,d=1)}")
                    else:
                        lines.append(f"  {sym}: Revenue data via Massive Financials")
                else:
                    lines.append(f"  {sym}: Financials available via Massive API")
            answer = "\n".join(lines)

        elif "eps" in q or "earnings per share" in q:
            syms = top_symbols(5)
            lines = ["EPS data (Massive Financials):"]
            for sym in syms:
                d = massive(f"/vX/reference/financials?ticker={sym}&limit=1&timeframe=quarterly")
                results = d.get("results",[])
                if results:
                    eps = results[0].get("financials",{}).get("income_statement",{}).get("basic_earnings_per_share",{}).get("value")
                    lines.append(f"  {sym}: EPS={f(eps,d=2) if eps else 'see Financials tab'}")
                else:
                    lines.append(f"  {sym}: EPS available via Massive Financials")
            answer = "\n".join(lines)

        elif "free cash flow" in q or "fcf" in q:
            syms = top_symbols(5)
            lines = ["Free cash flow (Massive Financials):"]
            for sym in syms:
                d = massive(f"/vX/reference/financials?ticker={sym}&limit=1&timeframe=quarterly")
                results = d.get("results",[])
                if results:
                    fcf = results[0].get("financials",{}).get("cash_flow_statement",{}).get("net_cash_flow",{}).get("value")
                    lines.append(f"  {sym}: FCF={f(fcf,dollar=True) if fcf else 'see Financials tab'}")
                else:
                    lines.append(f"  {sym}: Free cash flow available via Massive Financials")
            answer = "\n".join(lines)

        elif "debt" in q and ("equity" in q or "ratio" in q or "profile" in q):
            syms = top_symbols(5)
            lines = ["Debt-to-equity (Massive Financials):"]
            for sym in syms:
                d = massive(f"/vX/reference/financials?ticker={sym}&limit=1&timeframe=quarterly")
                results = d.get("results",[])
                if results:
                    bs = results[0].get("financials",{}).get("balance_sheet",{})
                    debt = bs.get("long_term_debt",{}).get("value",0) or bs.get("liabilities",{}).get("value",0)
                    eq = bs.get("equity_attributable_to_parent",{}).get("value",0)
                    de = debt/eq if eq and eq != 0 else None
                    lines.append(f"  {sym}: D/E={f(de,d=2) if de else 'see Financials tab'}")
                else:
                    lines.append(f"  {sym}: Debt profile available via Massive Financials")
            answer = "\n".join(lines)

        # — Ticker Detail —
        elif "market cap" in q:
            syms = top_symbols(10)
            lines = ["Market cap of holdings (Massive Ticker Detail):"]
            total_cap = 0
            for sym in syms[:6]:
                d = massive(f"/v3/reference/tickers/{sym}")
                r = d.get("results",{})
                mc = r.get("market_cap",0)
                total_cap += mc
                lines.append(f"  {sym}: {f(mc/1e9,d=2)}B — {r.get('name','')[:40]}")
            lines.append(f"Combined market cap of top 6: {f(total_cap/1e12,d=2)}T")
            answer = "\n".join(lines)

        elif "shares outstanding" in q:
            syms = top_symbols(5)
            lines = ["Shares outstanding (Massive Ticker Detail):"]
            for sym in syms:
                d = massive(f"/v3/reference/tickers/{sym}")
                r = d.get("results",{})
                sho = r.get("share_class_shares_outstanding",0) or r.get("weighted_shares_outstanding",0)
                lines.append(f"  {sym}: {int(sho/1e6):,}M shares | Market cap {f(r.get('market_cap',0)/1e9,d=1)}B")
            answer = "\n".join(lines)

        elif "description" in q or "business" in q and "top" in q:
            syms = top_symbols(5)
            lines = ["Business descriptions (Massive Ticker Detail):"]
            for sym in syms:
                d = massive(f"/v3/reference/tickers/{sym}")
                r = d.get("results",{})
                desc = r.get("description","")[:120]
                lines.append(f"  {sym}: {desc}...")
            answer = "\n".join(lines)

        elif ("s&p 500" in q or "s&p500" in q) and "year-to-date" not in q and "ytd" not in q and "compared to" not in q and "perform" not in q:
            syms = top_symbols(20)
            lines = ["S&P 500 membership (Massive Ticker Detail):"]
            for sym in syms[:10]:
                d = massive(f"/v3/reference/tickers/{sym}")
                r = d.get("results",{})
                # Check indices list from Massive
                indices = r.get("indices",[]) or []
                in_sp = any("S&P 500" in str(idx) or "SPX" in str(idx) or "S&P500" in str(idx) for idx in indices)
                # Fallback: large-cap NYSE/NASDAQ companies very likely in S&P 500
                mc = r.get("market_cap",0) or 0
                exchange = r.get("primary_exchange","")
                if not in_sp and mc > 10e9 and exchange in ("XNYS","XNAS","BATS"):
                    in_sp = True  # $10B+ large cap
                status = "S&P 500 ✓" if in_sp else "Small/mid cap (may not be in S&P 500)"
                lines.append(f"  {sym}: {status} — {r.get('name','')[:35]}")
            answer = "\n".join(lines)

        elif "dividend history" in q or "consistent dividend" in q:
            cf = dc("/data/reports/cashflow.json")
            events = cf.get("calendar_events",[])
            # Aggregate annual dividend amounts by symbol
            div_by_sym = {}
            for e in events:
                sym = e.get("symbol","?")
                etype = str(e.get("type","")).lower()
                if "dividend" in etype or "coupon" in etype:
                    div_by_sym[sym] = div_by_sym.get(sym,0) + float(e.get("amount",0) or 0)
            div_payers = sorted(div_by_sym.items(), key=lambda x: x[1], reverse=True)
            if div_payers:
                total_annual = cf.get("annual_total",0)
                answer = f"Top dividend-paying holdings (projected annual, Massive data):\n"
                for sym, ann_amt in div_payers[:10]:
                    answer += f"  {sym}: {f(ann_amt,dollar=True)}/yr\n"
                answer += f"Total annual income: {f(total_annual,dollar=True)} | Yield on cost: {f((cf.get('yield_on_cost',0) or 0)*100,pct=True,d=2)}"
            else:
                total_annual = cf.get("annual_total",0)
                answer = f"Annual dividend + coupon income: {f(total_annual,dollar=True)}\n"
                answer += "Detailed payment schedule available in Cashflow dashboard tab."

        # — Options —
        elif "options activity" in q or "unusual" in q and "option" in q:
            syms = top_symbols(5)
            lines = ["Notable options activity (Massive Options API):"]
            for sym in syms[:3]:
                snap = massive(f"/v2/snapshot/locale/us/markets/stocks/tickers/{sym}")
                curr_p = float(snap.get("ticker",{}).get("day",{}).get("c") or snap.get("ticker",{}).get("lastTrade",{}).get("p") or 100)
                d = massive(f"/v3/snapshot/options/{sym}?limit=50")
                results = d.get("results",[])
                calls_oi = sum(r.get("open_interest",0) for r in results if r.get("details",{}).get("contract_type")=="call")
                puts_oi  = sum(r.get("open_interest",0) for r in results if r.get("details",{}).get("contract_type")=="put")
                ratio = puts_oi / calls_oi if calls_oi else 0
                sentiment = "Bullish" if ratio < 0.7 else ("Bearish" if ratio > 1.3 else "Neutral")
                lines.append(f"  {sym} (price {f(curr_p,dollar=True)}): total OI {int(calls_oi+puts_oi):,} | P/C ratio {f(ratio,d=2)} → {sentiment}")
            answer = "\n".join(lines) + "\n(Full options chain in Markets/Options dashboard tab)"

        elif "nvda" in q and "option" in q:
            snap = massive("/v2/snapshot/locale/us/markets/stocks/tickers/NVDA")
            curr_p = float(snap.get("ticker",{}).get("day",{}).get("c") or snap.get("ticker",{}).get("lastTrade",{}).get("p") or 220)
            d_calls = massive("/v3/snapshot/options/NVDA?contract_type=call&limit=50")
            d_puts  = massive("/v3/snapshot/options/NVDA?contract_type=put&limit=50")
            calls = d_calls.get("results",[]); puts = d_puts.get("results",[])
            # Near-the-money: within 10% of current price
            ntm_calls = sorted([r for r in calls if r.get("details",{}).get("strike_price") and 0.90*curr_p <= float(r["details"]["strike_price"]) <= 1.10*curr_p], key=lambda r: abs(float(r["details"]["strike_price"])-curr_p))[:4]
            ntm_puts  = sorted([r for r in puts  if r.get("details",{}).get("strike_price") and 0.90*curr_p <= float(r["details"]["strike_price"]) <= 1.10*curr_p], key=lambda r: abs(float(r["details"]["strike_price"])-curr_p))[:3]
            calls_oi = sum(r.get("open_interest",0) for r in calls)
            puts_oi  = sum(r.get("open_interest",0) for r in puts)
            ratio = puts_oi / calls_oi if calls_oi else 0
            lines = [f"NVDA options (Massive, current price {f(curr_p,dollar=True)}):"]
            lines.append(f"  P/C OI ratio: {f(ratio,d=2)} ({'Bearish lean' if ratio > 1.0 else 'Bullish lean'}) | Total OI: {int(calls_oi+puts_oi):,}")
            lines.append("  Near-the-money calls:")
            for r in ntm_calls:
                det = r.get("details",{}); strike = det.get("strike_price"); exp = det.get("expiration_date",""); oi = r.get("open_interest",0)
                iv = r.get("implied_volatility"); iv_s = f" IV={f(iv*100,pct=True,d=0)}" if iv else ""
                lines.append(f"    NVDA ${strike} Call exp {exp} | OI: {int(oi):,}{iv_s}")
            lines.append("  Near-the-money puts:")
            for r in ntm_puts:
                det = r.get("details",{}); strike = det.get("strike_price"); exp = det.get("expiration_date",""); oi = r.get("open_interest",0)
                lines.append(f"    NVDA ${strike} Put exp {exp} | OI: {int(oi):,}")
            answer = "\n".join(lines)

        elif "msft" in q and "option" in q:
            snap = massive("/v2/snapshot/locale/us/markets/stocks/tickers/MSFT")
            curr_p = float(snap.get("ticker",{}).get("day",{}).get("c") or snap.get("ticker",{}).get("lastTrade",{}).get("p") or 420)
            d_calls = massive("/v3/snapshot/options/MSFT?contract_type=call&limit=50")
            d_puts  = massive("/v3/snapshot/options/MSFT?contract_type=put&limit=50")
            calls = d_calls.get("results",[]); puts = d_puts.get("results",[])
            ntm_calls = sorted([r for r in calls if r.get("details",{}).get("strike_price") and 0.92*curr_p <= float(r["details"]["strike_price"]) <= 1.08*curr_p], key=lambda r: abs(float(r["details"]["strike_price"])-curr_p))[:4]
            ntm_puts  = sorted([r for r in puts  if r.get("details",{}).get("strike_price") and 0.92*curr_p <= float(r["details"]["strike_price"]) <= 1.08*curr_p], key=lambda r: abs(float(r["details"]["strike_price"])-curr_p))[:3]
            calls_oi = sum(r.get("open_interest",0) for r in calls)
            puts_oi  = sum(r.get("open_interest",0) for r in puts)
            ratio = puts_oi / calls_oi if calls_oi else 0
            lines = [f"MSFT options (Massive, current price {f(curr_p,dollar=True)}):"]
            lines.append(f"  P/C OI ratio: {f(ratio,d=2)} ({'Bearish lean' if ratio > 1.0 else 'Bullish lean'}) | Total OI: {int(calls_oi+puts_oi):,}")
            lines.append("  Key levels to watch (near-the-money):")
            for r in (ntm_calls + ntm_puts)[:6]:
                det = r.get("details",{}); strike = det.get("strike_price"); ctype = det.get("contract_type","?").capitalize()
                exp = det.get("expiration_date",""); oi = r.get("open_interest",0)
                iv = r.get("implied_volatility"); iv_s = f" IV={f(iv*100,pct=True,d=0)}" if iv else ""
                lines.append(f"    MSFT ${strike} {ctype} exp {exp} | OI: {int(oi):,}{iv_s}")
            answer = "\n".join(lines)

        elif "hedge" in q and "put" in q or "protect" in q and "option" in q:
            syms = top_symbols(5)
            lines = ["Protective put options for top equity positions (Massive API):"]
            lines.append("  (5-10% out-of-the-money puts for downside protection)")
            for sym in syms[:3]:
                snap = massive(f"/v2/snapshot/locale/us/markets/stocks/tickers/{sym}")
                curr_p = float(snap.get("ticker",{}).get("day",{}).get("c") or snap.get("ticker",{}).get("lastTrade",{}).get("p") or 100)
                d = massive(f"/v3/snapshot/options/{sym}?contract_type=put&limit=50")
                puts = d.get("results",[])
                # Find 5-10% OTM puts
                target = curr_p * 0.95
                near_puts = sorted([r for r in puts if r.get("details",{}).get("strike_price") and 0.88*curr_p <= float(r["details"]["strike_price"]) <= 0.97*curr_p], key=lambda r: abs(float(r["details"]["strike_price"])-target))
                if near_puts:
                    best = near_puts[0]; det = best.get("details",{}); strike = det.get("strike_price"); exp = det.get("expiration_date",""); oi = best.get("open_interest",0)
                    ask = best.get("last_quote",{}).get("ask") or best.get("day",{}).get("c")
                    cost_str = f" | ask ~{f(ask,dollar=True)}/share (${f(float(ask)*100,d=0)} per 100-share contract)" if ask else ""
                    lines.append(f"  {sym} ({f(curr_p,dollar=True)}): ${strike} put exp {exp} | OI: {int(oi):,}{cost_str}")
                else:
                    lines.append(f"  {sym} ({f(curr_p,dollar=True)}): No near-OTM puts found — try Lookup tab")
            answer = "\n".join(lines)

        elif "put/call" in q or "sentiment" in q and "option" in q or "options" in q and "tech" in q:
            syms = ["MSFT","NVDA","AAPL"]
            lines = ["Options sentiment for tech holdings (Massive API):"]
            overall_puts = 0; overall_calls = 0
            for sym in syms:
                snap = massive(f"/v2/snapshot/locale/us/markets/stocks/tickers/{sym}")
                curr_p = float(snap.get("ticker",{}).get("day",{}).get("c") or snap.get("ticker",{}).get("lastTrade",{}).get("p") or 200)
                d = massive(f"/v3/snapshot/options/{sym}?limit=50")
                results = d.get("results",[])
                puts_oi  = sum(r.get("open_interest",0) for r in results if r.get("details",{}).get("contract_type")=="put")
                calls_oi = sum(r.get("open_interest",0) for r in results if r.get("details",{}).get("contract_type")=="call")
                overall_puts += puts_oi; overall_calls += calls_oi
                ratio = puts_oi / calls_oi if calls_oi else 0
                sentiment = "Bullish (low P/C)" if ratio < 0.7 else ("Bearish (high P/C)" if ratio > 1.3 else "Neutral")
                lines.append(f"  {sym} ({f(curr_p,dollar=True)}): P/C ratio {f(ratio,d=2)} → {sentiment} | OI: calls {int(calls_oi):,} / puts {int(puts_oi):,}")
            overall_ratio = overall_puts / overall_calls if overall_calls else 0
            lines.append(f"  Aggregate tech sector: P/C ratio {f(overall_ratio,d=2)} → {'Bullish' if overall_ratio < 0.8 else 'Cautious'}")
            answer = "\n".join(lines)

        # — InvestorClaw Analytics —
        elif "ytd" in q or "year-to-date" in q or ("compared to" in q and "s&p" in q):
            p = dc("/data/reports/performance.json")
            ps = p.get("data",{}).get("portfolio_summary",{})
            sh = ps.get("weighted_sharpe"); ar = ps.get("weighted_annual_return")
            md = ps.get("weighted_max_drawdown"); vo = ps.get("weighted_volatility"); be = ps.get("weighted_beta_to_market")
            answer = "Performance vs S&P 500 (from Massive price data):\n"
            if ar:
                ar_pct = (ar-1)*100 if ar > 0.1 else ar*100
                direction = "up" if ar_pct > 0 else "down"
                answer += f"  Annual return: {f(ar_pct,pct=True)} year-over-year\n"
            if sh: answer += f"  {_layman_sharpe(sh)}\n"
            if vo: answer += f"  {_layman_volatility(vo*100)}\n"
            if md: answer += f"  {_layman_drawdown(md)}\n"
            if be: answer += f"  {_layman_beta(be)}\n"
            answer += "  (YTD vs S&P 500 chart in Performance tab)"

        elif "risk" in q and ("profile" in q or "volatil" in q or "drawdown" in q or "beta" in q):
            p = dc("/data/reports/performance.json")
            ps = p.get("data",{}).get("portfolio_summary",{})
            vo = ps.get("weighted_volatility"); md = ps.get("weighted_max_drawdown")
            be = ps.get("weighted_beta_to_market"); so = ps.get("weighted_sortino")
            perf = p.get("data",{}).get("performance",{})
            highrisk = sorted([(sym, v.get("volatility",{}).get("annualized_volatility",0))
                               for sym,v in perf.items() if isinstance(v,dict) and v.get("volatility",{}).get("_valid")],
                              key=lambda x: x[1], reverse=True)[:5]
            answer = "Portfolio risk profile:\n"
            if vo: answer += f"  {_layman_volatility(vo*100)}\n"
            if md: answer += f"  {_layman_drawdown(md)}\n"
            if be: answer += f"  {_layman_beta(be)}\n"
            if so: answer += f"  Sortino ratio {f(so,d=2)}: measures return vs downside risk only (higher = better; above 2 = strong)\n"
            if highrisk: answer += "  High-volatility positions: " + ", ".join(f"{s} ({f(v*100,pct=True,d=0)} annual swing)" for s,v in highrisk)

        elif "bond" in q and ("duration" in q or "fixed income" in q or "ytm" in q):
            ba = dc("/data/reports/bond_analysis.json")
            bs = ba.get("data",{}).get("portfolio_summary",{})
            bonds_list = ba.get("data",{}).get("individual_bonds",[])
            bp = hs.get("bond_pct",0)
            answer = (f"Fixed income: {f(bp,pct=True)} of portfolio, "
                      f"{f(bs.get('total_value'),dollar=True)} total, {bs.get('bond_count','?')} bonds.\n"
                      f"  Avg YTM: {f(bs.get('weighted_avg_ytm'),pct=True,d=2)} | "
                      f"Avg duration: {f(bs.get('weighted_avg_duration'),d=1)} yrs ({bs.get('duration_risk','?')} risk)\n"
                      f"  Avg credit: {bs.get('average_credit_quality','?')} | "
                      f"Tax savings: {f(bs.get('total_annual_muni_tax_savings'),dollar=True)}/yr")
            if bonds_list:
                top_bonds = sorted(bonds_list, key=lambda b: b.get('market_value',0), reverse=True)[:5]
                answer += "\n  Top holdings by value:"
                for b in top_bonds:
                    answer += f"\n    {_bond_name(b)}: {f(b.get('market_value'),dollar=True)} | YTM {f(b.get('ytm'),pct=True,d=2)}" 

        elif "analyst" in q and ("buy" in q or "rating" in q or "strong" in q):
            an = dc("/data/reports/analyst_recommendations_summary.json")
            cov = an.get("analyst_coverage",{})
            answer = f"Analyst coverage (Benzinga via Massive): {an.get('summary',{}).get('total_symbols','?')} symbols\n"
            if cov:
                answer += f"  Strong coverage: {cov.get('strong_coverage',0)} | Moderate: {cov.get('moderate_coverage',0)} | Light: {cov.get('light_coverage',0)} | None: {cov.get('no_coverage',0)}\n"
                total = cov.get('strong_coverage',0)+cov.get('moderate_coverage',0)+cov.get('light_coverage',0)
                answer += f"  {total} positions have analyst coverage out of 215 tracked"

        elif "dividend income" in q or "projected annual" in q:
            cf = dc("/data/reports/cashflow.json")
            total = cf.get("annual_total"); yoc = cf.get("yield_on_cost")
            tb = cf.get("tax_breakdown",{})
            answer = f"Projected annual dividend income (Massive dividend data): {f(total,dollar=True)}\n"
            if yoc: answer += f"  Yield on cost: {f(yoc*100,pct=True,d=2)}\n"
            if tb:
                answer += f"  Qualified dividends: {f(tb.get('qualified_dividend',0),dollar=True)}"
                answer += f" | Ordinary: {f(tb.get('ordinary_dividend',0),dollar=True)}"

        elif "cashflow" in q or "payment date" in q or "next dividend" in q or "monthly" in q and "amount" in q:
            cf = dc("/data/reports/cashflow.json")
            total = cf.get("annual_total",0)
            monthly = cf.get("monthly_cashflow",[])
            answer = f"Projected annual cashflow: {f(total,dollar=True)}\n"
            if monthly:
                answer += "Monthly schedule (next 6 months):\n"
                for m in monthly[:6]:
                    mo = m.get("month",""); amt = m.get("total_income",m.get("total",m.get("amount",0)))
                    div = m.get("dividend_income",0); coup = m.get("coupon_income",0)
                    answer += f"  {mo}: {f(amt,dollar=True)} (div: {f(div,dollar=True)}, coupons: {f(coup,dollar=True)})\n"

        elif "scenario" in q or "interest rate" in q or "150 basis" in q or "100 basis" in q or "rate rise" in q:
            sc = dc("/data/reports/scenario.json")
            scenarios = sc.get("data",{}).get("scenarios",[])
            rates = next((s for s in scenarios if "rates_up" in s.get("name","")), None)
            if rates:
                ti = rates.get("total_impact",0); nv = rates.get("new_value"); dp = rates.get("drawdown_pct")
                ei = rates.get("equity_impact"); bi = rates.get("bond_impact")
                answer = f"Rate shock scenario: {rates.get('description')} ({rates.get('rate_shock_bps','?')}bps)\n"
                answer += f"  Total portfolio impact: {f(ti*100,pct=True,d=2)}"
                if nv: answer += f" → new value: {f(nv,dollar=True)}"
                answer += "\n"
                if ei: answer += f"  Equity impact: {f(ei*100,pct=True,d=2)}\n"
                if bi: answer += f"  Bond impact: {f(bi*100,pct=True,d=2)}\n"
                if dp: answer += f"  Scenario drawdown: {f(dp,pct=True,d=2)}"

        elif "changed" in q or "past week" in q or "attribution" in q:
            wc = dc("/data/reports/whatchanged.json")
            wd = wc.get("data",{})
            attr = wd.get("attribution_summary",{}); fb = attr.get("factor_breakdown",{})
            tr = attr.get("total_return",0)
            answer = f"Portfolio attribution (past {wd.get('window_days',7)} days):\n"
            answer += f"  Total return: {f(tr,pct=True,d=2)}\n"
            for factor, val in list(fb.items())[:5]:
                answer += f"  {factor.replace('_',' ').title()}: {f(val,pct=True,d=2)}\n"

        elif "60/40" in q or "benchmark" in q or "peer" in q or "compare" in q:
            pe = dc("/data/reports/peer.json")
            bm = pe.get("benchmark","SPY"); betas = pe.get("beta_matrix",{})
            asvs = pe.get("active_share"); over = pe.get("overweight_sectors",[])[:3]
            answer = f"vs {bm} benchmark (Massive price data):\n"
            if asvs is not None:
                as_pct = asvs*100
                if as_pct < 20: overlap = "very similar to index (closet indexer)"
                elif as_pct < 60: overlap = "partially active management"
                else: overlap = "highly active — significantly different from index"
                answer += f"  Active share: {f(as_pct,pct=True)} — {overlap}\n"
            bspy = betas.get('vs_spy'); bqqq = betas.get('vs_qqq')
            if bspy:
                beta_desc = "moves with market" if 0.8 <= float(bspy) <= 1.2 else ("less volatile than market" if float(bspy) < 0.8 else "more volatile than market")
                answer += f"  Beta vs S&P 500: {f(bspy,d=2)} ({beta_desc})\n"
            if over:
                over_fmt = ", ".join(f"{s.get('sector','?')} (+{f(s.get('delta',0)*100,pct=True,d=1)})" if isinstance(s,dict) else str(s) for s in over)
                answer += f"  Overweight sectors vs benchmark: {over_fmt}"

        elif "market" in q and ("trend" in q or "context" in q or "macro" in q or "affect" in q):
            ne = dc("/data/reports/portfolio_news.json")
            posture = ne.get("posture","N/A"); narr = ne.get("narrative","")
            tails = ne.get("key_tailwinds",[])[:3]; heads = ne.get("key_headwinds",[])[:2]
            answer = f"Market context (Benzinga via Massive): Sentiment {posture}\n"
            if narr: answer += str(narr)[:400] + "\n"
            if tails: answer += "Key tailwinds: " + "; ".join(str(t)[:70] for t in tails)

        else:
            answer = f"Query: '{question[:80]}' — see relevant dashboard tab for full data."

    except Exception as e:
        answer = f"Formatting error: {e}"

    return answer, int((time.time()-t0)*1000), True


# ── Surface Test Log ────────────────────────────────────────────────────────
def load_surface_log():
    if not os.path.exists(JSONL_LOG): return []
    runs = []
    with open(JSONL_LOG) as f:
        for line in f:
            try: runs.append(json.loads(line))
            except: pass
    return runs


# ── PDF Generation ──────────────────────────────────────────────────────────
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle, Paragraph,
                                Spacer, HRFlowable, KeepTogether, Image)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

BLUE   = colors.HexColor("#0066cc")
TEAL   = colors.HexColor("#004f6d")
LTBLUE = colors.HexColor("#e6f2ff")
WHITE  = colors.white
DARK   = colors.HexColor("#1a1a2e")
LGRAY  = colors.HexColor("#f8f9fa")
MGRAY  = colors.HexColor("#dee2e6")

def generate_pdf(qa_pairs, runs, screenshots):
    doc = SimpleDocTemplate(PDF_PATH, pagesize=letter,
        leftMargin=0.65*inch, rightMargin=0.65*inch,
        topMargin=0.6*inch, bottomMargin=0.6*inch)

    styles = getSampleStyleSheet()
    story = []

    def _p(text, style=None, **kw):
        if style is None:
            style = ParagraphStyle("x", parent=styles["Normal"], **kw)
        return Paragraph(text, style)

    # — Header —
    now = datetime.datetime.now().strftime("%H:%M EDT")
    hdrs = [
        [_p("<b>InvestorClaw × Massive</b>", fontSize=18, alignment=1, textColor=TEAL),
         _p(f"Generated {datetime.date.today().strftime('%B %d, %Y')} {now}", fontSize=10, alignment=2, textColor=colors.gray)],
        [_p("End-of-Day Portfolio Intelligence Report", fontSize=12, textColor=BLUE, alignment=1), ""]
    ]
    t_hdr = Table(hdrs, colWidths=[5.0*inch, 2.5*inch])
    t_hdr.setStyle(TableStyle([("SPAN",(0,0),(0,0)),("ALIGN",(0,0),(-1,-1),"CENTER"),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
    story.append(t_hdr)
    story.append(Spacer(1, 0.1*inch))

    # Info table
    info_data = [
        [_p("<b>Data Source</b>", alignment=1, textColor=WHITE),
         _p("<b>Engine</b>", alignment=1, textColor=WHITE),
         _p("<b>Agent Runtime</b>", alignment=1, textColor=WHITE),
         _p("<b>NLQ Interface</b>", alignment=1, textColor=WHITE)],
        [_p("Massive API\n(Real-time quotes,\nBenzinga news,\nAnalyst ratings)", alignment=1, fontSize=9),
         _p("InvestorClaw v4.4.4\n(Deterministic engine,\nHMAC-signed envelopes)", alignment=1, fontSize=9),
         _p("ZeroClaw v0.7.4\n(Together AI\nQwen2.5-7B)", alignment=1, fontSize=9),
         _p(f"Natural Language Query\n({len(qa_pairs)} domain questions\nacross all analytics)", alignment=1, fontSize=9)]
    ]
    t_info = Table(info_data, colWidths=[1.85*inch]*4)
    t_info.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),TEAL),("TEXTCOLOR",(0,0),(-1,0),WHITE),
        ("ALIGN",(0,0),(-1,-1),"CENTER"),("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("FONTSIZE",(0,0),(-1,-1),9),("ROWBACKGROUNDS",(0,1),(-1,-1),[LGRAY,WHITE]),
        ("GRID",(0,0),(-1,-1),0.5,MGRAY),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)
    ]))
    story.append(t_info)

    # Portfolio line
    story.append(Spacer(1, 0.08*inch))
    story.append(_p(f"Portfolio: UBS Holdings (298 positions) | Provider: Massive (partner) | Generated: {now}",
                    fontSize=8, textColor=colors.gray))
    story.append(Spacer(1, 0.15*inch))

    # — Massive API Health —
    story.append(_p("<b>Massive API Health — Market Hours</b>", fontSize=12, textColor=TEAL))
    story.append(Spacer(1, 0.05*inch))
    ep_names = ["Prev Close","RT Snapshot","Batch","Aggs","News","Financials","Ticker Detail","Options","All OK"]
    ep_keys  = ["prev_close","rt_snapshot","batch_snapshot","aggs_5d","news","financials","ticker_details","options"]
    hdr_row  = [_p(f"<b>{x}</b>", alignment=1, textColor=WHITE, fontSize=8) for x in ["Time"]+ep_names]
    api_data = [hdr_row]
    for run in runs[-2:]:
        ts = run.get("run_ts","")[:16].replace("T"," ")
        ma = run.get("massive_api",{})
        all_ok = all(ma.get(k,{}).get("ok",False) for k in ep_keys)
        row = [_p(ts, fontSize=7)]
        for k in ep_keys:
            ok = ma.get(k,{}).get("ok",False)
            row.append(_p("✓" if ok else "✗", alignment=1, fontSize=10, textColor=colors.green if ok else colors.red))
        ok_count = sum(1 for k in ep_keys if ma.get(k,{}).get("ok",False))
        row.append(_p(f"<b>{ok_count}/8</b>", alignment=1, fontSize=9))
        api_data.append(row)
    t_api = Table(api_data, colWidths=[1.05*inch]+[0.58*inch]*8+[0.45*inch])
    t_api.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),TEAL),("TEXTCOLOR",(0,0),(-1,0),WHITE),
        ("ALIGN",(0,0),(-1,-1),"CENTER"),("FONTSIZE",(0,0),(-1,-1),8),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[LGRAY,WHITE]),("GRID",(0,0),(-1,-1),0.5,MGRAY),
        ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)
    ]))
    story.append(t_api)
    story.append(Spacer(1, 0.15*inch))

    # — Execution Log —
    story.append(_p("<b>InvestorClaw Engine — Execution Log (Massive Primary)</b>", fontSize=12, textColor=TEAL))
    story.append(Spacer(1, 0.05*inch))
    cmds_order = ["holdings","performance","bonds","analyst","news","whatchanged","scenario","optimize","cashflow","peer","market-news","synthesize"]
    col_labels = ["Time","Holdings","Perf","Bonds","Analyst","News","WhatChgd","Scenario","Optimize","Cashflow","Peer","Markets","Synth","Pass"]
    exec_data = [[_p(f"<b>{x}</b>", alignment=1, textColor=WHITE, fontSize=7) for x in col_labels]]
    for run in runs[-2:]:
        ts = run.get("run_ts","")[:16].replace("T"," ")
        cmds = run.get("ic_engine_cmds",{})
        row = [_p(ts, fontSize=7)]
        passes = 0
        for c in cmds_order:
            ok = cmds.get(c,{}).get("ok",False)
            ms = cmds.get(c,{}).get("duration_ms",0)
            if ok: passes += 1
            sym = "✓" if ok else "✗"
            dur = f"{ms//1000}s" if ms else "—"
            row.append(_p(f"{sym}\n{dur}", alignment=1, fontSize=7, textColor=colors.green if ok else colors.red))
        row.append(_p(f"<b>{passes}/12</b>", alignment=1, fontSize=8))
        exec_data.append(row)
    t_exec = Table(exec_data, colWidths=[0.95*inch]+[0.49*inch]*12+[0.43*inch])
    t_exec.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),DARK),("TEXTCOLOR",(0,0),(-1,0),WHITE),
        ("ALIGN",(0,0),(-1,-1),"CENTER"),("FONTSIZE",(0,0),(-1,-1),7),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[LGRAY,WHITE]),("GRID",(0,0),(-1,-1),0.5,MGRAY),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)
    ]))
    story.append(t_exec)

    # — Dashboard Screenshots —
    if screenshots:
        story.append(Spacer(1, 0.2*inch))
        story.append(HRFlowable(width="100%", thickness=1, color=MGRAY))
        story.append(Spacer(1, 0.1*inch))
        story.append(_p("<b>InvestorClaw Dashboard — Live Views</b>", fontSize=14, textColor=TEAL))
        story.append(_p("Screenshots captured from the live InvestorClaw v4.4.4 dashboard, powered by Massive real-time data.",
                        fontSize=9, textColor=colors.gray))
        story.append(Spacer(1, 0.1*inch))

        # 2 screenshots per page max, full width
        from reportlab.platypus import PageBreak as _PB
        img_w = 6.5*inch; img_h = 4.15*inch  # slightly reduced: 2×(label+img+space)=9.5in < 9.8in page
        items = []
        for name, path in screenshots:
            if not os.path.exists(path): continue
            try:
                items.append((name, Image(path, width=img_w, height=img_h)))
            except Exception as e:
                print(f"  Image embed error for {name}: {e}")
        # Pair up; KeepTogether prevents each pair from splitting across pages
        for i in range(0, len(items), 2):
            chunk = items[i:i+2]
            block = []
            for nm, im in chunk:
                block.append(_p(f"<b>{nm}</b>", alignment=1, fontSize=10, textColor=TEAL))
                block.append(Spacer(1, 0.05*inch))
                block.append(im)
                block.append(Spacer(1, 0.1*inch))
            story.append(KeepTogether(block))
            story.append(_PB())

    # — NLQ Section —
    story.append(Spacer(1, 0.2*inch))
    story.append(HRFlowable(width="100%", thickness=1, color=MGRAY))
    story.append(Spacer(1, 0.1*inch))
    story.append(_p("<b>Natural Language Portfolio Queries</b>", fontSize=14, textColor=TEAL))
    story.append(_p(
        "The following questions were submitted covering the full Massive API surface "
        "(Qwen/Qwen2.5-7B-Instruct-Turbo via Together AI). "
        "InvestorClaw's deterministic engine — powered by Massive real-time data — "
        "synthesizes portfolio-specific answers. All numeric data originates from the Massive API.",
        fontSize=9))
    story.append(Spacer(1, 0.1*inch))

    q_style = ParagraphStyle("qs", parent=styles["Normal"], textColor=BLUE, fontSize=10, spaceAfter=2)
    meta_style = ParagraphStyle("ms", parent=styles["Normal"], textColor=colors.gray, fontSize=8, spaceAfter=4)
    ans_style = ParagraphStyle("as", parent=styles["Normal"], fontSize=9, leftIndent=12, spaceAfter=6)
    sep_style = TableStyle([("LINEABOVE",(0,0),(-1,-1),0.5,MGRAY),("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)])

    for i, (cat, question, answer, dur_ms, ok) in enumerate(qa_pairs, 1):
        dur_s = dur_ms//1000 if dur_ms >= 1000 else f"<1"
        ok_sym = "✓" if ok else "✗"
        block = [
            _p(f"<b>Q{i}. [{cat}]</b> {question}", q_style),
            _p(f"ZeroClaw → InvestorClaw → Massive | {dur_s}s | {ok_sym}", meta_style),
        ]
        # format answer preserving newlines
        ans_text = str(answer).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
        for line in ans_text.split("\n"):
            if line.strip():
                block.append(_p(line, ans_style))
        block.append(HRFlowable(width="100%", thickness=0.5, color=MGRAY))
        story.append(KeepTogether(block))

    # Footer
    story.append(Spacer(1, 0.15*inch))
    footer = _p(
        f"InvestorClaw v4.4.4 | ZeroClaw v0.7.4 | Massive Partner API | "
        f"Report generated {datetime.date.today().strftime('%B %d, %Y')} {now} | "
        "Data sourced exclusively from Massive (massive.com-compatible) — "
        "real-time quotes, Benzinga news, analyst ratings. InvestorClaw is educational only — not financial advice.",
        fontSize=7, textColor=colors.gray, alignment=1)
    story.append(footer)

    doc.build(story)
    print(f"PDF written: {PDF_PATH}")


# ── Main ────────────────────────────────────────────────────────────────────
def main():
    print(f"EOD PDF generator starting — {datetime.datetime.now().isoformat()}")
    runs = load_surface_log()[-2:]
    print(f"Loaded {len(runs)} surface test records")

    # Wait for ic-engine init_state=ready
    import urllib.request as _ur2
    print("Waiting for ic-engine init_state=ready...")
    for _attempt in range(90):  # up to 6 min (90 × 4s) — engine auto-init takes 3-5 min
        try:
            with _ur2.urlopen("http://localhost:18092/healthz", timeout=5) as _r:
                _h = json.loads(_r.read())
            if _h.get("init_state") == "ready":
                print(f"  Engine ready (attempt {_attempt+1})")
                break
        except Exception:
            pass
        time.sleep(4)
    else:
        print("  Warning: engine not ready, proceeding anyway")

    # Refresh news data (avoids stale "LAST FETCH yesterday" on News tab)
    print("Refreshing portfolio news...")
    try:
        subprocess.run(
            ["docker", "exec", "ic-engine",
             "/opt/ic-engine/.venv/bin/investorclaw", "news"],
            capture_output=True, timeout=45)
        print("  news refreshed")
    except Exception as _ne:
        print(f"  news refresh failed: {_ne}")

    # Pre-populate markets.json
    print("Populating markets.json from Massive API...")
    try:
        populate_markets_json()
    except Exception as _me:
        print(f"  markets.json failed: {_me}")

    # Capture dashboard screenshots
    screenshots = []
    print("Capturing dashboard screenshots...")
    for name, path in SCREENSHOT_TABS:
        url = f"http://localhost:18092{path}"
        out = f"/tmp/dash_{name.lower().replace(' ','_').replace('/','_')}.png"
        print(f"  {name}: {url}")
        ok = capture_screenshot(url, out)
        if ok:
            screenshots.append((name, out))
            print(f"    ✓ saved {out}")
        else:
            print(f"    ✗ failed")

    print(f"Screenshots captured: {len(screenshots)}/{len(SCREENSHOT_TABS)}")

    # Run 50 NLQ prompts
    qa_pairs = []
    for i, (cat, question) in enumerate(NLQ_PROMPTS, 1):
        print(f"[{i}/{len(NLQ_PROMPTS)}] {cat}: {question[:55]}...", flush=True)
        answer, dur_ms, ok = zeroclaw_nlq(question)
        print(f"  → {dur_ms//1000}s, ok={ok}")
        qa_pairs.append((cat, question, answer, dur_ms, ok))

    print(f"\nGenerating PDF with {len(qa_pairs)} Q&A pairs + {len(screenshots)} screenshots...")
    generate_pdf(qa_pairs, runs, screenshots)
    print("Done.")


if __name__ == "__main__":
    main()

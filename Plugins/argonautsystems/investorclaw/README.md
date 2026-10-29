# InvestorClaw

[![skills.sh](https://skills.sh/b/argonautsystems/InvestorClaw)](https://skills.sh/argonautsystems/InvestorClaw)

<p align="center">
  <picture>
    <source srcset="assets/investorclaw-logo.webp" type="image/webp">
    <img src="assets/investorclaw-logo.jpg" alt="InvestorClaw" width="200">
  </picture>
</p>

<p align="center">
Portfolio analysis and market intelligence | v4.5.0 | Apache 2.0 + MIT-0 | Educational Use Only
</p>

InvestorClaw is a self-contained containerized software package that any MCP-capable agent calls into. It is not a markdown skill. It is not a prompt injection. It is the adapter and distribution layer for a real portfolio engine, packaged for agent runtimes that know how to speak MCP.

The deterministic engine lives in [`ic-engine`](https://github.com/argonautsystems/ic-engine). Foundation primitives live in [`clio`](https://github.com/argonautsystems/clio). The runtime container lives in [`mnemos-ic-runtime`](https://github.com/ncz-os/mnemos-ic-runtime).

**New to InvestorClaw?** The fastest path is the prebuilt container — see **[Getting Started](docs/GETTING_STARTED.md)**: `docker pull ghcr.io/argonautsystems/ic-engine:4.7.7-cpu`, mount a portfolio CSV, done. No source build. Works with any market-data provider (free `yfinance` by default).

Optional [Stonkmode](docs/STONKMODE_AVATAR_LEGEND.md) adds live commentary from 30 fictional cable TV finance personalities. It is entertainment and education on top of the portfolio surface, not a requirement.

---

## Features

InvestorClaw separates agent-facing commands from portfolio computation.

- Containerized engine. The current runtime is a single Docker container with MCP-HTTP on port `18090` and the dashboard portal on port `18092`. Start the container, point an MCP-capable agent at it, and ask portfolio questions.
- Deterministic computation. There is no LLM in the parse path. Holdings parsing, normalization, analytics, and envelopes are deterministic. Narration is optional, provider-swappable, and sits on top of structured output.
- Nine asset classes. InvestorClaw handles equities, ETFs, bonds, mutual funds, options, cash, **CME futures** (priced via Massive's `/futures/vX` feed with correct contract-multiplier notional), crypto, and precious metals.
- Massive market data. [Massive](https://massive.com) (massive.com) is the primary paid provider — batch quotes for large portfolios and **CME futures via `/futures/vX`** with correct contract-multiplier notional. Set `MASSIVE_API_KEY` and optionally `INVESTORCLAW_PRICE_PROVIDER=massive`. Full guide: [Getting Started](docs/GETTING_STARTED.md). Full provider matrix: [docs/PROVIDERS.md](docs/PROVIDERS.md).
- Twenty MCP tools. The primary surface is `portfolio_ask`, `portfolio_initialize`, `portfolio_initialize_status`, `portfolio_holdings`, `portfolio_refresh`, `portfolio_setup`, `portfolio_keys_status`, `portfolio_keys_set`, `portfolio_keys_delete`, `portfolio_keys_recommend`, `portfolio_keys_backup`, `portfolio_keys_restore`, `portfolio_keys_backups_list`, `portfolio_response_get`, `portfolio_response_list`, `portfolio_response_delete`, `portfolio_response_flag_bad`, `portfolio_version_check`, `portfolio_export`, and `portfolio_import`.
- 17-tab dashboard portal. Open `http://localhost:18092` for Overview, Holdings, Performance, WhatChanged, Scenarios, Bonds, Optimize, Cashflow, Peer, Analyst, News, Markets, Lookup, Synthesis, Reports, Settings, and About.
- Regenerate from the browser. The Overview tab has a Regenerate button that fires setup, refresh, and all 12 analyzers as a background sweep.
- Web upload form. Settings accepts multipart uploads for `.csv`, `.tsv`, `.xls`, `.xlsx`, `.pdf`, `.json`, `.ofx`, and `.qfx` portfolio files.
- Pluggable, battery-tuned narration. Narration is two-stage — a **consultant** compresses the signed envelope into a fact-faithful summary, then a **narrator** enriches it. The 30-prompt COBOL hallucination battery ([`harness/cobol/PROVIDER_HALLUCINATION_REPORT.md`](harness/cobol/PROVIDER_HALLUCINATION_REPORT.md)) settled the defaults: **consultant = `deepseek-v4-flash` via the direct DeepSeek API** (cheapest, and matches `gemma-4-31B` on hallucination with better coverage); **narrator = `gemini-3.1-pro`** (lowest fabrication) or `llama-3.3-70b` on Groq/Together (max coverage). Any OpenAI-compatible endpoint works — set `INVESTORCLAW_CONSULTANT_*` and `INVESTORCLAW_NARRATIVE_*` (see [Getting Started](docs/GETTING_STARTED.md)).
- Safe fallback defaults. InvestorClaw can start with no API keys and use the `yfinance` fallback. Optional keys improve news, ratings, and premium data coverage.
- HMAC-signed envelopes. Outputs are tamper-evident. They are not encrypted.
- No fabrication path. The engine returns what it can prove from data, marks gaps, and avoids pretending that missing facts exist.
- No brokerage credentials. InvestorClaw does not ask for brokerage logins and does not need them.
- No outbound trades. This package analyzes portfolios. It never places orders.
- Cobol NLQ barrage coverage. The 30-prompt natural-language query barrage in `harness/cobol/nlq-prompts.json` currently stands at 29/30 PASS.

Native cross-runtime coverage varies.

See [docs/AGENT-COMPARISON.md](docs/AGENT-COMPARISON.md) *(coming soon)* for the per-runtime provider matrix.

> Note: Effective April 4, 2026, Anthropic Claude subscriptions (Pro at $20/mo and Max at $100–$200/mo) no longer cover use from third-party agent runtimes like OpenClaw, ZeroClaw, or Hermes Agent. The plan limits do not apply there, and a subscription alone will not authenticate those calls.
>
> To use Claude models from a third-party agent, either enable pay-as-you-go "extra usage" billing on the subscription or connect with a direct API key on metered billing.
>
> Claude Code is different. Anthropic subscriptions continue to apply normally there at standard rates.
>
> Battery-validated narration stack ([`harness/cobol/PROVIDER_HALLUCINATION_REPORT.md`](harness/cobol/PROVIDER_HALLUCINATION_REPORT.md)): **consultant `deepseek-v4-flash`** (direct DeepSeek API — cheapest, matches Gemma-4-31B), **narrator `gemini-3.1-pro`** (lowest fabrication) or `llama-3.3-70b` via Groq/Together (coverage). Use Claude Code if you want Claude.
>
> Sources: [PYMNTS 2026-04-04](https://www.pymnts.com/artificial-intelligence-2/2026/third-party-agents-lose-access-as-anthropic-tightens-claude-usage-rules/), [VentureBeat](https://venturebeat.com/technology/anthropic-cuts-off-the-ability-to-use-claude-subscriptions-with-openclaw-and)

---

## Non-Goals

InvestorClaw helps you have informed conversations with your financial advisor by surfacing data-driven insights. It does not manage money. It does not execute trades. It does not provide investment advice.

---

## Comparison With thinkorswim

InvestorClaw helps you understand your portfolio. thinkorswim helps you execute trades.

|  | InvestorClaw | thinkorswim |
|---|---|---|
| Purpose | Portfolio analysis & insights | Active trading & execution |
| Can trade? | ❌ No | ✅ Yes |
| Data source | Free (yfinance) + optional paid (Massive, Finnhub) | Real-time (proprietary) |
| Run locally? | ✅ Yes (Docker / yfinance fallback) | ❌ Cloud only |
| Open source? | ✅ Yes (Apache 2.0) | ❌ Proprietary |
| Target user | Individual investors + advisors | Professional/active traders |
| Best for | Understanding your portfolio | Executing trades + charting |

Use InvestorClaw to analyze.

Use thinkorswim to execute.

Use both if you want analysis and execution in one workflow.

---

## Quick Start

InvestorClaw supports Claws-family, Claude Code, Hermes Agent, and standalone Docker Compose deployment paths.

Choose the platform that matches how you work.

### Claude Code / Claude Desktop

Add InvestorClaw as a plugin marketplace **directly from this repo**, then install:

```text
/plugin marketplace add argonautsystems/InvestorClaw
/plugin install investorclaw
```

First question:

```text
What are my current holdings?
```

No source clone, no `uv`, no Python installers. The plugin pulls the public
`ic-engine` container and drives it over MCP-HTTP — the **same skill and same
container** as every other runtime below. Full walkthrough, including how to
pick a market-data provider: **[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)**.

---

### OpenClaw

OpenClaw fits Linux and macOS workstations and servers.

Install InvestorClaw as an OpenClaw skill:

```bash
clawhub install investorclaw
```

First question:

```text
Run a full portfolio analysis.
```

---

### ZeroClaw

ZeroClaw fits Raspberry Pi and other ARM devices.

Install InvestorClaw:

```bash
clawhub install investorclaw
```

First question:

```text
What's my bond allocation?
```

---

### Hermes Agent

Hermes Agent installs InvestorClaw inside the NousResearch agentic CLI.

Hermes Agent is the agentic CLI.

It is not a model.

You can pair it with any provider the agent supports. That includes cloud providers such as OpenAI, Together, xAI, OpenRouter, and Nous Portal. It also includes fully local providers such as Ollama, vLLM, llama-server, and LMStudio.

> Note: The Hermes LLM family (Hermes 3, Hermes 4 - NousResearch fine-tunes of Llama/Qwen) is a separate product. Hermes Agent can use a Hermes LLM as its backend model, or any other model.

```bash
clawhub install investorclaw
```

First question:

```text
Summarize my portfolio performance.
```

---

### Standalone Docker Compose

Use the runtime container directly when you want InvestorClaw without an agent-specific installer.

Runtime source: [`ncz-os/mnemos-ic-runtime`](https://github.com/ncz-os/mnemos-ic-runtime).

```bash
docker compose up -d
```

Dashboard: `http://localhost:18092`.

Then connect any MCP client to:

```text
http://localhost:18090/mcp
```

First question to agent:

```text
List available portfolio tools.
```

---

## Dashboard / Web Portal

The local dashboard runs at `http://localhost:18092`.

It is the browser surface for people who want to inspect the portfolio, upload files, regenerate analytics, manage provider keys, and read saved reports without turning every action into a chat prompt.

| Tab | What it shows |
|---|---|
| Overview | Live portfolio snapshot plus the Regenerate button, which triggers the full 12-analyzer sweep |
| Holdings | Position-level detail with cost basis, market value, and gain/loss |
| Performance | Time-series return charts, alpha, beta, and Sharpe |
| WhatChanged | Delta view between the last two refreshes |
| Scenarios | What-if analysis for allocation shifts |
| Bonds | Duration, yield, and credit quality breakdown |
| Optimize | Mean-variance and risk-parity weight suggestions |
| Cashflow | Dividend and coupon income calendar |
| Peer | Relative performance vs benchmark and peer basket |
| Analyst | Wall Street consensus estimates and ratings |
| News | Recent headlines filtered to portfolio constituents |
| Markets | Broad market context across indices, sectors, and macro |
| Lookup | Symbol search and quick quote |
| Synthesis | Narrative summary generated by the configured LLM provider |
| Reports | Saved HTML reports and EOD email archives |
| Settings | API key management, portfolio file upload, and provider config |
| About | Version, license, and build info |

The Regenerate button on Overview fires setup, refresh, and all 12 analyzers as a background sweep. Results normally become visible in Overview within about 60 seconds.

The upload form on Settings sends a multipart POST and accepts `.csv`, `.tsv`, `.xls`, `.xlsx`, `.pdf`, `.json`, `.ofx`, and `.qfx` files.

---

## Commands / MCP Tools

See [docs/MCP_TOOLS_REFERENCE.md](docs/MCP_TOOLS_REFERENCE.md) for the full command contract.

| Tool | Purpose |
|---|---|
| portfolio_ask | Natural-language query against current portfolio data |
| portfolio_initialize | Seed the engine with uploaded holdings |
| portfolio_initialize_status | Poll initialization progress |
| portfolio_holdings | Return current holdings envelope |
| portfolio_refresh | Re-run all 12 analyzers |
| portfolio_setup | One-shot setup from raw file |
| portfolio_keys_status | Check which provider API keys are configured |
| portfolio_keys_set | Set a named provider API key |
| portfolio_keys_delete | Delete a named provider API key |
| portfolio_response_get | Retrieve a saved response by ID |
| portfolio_response_list | List saved responses |
| portfolio_response_delete | Delete a saved response |
| portfolio_response_flag_bad | Flag a response as low quality (feedback loop) |

---

## EOD Report

Ask InvestorClaw to generate an HTML email report that summarizes your portfolio at end of day.

<p align="center">
  <picture>
    <source srcset="assets/eod-report-sample.webp" type="image/webp">
    <img src="assets/eod-report-sample.jpg" alt="InvestorClaw end-of-day portfolio report sample" width="420">
  </picture>
</p>

```text
investorclaw ask "Generate my end-of-day portfolio report"
investorclaw ask "Generate my end-of-day report and email it to you@example.com"
```

For direct engine use inside the v4.x container, run:

```bash
docker exec ic-engine investorclaw eod-report --email-to address@example.com
```

A live HTML preview is also available at `http://localhost:18092/reports/eod_report_<YYYYMMDD>.html` once the daily run finishes. A static sample of the rendered report ships at [`assets/eod-report-sample.html`](assets/eod-report-sample.html) — open it in a browser to see the layout without running a portfolio first.

The report includes:

- Real-time prices and net values
- Performance metrics (Sharpe, Sortino, max drawdown, beta, VaR, period returns)
- Sector + asset-class allocation
- Per-symbol news sentiment with clickable headlines
- Fixed income detail (YTM, duration, maturity ladder, coupon schedule)
- 10 FA Discussion Topics (concentration risk, sector exposure, allocation drift, tax efficiency, news catalysts) with severity flags
- Email-ready HTML with a dark theme
- Mobile-responsive layout

Run it daily with cron if you want the institutional-grade HTML email waiting after market close.

Example cron pattern:

```cron
0 17 * * 1-5 investorclaw eod-report --email-to address@example.com
```

Set the usual SMTP environment variables for delivery, including `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`, and `SMTP_TLS`.

---

## Narrator providers (grounding battery)

> **Scope.** The recommendation below is for the **non-Claude provider
> path** -- openclaw / zeroclaw / hermes bringing an external narrator
> API key (`TOGETHER_API_KEY`, `GEMINI_API_KEY`, etc.). On **Claude Code
> / Claude Desktop**, do **not** wire an external narrator API key:
> the agent narrates with its own Claude over its OAuth subscription
> (Sonnet 4.6 for narrative, Opus 4.7 for escalation), which is both
> the highest-quality and the lowest-friction path.

A 540-run battery (2 consultants x 9 non-Claude narrator providers x 30
NLQ prompts) measured how faithfully each narrator quotes the signed
envelope without inventing numbers (`pass` = grounded + on-intent / 30;
`halluc` = mean ungrounded numbers per answer):

| narrator | pass / 30 | mean halluc |
|---|---:|---:|
| **gemini** | **17.0** | **0.36** |
| groq | 7.5 | 0.92 |
| together | 7.5 | 1.06 |
| perplexity | 6.5 | 1.38 |
| siliconflow | 5.0 | 1.30 |
| claude-sonnet-4-6 (via API) | 5.0 | 1.45 |
| xai | 4.0 | 1.07 |
| deepseek | 3.5 | 1.15 |
| gpt-5.2-chat | 2.5 | 1.23 |

- **gemini is the best-grounded external narrator** under both
  consultants: highest pass, lowest hallucination.
- The strongest chat models hallucinate the **most** -- fluent
  embellishment is a liability in a strict grounding task, even with a
  "quote every number verbatim" system prompt. (claude-sonnet here is
  the raw external-API narrator with no validator gate; on Claude Code
  the built-in validator pass corrects this -- another reason Claude
  agents should stay on their own OAuth Claude.)
- Consultant reliability: `deepseek_flash` 0%% timeout vs
  `gemma_together` 31%% (Together serverless latency).
- **Recommended (non-Claude agents): `deepseek_flash` consultant +
  `gemini` narrator.**


## Documentation

InvestorClaw runs as a containerized MCP package for multiple agent runtimes. Every runtime — Claude Code, Claude Desktop, OpenClaw, ZeroClaw, Hermes — installs the same skill and drives the same `ic-engine` container; only the installer command differs.

Start here: **[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)** (provider-agnostic, all runtimes). Or use the Quick Start section above to jump to your platform.

[docs/blog/we-stopped-fighting-the-agents.md](docs/blog/we-stopped-fighting-the-agents.md) — Draft TechBroiler sequel: determinism wasn't enough, we stopped fighting the agents and pulled the skill into its own container.

### Supported Agent Runtimes

| Page | What's there |
|------|--------------|
| [docs/AGENT-COMPARISON.md](docs/AGENT-COMPARISON.md) *(coming soon)* | Claude Code vs. OpenClaw vs. ZeroClaw vs. Hermes Agent |

### Claude Code and Claude API

| Page | What's there |
|------|--------------|
| [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) | Claude Code / Claude Desktop install path (direct `/plugin marketplace add argonautsystems/InvestorClaw`), provider selection, and the container-first runtime model |

### OpenClaw, ZeroClaw, and Hermes Agent

| Page | What's there |
|------|--------------|
| [docs/CLAWS_SETUP.md](docs/CLAWS_SETUP.md) *(coming soon)* | OpenClaw, ZeroClaw, and Hermes Agent setup notes |

### Shared Claw Architecture

| Page | What's there |
|------|--------------|
| [docs/CLAW_ARCHITECTURE.md](docs/CLAW_ARCHITECTURE.md) *(coming soon)* | Shared patterns across Claw-family runtimes |

### Commands and Features

| Page | What's there |
|------|--------------|
| [docs/DASHBOARD.md](docs/DASHBOARD.md) | Dashboard portal reference for the 17-tab localhost web UI |
| [docs/MCP_TOOLS_REFERENCE.md](docs/MCP_TOOLS_REFERENCE.md) | MCP tool names, request shapes, and response contracts |

### Architecture and Design

| Page | What's there |
|------|--------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) *(coming soon)* | Container, engine, dashboard, and adapter design |

### Deployment and Operations

| Page | What's there |
|------|--------------|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) *(coming soon)* | Docker Compose, runtime operations, and production notes |

### Security and Privacy

| Page | What's there |
|------|--------------|
| [docs/SECURITY.md](docs/SECURITY.md) *(coming soon)* | Localhost-first defaults, key handling, and privacy model |

---

## Security and Privacy

InvestorClaw is localhost-first.

The engine is read-only. It analyzes portfolio files and market data, but it does not accept brokerage credentials and does not execute trades.

The container runs as a non-root user (`uid 1000`).

Provider keys live in `/data/keys.env` inside the container with mode `0600`.

Output envelopes are HMAC-signed so callers can detect tampering. HMAC signatures are not encryption.

InvestorClaw has no telemetry and no analytics.

---

## License

Substantive code is Apache 2.0. That includes the bridge, dashboard, Dockerfile, tests, and engine work in [`argonautsystems/ic-engine`](https://github.com/argonautsystems/ic-engine).

Distribution-edge artifacts are MIT-0. That includes `SKILL.md`, `compose.yml`, `install.yaml`, and `agent-skills/**`.

See [LICENSE](LICENSE) for full Apache 2.0 terms.

---

Author: Jason Perlow | Questions? [Open an issue on GitHub](https://github.com/argonautsystems/InvestorClaw/issues)

v4.5.0 | Apache 2.0 + MIT-0 | Educational Use Only

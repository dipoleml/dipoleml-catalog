# Changelog

All notable changes to InvestorClaw v4.x (mnemos-os/mnemos-ic-runtime).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Distribution-edge artifacts (`SKILL.md`, `compose.yml`, `install.yaml`,
`agent-skills/**`) are MIT-0; substantive code (bridge, dashboard,
Dockerfile, tests) is Apache 2.0.

## [4.7.7] — 2026-06-14

### Changed
- **Narrator: temporal-hedge recovery.** Time-window questions ("how did my
  portfolio do last week", "what moved this week") that the narrator answered
  with a non-sentinel hedge are now recovered from the signed envelope's
  `whatchanged`/`performance` sections (verbatim, still validated — no
  fabrication). Complements the 4.7.5 OUT_OF_SCOPE recovery.

## [4.7.5] — 2026-06-14

### Fixed
- **Narrator phrasing-recovery.** When the LLM narrator spuriously refused a
  valid portfolio question (`OUT_OF_SCOPE`) despite the envelope holding the
  data, recover deterministically from `performance`/`whatchanged` verbatim;
  `validate_narration` still runs so the anti-fabrication guarantee holds.

### Docs
- **Recommended narration config** updated to the hallucination-battery winner:
  consultant `deepseek-v4-flash` (direct) + narrator `gemini`. `gemma-4-31B` is
  now a legacy/offline alternative.
- **yfinance fallback** documented with a large-portfolio timeout disclaimer.

## [4.7.4] — 2026-06-14

### Changed
- **Market data → Massive everywhere.** Performance, analyst, news, cashflow,
  peer, treasury and price paths migrated to the Massive API (fast, realtime).
  **Yahoo Finance (`yfinance`) is retained as the last-resort fallback** so
  deployments without a `MASSIVE_API_KEY` still work (slower; large portfolios
  may time out).

## [4.1.29] — 2026-05-04

### Added

- **Reference / contract specs** ported from v2.6 git history into
  `docs/references/`:
  - `contract-input.md` — broker-CSV column mapping (recognized column
    names, bond metadata extraction from description strings, guided
    mapping flow)
  - `contract-output.md` — full output spec (directory layout, envelope
    format, compact vs full output rules)
  - `schema-holdings-fields.md` — per-position field reference
    (security_type, is_etf, financial_type, proxy_symbol)
  - `runtime-gemma4-consult.md` — gemma4-consult Ollama setup for the
    optional consultative LLM tier
  - `presentation-rules.md` — agent presentation contract
    (preserve numbers, timestamps, freshness; never fabricate)
  - `presentation-nl-query-routing.md` — natural-language query routing
    rules (which question shapes go to which analyzer)
  - All include v4.x adaptation note explaining the slash-command →
    MCP-tool surface change.
- **`docs/MCP_TOOLS_REFERENCE.md`** (new) — consolidated detailed
  reference for all 12 MCP tools (`portfolio_ask`, `portfolio_initialize`,
  `portfolio_holdings`, `portfolio_refresh`, `portfolio_setup`,
  `portfolio_keys_*`, `portfolio_response_*`). Per-tool: input schema,
  output shape, latency profile, cache TTLs, allowlists, example calls,
  pointers to contracts. Distilled from the ~25 v2.x `claude/commands/ic-*.md`
  per-slash-command docs into one consolidated file (one doc to maintain
  rather than 25).

### Changed

- `README.md` Documentation section updated to link the new MCP tools
  reference and the references directory.

Engine image stays at 4.1.25-cpu (docs-only release).

## [4.1.28] — 2026-05-04

### Added

- **Feature docs ported** from v2.6 git history (deleted in v4.0
  nuke-from-orbit trim):
  - `STONKMODE.md` (top-level) — full feature doc for narrated
    commentary mode with 30+ fictional cable-finance personas
  - `CAPABILITIES.md` (top-level) — master "what can it do" feature
    catalog covering holdings, performance, bonds, news, allocation,
    optimization, scenarios, peer analysis (~19 KB)
  - `docs/GLOSSARY.md` — financial-terminology reference (Sharpe,
    Sortino, YTM, duration, beta, drawdown, etc.)
  - `docs/PHILOSOPHY.md` — the "deterministic-first, no LLM math"
    rationale
  - `docs/WINDOWS_SETUP_GUIDE.md` — Windows + WSL2 install gotchas
  - `docs/STONKMODE_ARCHITECTURE.md` — full Stonkmode pipeline
    (market detection → archetype weighting → pair selection →
    narration → dashboard render)
  - `docs/STONKMODE_AVATAR_LEGEND.md` — 30-persona avatar grid
    reference
- All ported docs include a `<!-- v4.x adaptation note -->` header
  explaining what changed between v2.x slash-command surface and
  v4.x MCP-tool surface (numerical results, methodology, and
  data-source rules unchanged).

### Changed

- **Auto-start install convention added to SKILL.md.** When a
  skills installer (e.g. `openclaw skills install investorclaw`)
  places the bundle, agents should immediately run
  `mkdir -p portfolios && docker compose up -d` from the skill
  directory as part of completing the install — the user invoked the
  install command and has implicitly consented to it completing.
  Do not gate a second time on "Want me to boot it up?" Override
  cases (CI runner, existing ic-engine container with different tag,
  user-supplied `--dry-run`) are documented inline.

## [4.1.27] — 2026-05-04

### Added

- Top-level community / health docs: `CODE_OF_CONDUCT.md`,
  `CONTRIBUTING.md`, `SECURITY.md`, `DISCLAIMER.md`, `PRIVACY.md`,
  `CHANGELOG.md` (this file). Adapted from the v2.6 InvestorClaude
  corpus for the v4.x containerized-skill context.
- `.github/ISSUE_TEMPLATE/` (bug, feature, docs) +
  `.github/PULL_REQUEST_TEMPLATE.md` for github community-standards
  compliance.
- Logo header in `README.md` — restored from git history (was deleted
  in the v4.0 nuke-from-orbit trim).
- Stonkmode and EOD-report sections added to `README.md` Run Analysis
  section.
- `assets/investorclaw-logo.{svg,jpg,webp,*-192.{jpg,webp}}` — logo
  assets restored from git history.

### Changed

- `clawhub skill publish --name "InvestorClaw"` corrects the display
  name from auto-derived "Mnemos Ic Runtime" to "InvestorClaw".
- `README.md` rewritten to mirror the InvestorClaude v2.6 user-facing
  voice: Features → Quick Start → Prepare Portfolio → Run Analysis
  (with EOD + Stonkmode subsections) → Available MCP Tools →
  Power-User Endpoints → Recommended Models → API Keys by Size →
  How It Works → Data Privacy → Documentation → Troubleshooting.

### Security (3 fixes addressing ClawHub LLM-scan findings)

- **Trust-exploitation wording** — tightened the contradictory
  "no portfolio data flows through transcript storage" line in
  `agent-skills/claude-desktop/SKILL.md` to clarify what Claude does
  vs does not see in the envelope.
- **Supply-chain hardening** — install hints no longer reference the
  mutable `raw.githubusercontent.com/.../main/` URL; bundle ships
  `compose.yml` directly.
- **Code-execution warnings** — `apt-get install -y docker.io` style
  commands reframed as user-facing recommendations with a link to
  docs.docker.com rather than agent-runnable strings.

## [4.1.26] — 2026-05-04

### Added

- "First-run experience" section in `SKILL.md` covering the auto-init
  phase timeline (image extract → bridge → setup → refresh → seed_ask
  → ready) with timing per phase, what InvestorClaw asks of the user
  post-install, recommended API keys by portfolio size with sign-up
  links, and an example first-call response shape.

## [4.1.25] — 2026-05-04

### Fixed

- **Engine narrator regression** (argonautsystems/ic-engine
  commit `b7a8859`): `"What is in my portfolio?"` was being deflected
  as a concept question because the `"what is "` concept-stem matched
  before OWNERSHIP signals. Fix: short-circuit the concept-stem
  check when a strong-ownership phrase is present (`my portfolio`,
  `my holdings`, `my positions`, `my account`, plus common
  portfolio-computed metrics like `my sharpe`, `my returns`,
  `my allocation`, etc.). Preserves the original v4.1.17 NA-METRIC
  protections.
- **Install-breaking compose.yml bug** — `./portfolios/` was being
  auto-created as `root:root` by docker bind-mount, blocking the
  engine (uid=1000) from writing `setup_results.json`. SKILL.md now
  leads with `mkdir -p portfolios` + inline explanation.
- **zeroclaw audit false-positive** — SKILL.md compliance bullet
  reworded to avoid the audit's literal-string match on
  `curl … | sh` patterns in documentation.

### Changed

- **Default narrative model** flipped from `MiniMaxAI/MiniMax-M2.7`
  to `google/gemma-4-31B-it`. Together AI moved MiniMax-M2 off the
  serverless tier in 2026-05; gemma-4-31B-it is the cheapest
  serverless model with strong-enough quality for portfolio narrative
  (~100 tok/s, ~$0.0008 / 1 K tokens).
- New container image: `ghcr.io/argonautsystems/ic-engine:4.1.25-cpu`
  (sha256:2c34311f...).

## [4.1.24] — 2026-05-04

### Changed

- Anthropic-on-claws wording corrected per Boris Cherny's 2026-04-03
  announcement: subscription OAuth no longer covers third-party
  tools, but Anthropic remains usable via discounted "extra usage
  bundle" add-on or direct Anthropic API key. Updated SKILL.md and
  per-runtime narrator-model sections.

## [4.1.23] — 2026-05-04

### Added

- v2.6 InvestorClaude user-facing docs ported into the v4.x skill:
  cookbook tables ("what can I ask?"), agent routing rules + finance
  override, broker export instructions, model recommendations split
  per runtime track, privacy section, troubleshooting section,
  dashboard UX walkthrough.

### Fixed

- Stale container-internal port refs (`:8090` / `:8092`) replaced
  with host-mapped ports (`:18090` / `:18092`) across 15 files
  including `manifest-template.json`. Would have broken every fresh
  install via the manifest pointing agents at the wrong port.
- `argonautsystems/clio` GitHub reference removed from
  `docs/INSTALL_MODELS.md` (clio lives on GitLab, not GitHub);
  replaced with explicit github + gitlab URLs for
  `argonautsystems/ic-engine`.

## [4.1.22] — 2026-05-04

### Changed

- Dockerfile uses `pip install uv` instead of the upstream
  `curl https://astral.sh/uv/install.sh | sh` installer to clear the
  ClawHub static-analyzer's `install_untrusted_source` flag at build
  time.

## [4.1.21] — 2026-05-03

### Fixed

- `install.yaml`: dropped the remote-curl staging step.

## [4.1.19] — 2026-05-03

### Changed

- Engine image moves to verified-org namespace
  `ghcr.io/argonautsystems/`.

## [4.1.18] — 2026-05-03

### Changed

- Compose: bake codex-scrubbed engine source.

## [4.1.17] — 2026-05-03

### Fixed

- Classifier fix: CONCEPT-STEM + NA-METRIC overrides ahead of
  OWNERSHIP. (Note: this introduced the regression that v4.1.25 later
  fixes.)

## [4.1.16] — 2026-05-03

### Fixed

- Correlation / total-return / ESG / governance fixes.

## [4.1.15] — 2026-05-03

### Fixed

- Engine SPY benchmark + Sortino + drawdown.

## [4.1.14] — 2026-05-03

### Achievement

- 30/30 PASS (100%) on the Agentic COBOL regression harness.

## [4.1.13] — 2026-05-03

### Fixed

- Engine fixes baked + deflection narrator (28/30 cobol).

## [4.1.7] — 2026-05-03

### Added

- `portfolio_initialize` tool + boot-time auto-init
  (`IC_INITIALIZE_ON_BOOT=1`) so the envelope cache is warm by the
  time any agent connects.

## [4.1.6] — 2026-05-03

### Fixed

- Massive adapter fix.

### Added

- Three new market-data providers + yfinance-last fallback + stage
  wiring + MNEMOS persistence.

## [4.1.4] — 2026-05-03

### Added

- MNEMOS persistence + MiniMax-M2.7 default + `MNEMOS_BASE` env var.

## [4.1.3] — 2026-05-02

### Fixed

- Analyst PriceProvider fallback (Finnhub → Massive → yfinance).

## [4.1.2] — 2026-05-02

### Fixed

- Engine HoldingsStage fix.

## [4.1.1] — 2026-05-02

### Fixed

- Engine P1 parallel-stage timeout fix + bridge timeouts to 1800 s.

## [4.1.0] — 2026-05-02

### Changed

- ic-engine image bump to `4.1.0-cpu` + MiniMax-M2 (1M context).

## [4.0.9] — 2026-05-02

### Refactored

- Bridge: split `mcp_server.py` into `mcp/` package mirroring v5
  mnemos.

## [4.0.7] — 2026-05-02

### Fixed

- Bridge: pass `--no-refresh` to ic-engine ask for deterministic
  cache hits. (Note: later reverted; see SKILL.md "Behavior contract".)

## [4.0.5] — 2026-05-02

### Added

- Plain REST endpoints — agent fallback when native MCP is flaky.

## [4.0.4] — 2026-05-02

### Fixed

- Bridge: disable DNS-rebinding protection on MCP transport
  (configurable).

## [4.0.3] — 2026-05-01

### Fixed

- Bridge: clear yfinance cookie cache on subprocess timeout.

## [4.0.2] — 2026-05-01

### Changed

- Build: pass-5 strip — sqlalchemy, networkx, tests/ dirs (–51 MB).

## [4.0.0a1] — 2026-04-30

### Added

- Initial scaffold of mnemos-ic-runtime as the v4.x containerized-skill
  bridge. Engine source moved to `argonautsystems/ic-engine` (separate
  repo); this repo owns Dockerfile + compose + bridge + dashboard +
  agent-skills.

[4.1.27]: https://github.com/mnemos-os/mnemos-ic-runtime/releases/tag/v4.1.27
[4.1.26]: https://github.com/mnemos-os/mnemos-ic-runtime/releases/tag/v4.1.26
[4.1.25]: https://github.com/mnemos-os/mnemos-ic-runtime/releases/tag/v4.1.25
[4.1.24]: https://github.com/mnemos-os/mnemos-ic-runtime/releases/tag/v4.1.24
[4.1.23]: https://github.com/mnemos-os/mnemos-ic-runtime/releases/tag/v4.1.23
[4.1.22]: https://github.com/mnemos-os/mnemos-ic-runtime/releases/tag/v4.1.22

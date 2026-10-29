---
name: ask
description: Ask anything about your portfolio in natural language. Holdings, performance, bonds, news, optimization, target allocation, cash flow, peer comparison — one command answers all of them.
allowed-tools: Bash(*)
---

Run the InvestorClaw natural-language entry point against the prebuilt
**ic-engine container** (no `uv`, no source clone). On first use this pulls the
public image; subsequent calls reuse it. Provider keys are read from the mounted
`keys.env` and are never baked into the image.

**Execute:**
```bash
IC_HOME="${IC_HOME:-$HOME/.investorclaw}"
IC_IMAGE="${IC_ENGINE_IMAGE:-ghcr.io/argonautsystems/ic-engine:4.7.7-cpu}"
mkdir -p "$IC_HOME/data/portfolios" "$IC_HOME/data/reports"
[ -f "$IC_HOME/data/keys.env" ] || touch "$IC_HOME/data/keys.env"
if ! docker image inspect "$IC_IMAGE" >/dev/null 2>&1; then
    echo "📦 First run — pulling $IC_IMAGE (public, no auth, no build)..."
    docker pull "$IC_IMAGE" || {
        echo "❌ Could not pull the ic-engine image. Is Docker running? See docs/GETTING_STARTED.md."
        exit 1
    }
fi
docker run --rm \
    --env-file "$IC_HOME/data/keys.env" \
    -e INVESTORCLAW_PORTFOLIO_DIR=/data/portfolios \
    -e IC_PORTFOLIO_DIR=/data/portfolios \
    -v "$IC_HOME/data:/data" \
    --entrypoint /opt/ic-engine/.venv/bin/investorclaw \
    "$IC_IMAGE" ask "$ARGUMENTS"
```

**Presentation:**
- Present the engine narrator's answer clearly.
- Preserve all quoted source text, numerical values, timestamps, and freshness labels.
- Never fabricate portfolio, market, ticker, bond, news, or optimization data.
- If the first prompt takes 30–60 seconds, note that InvestorClaw is building the deterministic signed envelope; follow-up prompts should be cache-amortized.

**Errors:**
- If data looks stale, suggest `/investorclaw:refresh`.
- If setup or source data is missing, report the engine's exact guidance and point to `docs/GETTING_STARTED.md` (drop a portfolio CSV into `~/.investorclaw/data/portfolios/`).
- To set a provider key: `echo 'MASSIVE_API_KEY=<key>' >> ~/.investorclaw/data/keys.env` (or any provider's key var — see `docs/PROVIDERS.md`).

---

See [../DISCLAIMER.md](../DISCLAIMER.md)

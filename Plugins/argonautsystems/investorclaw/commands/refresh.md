---
name: refresh
description: Force a fresh pipeline run on your portfolio. Use when news/prices may have moved or when you want to refresh stale cached data.
allowed-tools: Bash(*)
---

Force InvestorClaw to rebuild the deterministic portfolio pipeline against the
prebuilt **ic-engine container**, bypassing cached envelopes. Same container as
`/investorclaw:ask`; provider keys come from the mounted `keys.env`.

**Execute:**
```bash
IC_HOME="${IC_HOME:-$HOME/.investorclaw}"
IC_IMAGE="${IC_ENGINE_IMAGE:-ghcr.io/argonautsystems/ic-engine:4.7.7-cpu}"
mkdir -p "$IC_HOME/data/portfolios" "$IC_HOME/data/reports"
[ -f "$IC_HOME/data/keys.env" ] || touch "$IC_HOME/data/keys.env"
if ! docker image inspect "$IC_IMAGE" >/dev/null 2>&1; then
    echo "📦 First run — pulling $IC_IMAGE (public, no auth, no build)..."
    docker pull "$IC_IMAGE" || { echo "❌ Could not pull the ic-engine image. Is Docker running?"; exit 1; }
fi
docker run --rm \
    --env-file "$IC_HOME/data/keys.env" \
    -e INVESTORCLAW_PORTFOLIO_DIR=/data/portfolios \
    -e IC_PORTFOLIO_DIR=/data/portfolios \
    -v "$IC_HOME/data:/data" \
    --entrypoint /opt/ic-engine/.venv/bin/investorclaw \
    "$IC_IMAGE" run --refresh
```

**Presentation:**
- Report what was refreshed (prices, news, benchmarks) and the new freshness timestamps.
- Then suggest the user re-ask their question, now against fresh data.

---

See [../DISCLAIMER.md](../DISCLAIMER.md)

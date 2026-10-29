# World Intel MCP

**DipoleML integration** for Marc Shade. Type: `mcp`. Version: `0.0.0`.

160-tool MCP server for real-time global intelligence from free public APIs: markets, liquidity, prediction markets, SEC filings, conflict, military, aircraft-cohort early warning, migration and border flows, cyber, climate, news and more. Dated observation history, 29 research prompts, cited briefs, geofences, SSE dashboard. MIT, no paid API keys.

## Upstream

- Repository: https://github.com/marc-shade/world-intel-mcp
- Commit: `fdebf9a8de6e00ed688053dd647cafedc179708b`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3
- packages: world-intel-mcp
- env: UCDP_ACCESS_TOKEN, NASA_FIRMS_API_KEY, EIA_API_KEY, CLOUDFLARE_API_TOKEN, FRED_API_KEY, OPENSKY_CLIENT_SECRET, TOMTOM_API_KEY, WINDY_API_KEY, OLLAMA_API_URL, WORLD_INTEL_DASHBOARD_HOST
- credentials: UCDP_ACCESS_TOKEN, NASA_FIRMS_API_KEY, EIA_API_KEY, CLOUDFLARE_API_TOKEN, FRED_API_KEY, OPENSKY_CLIENT_SECRET, TOMTOM_API_KEY, WINDY_API_KEY

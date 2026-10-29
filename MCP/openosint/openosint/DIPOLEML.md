# Openosint

**DipoleML integration** for Openosint. Type: `mcp`. Version: `0.0.0`.

Open-source engine for passive OSINT checks: 21 tools as CLI, MCP server and web UI. Hosted Monitor & Diligence at app.openosint.tech.

## Upstream

- Repository: https://github.com/OpenOSINT/OpenOSINT
- Commit: `4acf13d6c27e2c10cdb0cfc7d1c732653cb3b42f`
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
- packages: openosint
- env: HIBP_API_KEY, SHODAN_API_KEY, VIRUSTOTAL_API_KEY, IP2LOCATION_API_KEY, CENSYS_API_ID, CENSYS_SECRET, ABUSEIPDB_API_KEY, GITHUB_TOKEN, OPENOSINT_PROXY_URL, BRIGHTDATA_API_KEY, OPENOSINT_ALLOWED_HOSTS, OPENAI_BASE_URL
- credentials: HIBP_API_KEY, SHODAN_API_KEY, VIRUSTOTAL_API_KEY, IP2LOCATION_API_KEY, CENSYS_SECRET, ABUSEIPDB_API_KEY, GITHUB_TOKEN, BRIGHTDATA_API_KEY

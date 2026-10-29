# Master Fetch

**DipoleML integration** for Dondai1234. Type: `mcp`. Version: `12.4.1`.

MCP server for web fetching with Cloudflare bypass, Trafilatura extraction, and smart routing. Free, self-hosted, no API keys.

## Upstream

- Repository: https://github.com/dondai1234/master-fetch
- Commit: `86d1b1329c0eed6133f29e3effe6a40a29f9dcdc`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: node, python3
- packages: master-fetch, hound-mcp
- env: YOUR_SERPER_KEY, ANOTHER_SERPER_KEY, YOUR_TAVILY_KEY, HOUND_SEARCH_SERPER_KEYS, HOUND_SEARCH_TAVILY_KEYS, HOUND_SEARCH_EXA_KEYS, HOUND_SEARCH_FIRECRAWL_KEYS, HOUND_SEARCH_TINYFISH_KEYS
- credentials: YOUR_SERPER_KEY, ANOTHER_SERPER_KEY, YOUR_TAVILY_KEY, HOUND_SEARCH_SERPER_KEYS, HOUND_SEARCH_TAVILY_KEYS, HOUND_SEARCH_EXA_KEYS, HOUND_SEARCH_FIRECRAWL_KEYS, HOUND_SEARCH_TINYFISH_KEYS

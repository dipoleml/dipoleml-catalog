# Seo Monster

**DipoleML integration** for Avansaber. Type: `mcp`. Version: `0.5.0`.

SEOMonster: a local, user-credential-driven MCP server for SEO workflows over Google Search Console, GA4, PageSpeed Insights, and Cloudflare. Read-first, open source.

## Upstream

- Repository: https://github.com/avansaber/seo-monster
- Commit: `6b727c12bc22db04602164a1a97685f8a084e1e9`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · uvx seo-monster

## Requirements

- runtimes: python3
- packages: seo-monster
- env: SEO_MCP_INDEXNOW_KEY, SEO_MCP_INDEXNOW_KEY_LOCATION, PSI_API_KEY, SEO_MCP_GOOGLE_TOKEN, CF_API_TOKEN, OPENPAGERANK_API_KEY, PERPLEXITY_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, GOOGLE_ADS_DEVELOPER_TOKEN
- credentials: SEO_MCP_INDEXNOW_KEY, SEO_MCP_INDEXNOW_KEY_LOCATION, PSI_API_KEY, SEO_MCP_GOOGLE_TOKEN, CF_API_TOKEN, OPENPAGERANK_API_KEY, PERPLEXITY_API_KEY, OPENAI_API_KEY

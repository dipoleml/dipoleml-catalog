# Reddit MCP Buddy

**DipoleML integration** for Karanb192. Type: `mcp`. Version: `1.2.0`.

Clean, LLM-optimized Reddit MCP server. Browse posts, search content, analyze users. No fluff, just Reddit data.

## Upstream

- Repository: https://github.com/karanb192/reddit-mcp-buddy
- Commit: `0020c6a84ba14c8996633c2e8ab7aa8f97cc63db`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y reddit-mcp-buddy
- mcp-stdio · npx -y reddit-mcp-buddy

## Requirements

- runtimes: node >=18.0.0
- packages: reddit-mcp-buddy
- env: REDDIT_CLIENT_SECRET, REDDIT_REFRESH_TOKEN, REDDIT_BUDDY_PORT, REDDIT_BUDDY_HOST, REDDIT_BUDDY_ALLOWED_HOSTS
- credentials: REDDIT_CLIENT_SECRET, REDDIT_REFRESH_TOKEN

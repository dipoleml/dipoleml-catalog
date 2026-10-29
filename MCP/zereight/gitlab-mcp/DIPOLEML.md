# Gitlab MCP

**DipoleML integration** for Zereight. Type: `mcp`. Version: `2.3.14`.

MCP server for GitLab: 277 tools for projects, MRs, issues, pipelines, wikis and more via the GitLab REST/GraphQL API

## Upstream

- Repository: https://github.com/zereight/gitlab-mcp
- Commit: `f917d2272878b99989949a0b0517eaafb93f3f1b`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @zereight/mcp-gitlab
- mcp-stdio · npx -y @zereight/mcp-gitlab

## Requirements

- runtimes: node >=20.0.0
- packages: @zereight/mcp-gitlab
- env: GITLAB_PERSONAL_ACCESS_TOKEN, GITLAB_API_URL, GITLAB_PERSONAL_ACCESS_TOKEN_FILE, YOUR_GITLAB_TOKEN, SSE_AUTH_TOKEN, MCP_SERVER_URL, OAUTH_DISABLE_REFRESH_TOKEN, GITLAB_JOB_TOKEN, STREAMABLE_HTTP_AUTH_TOKEN, GITLAB_ALLOWED_HOSTS, MCP_ALLOWED_HOSTS, OAUTH_STATELESS_SECRET
- credentials: GITLAB_PERSONAL_ACCESS_TOKEN, GITLAB_PERSONAL_ACCESS_TOKEN_FILE, YOUR_GITLAB_TOKEN, SSE_AUTH_TOKEN, OAUTH_DISABLE_REFRESH_TOKEN, GITLAB_JOB_TOKEN, STREAMABLE_HTTP_AUTH_TOKEN, OAUTH_STATELESS_SECRET

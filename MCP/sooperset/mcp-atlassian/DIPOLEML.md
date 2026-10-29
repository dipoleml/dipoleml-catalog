# MCP Atlassian

**DipoleML integration** for Sooperset. Type: `mcp`. Version: `0.0.0`.

MCP server for Atlassian tools (Confluence, Jira)

## Upstream

- Repository: https://github.com/sooperset/mcp-atlassian
- Commit: `0a5d2427144d72f5aade07d4fabd385421cec401`
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
- packages: mcp-atlassian
- env: JIRA_URL, JIRA_API_TOKEN, CONFLUENCE_URL, CONFLUENCE_API_TOKEN, JIRA_PERSONAL_TOKEN
- credentials: JIRA_API_TOKEN, CONFLUENCE_API_TOKEN, JIRA_PERSONAL_TOKEN

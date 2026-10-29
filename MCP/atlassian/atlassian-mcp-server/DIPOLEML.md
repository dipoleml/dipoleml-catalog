# Atlassian MCP Server

**DipoleML integration** for Atlassian. Type: `mcp`. Version: `0.0.0`.

Official remote MCP server for Atlassian. Securely connect Jira, Confluence, Jira Service Management, Bitbucket, and Compass to DipoleML, ChatGPT, Cursor, VS Code, and other AI tools using OAuth 2.1 or API tokens.

## Upstream

- Repository: https://github.com/atlassian/atlassian-mcp-server
- Commit: `b74220d41142fae52b4f680c805b2ab81050991a`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-http · atlassian · https://mcp.atlassian.com/v2/mcp

## Requirements

- runtimes: node
- packages: atlassian-mcp-server-package
- env: IMPORTANT

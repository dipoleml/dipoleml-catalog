# Supabase MCP Server

**DipoleML integration** for Alexander Zuev. Type: `mcp`. Version: `0.0.0`.

Query MCP enables end-to-end management of Supabase via chat interface: read & write query executions, management API support, automatic migration versioning, access to logs and much more.

## Upstream

- Repository: https://github.com/alexander-zuev/supabase-mcp-server
- Commit: `bca07008fe46cae791221c2ee30df034c963ec56`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3
- packages: supabase-mcp-server
- env: SUPABASE_ACCESS_TOKEN, SUPABASE_SERVICE_ROLE_KEY, QUERY_API_KEY
- credentials: SUPABASE_ACCESS_TOKEN, SUPABASE_SERVICE_ROLE_KEY, QUERY_API_KEY

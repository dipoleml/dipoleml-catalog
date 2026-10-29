# Korean Law MCP

**DipoleML integration** for Chrisryugj. Type: `mcp`. Version: `4.15.14`.

법제처 국가법령정보를 LLM에서 바로 조회하는 MCP 서버. 법령·판례·조례 검색과 인용 검증 | MCP server for Korean law — search statutes, precedents, and ordinances, and verify citations

## Upstream

- Repository: https://github.com/chrisryugj/korean-law-mcp
- Commit: `32c294e63b5a182a0e4166ab2ee38184e0b330ed`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y korean-law-mcp
- mcp-stdio · npx -y korean-law-mcp

## Requirements

- runtimes: node >=20.19.0
- packages: korean-law-mcp
- env: LAW_API_PROTOCOL, EXTERNAL_API_ERROR, MCP_HTTP_HOST, MCP_AUTH_TOKEN, ALLOW_QUERY_API_KEY
- credentials: MCP_AUTH_TOKEN, ALLOW_QUERY_API_KEY

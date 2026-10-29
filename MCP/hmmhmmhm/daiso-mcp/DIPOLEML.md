# Daiso MCP

**DipoleML integration** for Hmmhmmhm. Type: `mcp`. Version: `1.3.1`.

다이소·편의점 재고와 생활 정보를 AI에서 바로 조회하세요. 설치·API 키 없는 공개 MCP, 웹 링크 조회, CLI·Skill을 지원합니다.

## Upstream

- Repository: https://github.com/hmmhmmhm/daiso-mcp
- Commit: `0e7ca70750f912978df5dd39c886970056864bb6`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @executeautomation/playwright-mcp-server
- mcp-stdio · python3 /Users/hm/Documents/GitHub/daiso-mcp/scripts/ghidra/cli_mcp_ghidra.py
- mcp-stdio · /Users/hm/Library/Python/3.14/bin/frida-mcp
- mcp-stdio · npx -y daiso

## Requirements

- runtimes: node >=22
- packages: daiso
- env: IMPORTANT

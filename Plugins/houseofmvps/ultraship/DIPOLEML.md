# Ultraship

**DipoleML integration** for Houseofmvps. Type: `plugin`. Version: `2.13.2`.

"ULTRASHIP" DipoleML plugin — 39 skills, 33 tools, 11 agents for ship-ready workflows: planning, review, pentesting, safety guardrails, canary monitoring, SEO/AI-readiness check, penetration testing, code review, competitive analysis, incident response. 1 dependency. 180 tests. MIT.

## Upstream

- Repository: https://github.com/Houseofmvps/ultraship
- Commit: `ed232cba00040a3a8294aff08d14a0053cb8a0ae`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y @upstash/context7-mcp@2.1.6
- mcp-stdio · npx -y @playwright/mcp@0.0.69
- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: node
- packages: ultraship
- env: ULTRASHIP_BING_KEY
- credentials: ULTRASHIP_BING_KEY

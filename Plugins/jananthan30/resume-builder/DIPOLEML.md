# Resume Builder

**DipoleML integration** for Jananthan30. Type: `plugin`. Version: `1.2.0`.

AI-powered resume & cover letter generator with dual ATS + HR scoring. Works for any profession. DipoleML plugin.

## Upstream

- Repository: https://github.com/jananthan30/Resume-Builder
- Commit: `5f288fe1d5b931b17d2d24746f9598574f79d3ef`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · python ${CLAUDE_PLUGIN_ROOT}/mcp_scorer.py
- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: python3, python3
- packages: resumehq
- env: ANTHROPIC_API_KEY, ADZUNA_APP_KEY, EVIDENCE_LOCAL_BASE_URL, DEEPSEEK_API_KEY, XAI_API_KEY, DASHSCOPE_API_KEY, SCORER_CLOUD_URL, SCORER_CLOUD_API_KEY, RAPIDAPI_KEY
- credentials: ANTHROPIC_API_KEY, ADZUNA_APP_KEY, DEEPSEEK_API_KEY, XAI_API_KEY, DASHSCOPE_API_KEY, SCORER_CLOUD_API_KEY, RAPIDAPI_KEY

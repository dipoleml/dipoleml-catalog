# Winnow

**DipoleML integration** for Ghalebdweikat. Type: `plugin`. Version: `0.5.2`.

A calibrated context sieve for DipoleML: every tool result is judged by a System One model before it enters context.

## Upstream

- Repository: https://github.com/GhalebDweikat/winnow
- Commit: `4547a81b88ac59a902bad7b0006137c7d4147aeb`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · uv run -q --project ${CLAUDE_PLUGIN_ROOT}/sidecar python -m winnow mcp
- plugin · .dipoleml-plugin/plugin.json

## Requirements

- env: TYPESAFE_API_KEY, ANTHROPIC_API_KEY, WINNOW_PORT
- credentials: TYPESAFE_API_KEY, ANTHROPIC_API_KEY

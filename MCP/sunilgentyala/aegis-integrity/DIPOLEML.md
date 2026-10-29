# Aegis Integrity

**DipoleML integration** for Sunilgentyala. Type: `mcp`. Version: `0.0.0`.

Free, local-first academic integrity checker and MCP server: citation hallucination detection, AI-text and plagiarism signals, venue guideline checks (IEEE, ACM, Elsevier). Documents never leave your machine.

## Upstream

- Repository: https://github.com/sunilgentyala/aegis-integrity
- Commit: `dd846b4de77b308491561e08f46c20d8a4a00bf1`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3, python3
- packages: aegis-integrity
- env: UNSUPPORTED_CONFIGURATION, AEGIS_API_KEY, AEGIS_REPORT_DIR
- credentials: AEGIS_API_KEY

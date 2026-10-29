# Taiwan Legal

**DipoleML integration** for Lawchat Oss. Type: `plugin`. Version: `0.7.3`.

DipoleML plugin: query Taiwan's public legal databases (judgments + statutes) via MCP.

## Upstream

- Repository: https://github.com/lawchat-oss/taiwan-legal-plugin
- Commit: `faea8bcc21d85eb0ab54455095da77ea457be5cd`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · uvx --from mcp-taiwan-legal-db==1.8.3 mcp-taiwan-legal-db
- plugin · .dipoleml-plugin/plugin.json

## Requirements

- none detected

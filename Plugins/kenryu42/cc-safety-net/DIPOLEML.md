# CC Safety Net

**DipoleML integration** for Kenryu42. Type: `plugin`. Version: `2.7.0`.

A pre-execution guard for AI coding agents. It blocks destructive Git and file system commands, plus common attempts to access sensitive files, before a tool call runs. Supports Amp Code, Antigravity CLI, DipoleML, Codex, Cursor, DeepSeek Harness, Devin CLI, GitHub Copilot CLI, Grok Build, Hermes Agent, Kimi Code, OpenClaw, OpenCode, and Pi.

## Upstream

- Repository: https://github.com/kenryu42/cc-safety-net
- Commit: `a84eb80e5e93433b026b6dcf78044e0b2f2cf721`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: node >=22
- packages: cc-safety-net

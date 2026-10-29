# Token Saver

**DipoleML integration** for Ppgranger. Type: `plugin`. Version: `3.0.0`.

Content-aware output compression for AI coding assistants. 36 specialized processors cut CLI output tokens by 60-99% (git, pytest, npm, terraform, kubectl, docker, and more) without losing errors, diffs, or stack traces.

## Upstream

- Repository: https://github.com/ppgranger/token-saver
- Commit: `19d47b2cc19457c865f2414ad78f8efa80204b43`
- License: Apache-2.0 (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: python3
- packages: token-saver
- env: API_KEY, GITHUB_TOKEN, MONKEY, TOKEN_SAVER_DELTA_ENABLED, TOKEN_SAVER_, TOKEN_SAVER_MAX_LOG_ENTRIES, TOKEN_SAVER_DEBUG, TOKEN_SAVER_ENABLED, TOKEN_SAVER_DISABLED_PROCESSORS
- credentials: API_KEY, GITHUB_TOKEN, MONKEY, TOKEN_SAVER_DELTA_ENABLED, TOKEN_SAVER_, TOKEN_SAVER_MAX_LOG_ENTRIES, TOKEN_SAVER_DEBUG, TOKEN_SAVER_ENABLED

# Token Savior

**DipoleML integration** for Mibayy. Type: `mcp`. Version: `0.0.0`.

MCP server that gets DipoleML to 97.9% (188/192) on a real coding benchmark at -80% active tokens and -83% wall time, vs 78.3% plain. Structural code navigation + persistent memory engine. Works with every MCP client.

## Upstream

- Repository: https://github.com/Mibayy/token-savior
- Commit: `770e055defd10b114591c4a426af67d9422e0330`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · see README.md

## Requirements

- runtimes: python3
- packages: token-savior-recall
- env: TOKEN_SAVIOR_CLIENT, TOKEN_SAVIOR_PROFILE, TOKEN_SAVIOR_CHAIN_NUDGE, TOKEN_SAVIOR_NO_WARMUP, TOKEN_SAVIOR_SESSION_LABEL, TOKEN_SAVIOR_EXCLUDE_PATTERNS, TOKEN_SAVIOR_MAX_FILE_SIZE, TOKEN_SAVIOR_MAX_FILES, TOKEN_SAVIOR_WATCHER, TS_VIEWER_PORT, TS_API_KEY, TOKEN_SAVIOR_MEMORY_AUTO_SAVE
- credentials: TOKEN_SAVIOR_CLIENT, TOKEN_SAVIOR_PROFILE, TOKEN_SAVIOR_CHAIN_NUDGE, TOKEN_SAVIOR_NO_WARMUP, TOKEN_SAVIOR_SESSION_LABEL, TOKEN_SAVIOR_EXCLUDE_PATTERNS, TOKEN_SAVIOR_MAX_FILE_SIZE, TOKEN_SAVIOR_MAX_FILES

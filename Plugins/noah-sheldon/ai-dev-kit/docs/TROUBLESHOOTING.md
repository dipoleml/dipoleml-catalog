# Troubleshooting

Common issues and the fastest checks to run.

## Validation Fails

Symptoms:
- `npm test` fails
- `node scripts/validate-surface.js` fails

Checks:
- confirm required files still exist
- confirm JSON manifests still parse
- confirm the surface counts still match the validator

## Marketplace Does Not Load

Checks:
- verify `.claude-plugin/marketplace.json` exists
- verify `.claude-plugin/plugin.json` exists
- verify the repository URL in the manifest is current
- verify the plugin source path still points to the repo root

## OpenCode Config Looks Stale

Checks:
- verify `.opencode/opencode.json` references real instruction files
- verify `.opencode/package.json` still matches the published package shape
- verify `.opencode/` still contains the package entrypoints and prompt files

## Prompts Feel Too Generic

Checks:
- compare the agent or skill file to the repo's short prompt style
- make the prompt narrower
- add explicit output requirements
- add a verification step

## Model Is Unavailable

Behavior:
- fall back to the workspace default model
- continue the task instead of stopping unless the task truly depends on a specific model

## Secret-Like Data Appears In Docs

Checks:
- search for token-shaped strings before pushing
- keep examples placeholder-only
- never commit real API keys, private keys, or signed credentials


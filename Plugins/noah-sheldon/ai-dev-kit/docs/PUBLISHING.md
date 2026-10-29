# Publishing

## Before pushing

1. Run `npm test`.
2. Run `node scripts/doctor.js`.
3. Confirm `git status` is clean except for intentional changes.
4. Make sure `package.json` and plugin manifests point at the real repository.

## Publish targets

- Claude Code: `.claude-plugin/plugin.json`
- Codex: `.codex-plugin/plugin.json`
- OpenCode: `.opencode/opencode.json`
- npm: `package.json`
- Multi-CLI sync helpers: `scripts/sync-claude.js`, `scripts/sync-codex.js`, `scripts/sync-opencode.js`, `scripts/sync-gemini.js`

## Notes

- The Claude and Codex plugin manifests are in-repo and ready to package.
- If you want a marketplace listing, you still need to follow the specific
  distribution path supported by that client or ecosystem.

# Plugin Schema Notes

This repo keeps a few local constraints for Claude plugin manifests.

Rules:
- `version` must be present.
- Component path fields should stay explicit and valid.
- Keep `plugin.json` focused on the plugin surface, not unrelated release notes.
- Do not add extra fields unless they are needed by the current marketplace flow.

Distribution notes:
- `.claude-plugin/plugin.json` is the plugin manifest.
- `.claude-plugin/marketplace.json` is the marketplace catalog.
- The marketplace file is what users add with `/plugin marketplace add`.

Validation:
- Keep both files parseable JSON.
- Keep repository URLs and homepage metadata accurate before release.


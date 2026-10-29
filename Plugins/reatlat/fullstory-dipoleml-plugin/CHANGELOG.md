# Changelog

## [1.1.0] - 2026-08-12

### Added
- `journey-builder` skill — build, compute, and update Fullstory Journey objects from natural language (`build_journey`, `get_journey`, `compute_journey`, `update_journey`)
- `session-replay` agent — visual session inspection (screenshots, diffs) in an isolated context, keeping image payloads out of the main conversation
- `report-deck` skill — turn research findings into presentation-ready decks (Markdown, PPTX, PDF) with evidence links and speaker notes
- Hermes Agent install section in README — symlink skills + `mcp_servers` config, no plugin wrapper needed

### Changed
- `funnel-doctor` — document `compute_funnel` `compare_to` param for prior-period comparison and `dimension` param for group-by breakdowns; note `get_funnel` returns name/description/rendered definition + correct `num_steps`
- `session-review` — add session data safety note about datamarked user-controlled strings and `<session-data>` boundary tags
- `session-context`, `batch-session-reader` agents — add untrusted-data guidance for `<session-data>` content

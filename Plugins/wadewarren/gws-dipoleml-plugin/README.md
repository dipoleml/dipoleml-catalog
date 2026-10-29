# gws — Google Workspace CLI Plugin for Claude Code

A Claude Code plugin that gives Claude full read/write access to Google Workspace services via the [`gws` CLI](https://github.com/googleworkspace/cli). 92 skills covering Gmail, Drive, Calendar, Sheets, Docs, Chat, Slides, Forms, Tasks, Keep, Meet, Classroom, and more.

## Why this plugin?

### Go beyond Claude's built-in Google Drive integration

Claude's native Google Workspace connectors are read-only for Drive/Docs, can't access email attachments, can't edit Sheets/Slides, and can only create Gmail drafts (not send). This plugin gives Claude full CRUD access to all Workspace services.

| Capability | Claude Native | With gws plugin |
|---|---|---|
| Read Google Docs | Yes | Yes |
| Edit Google Docs | No | Yes |
| Read/Write Sheets | No | Yes |
| Gmail attachments | No | Yes |
| Send emails | Drafts only | Full send |
| Google Chat | No | Yes |
| Meet, Forms, Tasks, Keep, Classroom | No | Yes |

### Migrating from OpenClaw to Claude Cowork + Dispatch

OpenClaw users moving to Claude's safer, sandboxed Cowork + Dispatch environment lose access to OpenClaw's 50+ service integrations and 13,000+ community skills. This plugin restores advanced Google Workspace automation within Claude's ecosystem — 92 pre-built skills including personas (Executive Assistant, IT Admin, etc.) and step-by-step recipes (post-mortem setup, expense tracking, team announcements). You get OpenClaw-like Google Workspace connectors with Cowork's security model.

## Prerequisites

- **[`gws` CLI](https://github.com/googleworkspace/cli)** installed and on your `$PATH`
- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** or **Cowork**

## Installation

```bash
# Add the marketplace
claude plugin marketplace add https://github.com/WadeWarren/gws-claude-plugin

# Install the plugin
claude plugin install gws
```

## Authentication

```bash
# Browser-based OAuth (interactive)
gws auth login

# Or use a service account
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
```

For multi-account setup (work + personal), see the [gws-shared skill](skills/gws-shared/SKILL.md).

## Skill Categories

**92 skills** organized into four categories:

| Category | Count | Examples |
|---|---|---|
| **Core Services** | 41 | `gws-gmail`, `gws-drive`, `gws-calendar`, `gws-sheets`, `gws-docs`, `gws-chat`, `gws-slides`, `gws-forms`, `gws-tasks`, `gws-keep`, `gws-meet`, `gws-classroom`, `gws-admin-reports` |
| **Personas** | 10 | `persona-exec-assistant`, `persona-project-manager`, `persona-it-admin`, `persona-sales-ops`, `persona-team-lead`, `persona-hr-coordinator` |
| **Recipes** | 41 | `recipe-post-mortem-setup`, `recipe-create-expense-tracker`, `recipe-send-team-announcement`, `recipe-save-email-attachments`, `recipe-create-events-from-sheet` |

## Usage Examples

```
# Triage your inbox
/gws-gmail-triage

# Send an email
/gws-gmail-send

# Check your calendar
/gws-calendar-agenda

# Read a spreadsheet
/gws-sheets-read

# Set up a post-mortem
/recipe-post-mortem-setup

# Act as an executive assistant
/persona-exec-assistant
```

## Troubleshooting

| Problem | Solution |
|---|---|
| `gws: command not found` | Install the [gws CLI](https://github.com/googleworkspace/cli) and ensure it's on your `$PATH` |
| `authentication required` | Run `gws auth login` to authenticate |
| `zsh: event not found: A1` | Use double quotes for sheet ranges: `"Sheet1!A1:D10"` instead of single quotes |
| Multi-account issues | See the [multi-account setup](skills/gws-shared/SKILL.md) in gws-shared |
| Plugin not loading | Run `claude plugin list` to verify installation |

## License

[Apache License 2.0](LICENSE)

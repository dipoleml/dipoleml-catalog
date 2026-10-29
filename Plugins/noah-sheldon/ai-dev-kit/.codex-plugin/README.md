# .codex-plugin — Codex Native Plugin for AI Dev Kit

This directory contains the **Codex plugin manifest** for AI Dev Kit.

## Structure

```
.codex-plugin/
└── plugin.json   — Codex plugin manifest (name, version, skills ref, agents ref, MCP ref)
.mcp.json         — MCP server configurations at repo root (NOT inside .codex-plugin/)
```

## What This Provides

- **55 skills** from `./skills/` — reusable Codex workflows for TDD, security, code review, ML, infrastructure, and more
- **19 agents** from `./agents/` — specialist agents for planning, architecture, review, and domain expertise
- **6 MCP servers** — GitHub, Context7, Exa, Memory, Playwright, Sequential Thinking

## Installation

Codex plugin support is currently in preview. Once generally available:

```bash
# Install from Codex CLI
codex plugin install noah-sheldon/ai-dev-kit

# Or reference locally during development
codex plugin install ./
```

Run this from the repository root so `./` points to the repo root and `.mcp.json` resolves correctly.

The installed plugin registers under the short slug `ai-dev-kit`.

## MCP Servers Included

| Server | Purpose |
|---|---|
| `github` | GitHub API access, PR management |
| `context7` | Live documentation lookup |
| `exa` | Neural web search |
| `memory` | Persistent memory across sessions |
| `playwright` | Browser automation & E2E testing |
| `sequential-thinking` | Step-by-step reasoning |

## Notes

- The `skills/` directory at the repo root is shared between Claude Code (`.claude-plugin/`) and Codex (`.codex-plugin/`) — same source of truth, no duplication
- MCP server credentials are inherited from the launching environment (env vars)
- This manifest does **not** override `~/.codex/config.toml` settings

# Architecture

## Overview

AI Dev Kit is a **multi-harness plugin system** that provides a unified developer workspace across Claude Code, Codex, OpenCode, and Gemini CLI. It uses a **skills-first architecture** where each workflow capability is a self-contained `SKILL.md` file that AI agents load on demand.

## Design Principles

1. **Skills-first** — skills are the canonical workflow surface. Commands are compatibility shims.
2. **Single source of truth** — skills, agents, and rules are shared across all platforms. Platform-specific manifests only point to the shared content.
3. **Immutability** — never mutate configuration in place. Always create new copies.
4. **Progressive disclosure** — agents load only the skills they need, reducing context window pressure.
5. **Model-agnostic** — every agent specifies a preferred model with a fallback to the workspace default.

---

## Directory Architecture

```
ai-dev-kit/
├── agents/                    22 specialist agent definitions
│   ├── planner.md             Implementation planning
│   ├── architect.md           System design and tradeoffs
│   ├── code-reviewer.md       Code quality and regressions
│   └── ...                    (19 more)
│
├── skills/                    57 skill playbooks (shared source of truth)
│   ├── tdd-workflow/
│   │   └── SKILL.md           RED/GREEN/REFACTOR workflow
│   ├── code-review/
│   │   └── SKILL.md           Review methodology
│   └── ...                    (55 more)
│
├── commands/                  41 slash-command shims (compatibility layer)
│   ├── build-fix.md
│   ├── code-review.md
│   └── ...                    (39 more)
│
├── hooks/                     Lifecycle automation
│   └── hooks.json             Event-triggered automations
│
├── rules/                     Language-specific coding standards
│   ├── common/                Universal rules (immutability, naming, etc.)
│   ├── python/                PEP 8, type annotations, FastAPI patterns
│   ├── typescript/            Type system, React patterns, Zod validation
│   └── web/                   Frontend, CSS, accessibility
│
├── manifests/                 Install manifests for deterministic setup
├── schemas/                   JSON schemas for validation
├── mcp-configs/               MCP server configurations
├── docs/                      Architecture, design, operations
├── examples/                  Reusable templates
├── scripts/                   Install, validate, sync helpers
├── tests/                     Smoke tests
│
├── .claude-plugin/            Claude Code plugin manifest + marketplace
│   ├── plugin.json            Plugin definition (name, skills, agents, MCP)
│   └── marketplace.json       Marketplace catalog
│
├── .codex-plugin/             Codex plugin manifest
│   └── plugin.json            Codex-specific plugin definition
│
├── .agents/                   Codex marketplace catalog
│   └── plugins/
│       └── marketplace.json   Marketplace with local source reference
│
├── .gemini/                   Gemini CLI extension
│   ├── gemini-extension.json  Extension manifest
│   └── GEMINI.md              Persistent context for Gemini
│
└── .opencode/                 OpenCode project config + TypeScript plugin
    ├── opencode.json          OpenCode configuration (models, agents, plugin)
    └── plugins/               TypeScript npm package
        ├── package.json
        ├── tsconfig.json
        └── src/
            └── index.ts       Plugin entry (tools, events, config)
```

---

## Plugin System

### Multi-Harness Model

Each platform has its own manifest directory, but all point to the same source content:

```
Platform        → Manifest                     → Points to
─────────────── → ──────────────────────────── → ───────────────────
Claude Code     → .claude-plugin/plugin.json   → ./skills/, ./agents/, .mcp.json
Codex           → .codex-plugin/plugin.json    → ./skills/, ./agents/
OpenCode        → .opencode/opencode.json      → ./plugins/ (TypeScript)
Gemini CLI      → .gemini/gemini-extension.json→ ./skills/, AGENTS.md
```

This means a skill update automatically propagates to all platforms — no duplication needed.

### Skills

Skills are the primary workflow surface. Each skill is a directory with a `SKILL.md`:

```
skills/<name>/
└── SKILL.md
```

The `SKILL.md` contains:
- **Frontmatter**: `name`, `description`, `origin`, `disable-model-invocation`
- **Body**: Instructions for the AI agent — when to activate, workflow steps, output format, security considerations

Skills are loaded on demand by agents. They are not loaded at startup — this keeps context windows manageable.

### Agents

Agents are specialist definitions in `agents/<name>.md`:

- **19 agents** covering planning, architecture, review, security, testing, ML, data, infra, and git
- Each agent specifies a preferred model (`opus`, `sonnet`, `haiku`) with a fallback
- Agents have defined tool permissions (`Read`, `Grep`, `Glob`, `Bash`)
- Agents follow a phased workflow with explicit output formats

### Commands

Commands are slash-command shims in `commands/<name>.md`. They exist for:
- Backward compatibility with harnesses that expect slash commands
- Quick-access workflows that don't need a full skill
- Migration surface for users transitioning from command-based to skill-based workflows

**Policy:** When a command and skill overlap, the skill is the source of truth.

### Hooks

Hooks are lifecycle automations defined in `hooks/hooks.json`:

```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "text",
          "text": "Verify the edit was applied correctly."
        }
      ]
    }
  ]
}
```

Claude Code v2.1+ auto-loads `hooks/hooks.json` by convention. Do not declare a `"hooks"` field in `plugin.json` — it causes a duplicate error.

---

## Marketplace System

### Claude Code Marketplace

A self-hosted marketplace at `.claude-plugin/marketplace.json`:
- Lists plugins with source references
- Supports relative paths, GitHub repos, git URLs, and npm packages
- Users add via `/plugin marketplace add noah-sheldon/ai-dev-kit`
- No approval process — discovery is via git repo reference

### Codex Marketplace

Located at `.agents/plugins/marketplace.json`:
- Uses `{ "source": { "source": "local", "path": "../.." } }` for repo-relative reference
- Discovered by Codex when the repo is cloned
- Public plugin directory support is coming soon

### Gemini Extension

A directory-based extension at `.gemini/`:
- `gemini-extension.json` defines name, version, context file
- `GEMINI.md` provides persistent model context
- Installed via `gemini extensions link .`

### OpenCode Plugin

A TypeScript npm package at `.opencode/plugins/`:
- Exports tools, event handlers, and config injection
- Compiled to `dist/` and published as `opencode-ai-dev-kit`
- Registered in `opencode.json` via `"plugin": ["./plugins"]`

---

## MCP Server Architecture

MCP (Model Context Protocol) servers provide tool access to AI agents. Configured in `.mcp.json`:

| Server | Purpose |
|---|---|
| `github` | GitHub API access — PR management, issue tracking |
| `context7` | Live documentation lookup for frameworks and libraries |
| `exa` | Neural web search for research and fact-checking |
| `memory` | Persistent memory across sessions |
| `playwright` | Browser automation and E2E testing |
| `sequential-thinking` | Step-by-step reasoning tool |

MCP servers are configured at the repo root (`.mcp.json`), not inside platform-specific directories. This keeps them shared across all platforms.

---

## Install System

### Default Install

The `./install.sh` script performs a default install:
- Validates prerequisites (Node.js 18+, Git)
- Runs `npm install`
- Validates the production surface

### Selective Install

The kit supports selective install — users can copy only the skills, agents, and rules they need. Each component is self-contained with no cross-dependencies.

### Validation

`scripts/validate-surface.js` checks:
- All required files exist
- All JSON manifests are valid
- All skill frontmatter parses correctly
- No broken references

---

## Security Model

- **No hardcoded secrets** — all credentials come from environment variables
- **Input validation at boundaries** — Pydantic (Python) and Zod (TypeScript)
- **Least privilege** — agents have explicit tool allowlists
- **No shell interpolation from untrusted strings**
- **Immutable data patterns** — no in-place mutation

---

## Performance Considerations

- **Progressive skill loading** — only load skills relevant to the current task
- **Model selection** — use stronger models for planning, standard for implementation
- **Context management** — keep skill files under 500 lines
- **Parallel agent execution** — use independent agents for parallel surfaces
- **Context pruning** — use `context-prune` skill for large context windows

---

## Evolution Path

### Current (v1.0.0)
- 55 skills, 19 agents, 40 commands
- Multi-platform plugin manifests
- MCP server configurations
- Basic install and validation

### Planned
- Selective install with profile support
- Per-project customization wizard
- Continuous learning (skill evolution from usage patterns)
- Translation support (i18n for skill content)
- Plugin version pinning and update channels

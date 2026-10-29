# Contributing

Thank you for contributing to AI Dev Kit. This guide covers how to add skills, agents, hooks, and commands — and how to get your changes merged.

---

## Contributor Policy

**AI tools, language models, and automated assistants are NOT eligible for contributor status or attribution in this repository.**

Only human developers may be listed as contributors, co-authors, or in any form of credit. This policy is permanent and non-negotiable.

---

## What We're Looking For

| Contribution | Description |
|---|---|
| **Skills** | Task-specific playbooks in `skills/<name>/SKILL.md` |
| **Agents** | Specialist agent definitions in `agents/<name>.md` |
| **Commands** | Slash-command shims in `commands/<name>.md` |
| **Hooks** | Lifecycle automation in `hooks/hooks.json` |
| **Rules** | Language-specific guidance in `rules/<lang>.md` |
| **Docs** | Architecture, design decisions, troubleshooting |
| **Tests** | Smoke tests and surface validation |

---

## Quick Start

1. **Fork** the repo and clone locally
2. **Create a branch**: `git checkout -b feat/my-skill`
3. **Make your change** following the templates below
4. **Run tests**: `npm test` and `node scripts/validate-surface.js`
5. **Submit a PR** with description of what and why

---

## Contributing Skills

### Structure

```
skills/<skill-name>/
└── SKILL.md
```

### SKILL.md Template

```markdown
---
description: One-line description of what this skill does
disable-model-invocation: true
---

[Instructions for the AI agent — be specific and actionable]

## Workflow

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Output

[What the agent should produce]

## Security

[Any security considerations]
```

### Skill Categories

| Category | Examples |
|---|---|
| Core Engineering | api-design, backend-patterns, frontend-patterns, hexagonal-architecture |
| Testing & Quality | tdd-workflow, code-review, security-review, e2e-testing |
| AI / ML | claude-api, openai-api, mlops-workflow, pytorch-patterns |
| Data | data-pipelines, database-migrations, postgres-patterns |
| Infrastructure | aws-devops, docker-patterns, ci-pipeline, deployment-patterns |
| Lifecycle | git-workflow, documentation-lookup, architecture-decision-records |

### Skill Checklist

- [ ] `description` frontmatter field is present and accurate
- [ ] Instructions are specific and actionable — no vague guidance
- [ ] Workflow steps are numbered and sequential
- [ ] Output section defines what the agent should produce
- [ ] Security section if the skill touches auth, secrets, or external input
- [ ] No hardcoded secrets or API keys
- [ ] File is under 500 lines

---

## Contributing Agents

### Structure

```
agents/<agent-name>.md
```

### Agent Template

```markdown
---
name: agent-name
description: One-line description of what this agent does
model: sonnet
tools: ["Read", "Grep", "Glob", "Bash"]
fallback_model: default
---

You are the **Agent Name** for the AI Dev Kit workspace.

## Role

[What this agent is responsible for]

## Expertise

### Area 1

[Specific expertise area with details]

### Area 2

[Specific expertise area with details]

## Workflow

### Phase 1: [Name]

1. [Step 1]
2. [Step 2]

### Phase 2: [Name]

1. [Step 1]
2. [Step 2]

## Output

[What the agent should produce]

## Security

[Any security considerations]

## Tool Usage

- **Read**: [When and how to use]
- **Grep**: [When and how to use]
- **Glob**: [When and how to use]
- **Bash**: [When and how to use]

## Model Fallback

If `sonnet` is unavailable, fall back to the workspace default model and continue.
```

---

## Contributing Hooks

### Structure

Hooks are defined in `hooks/hooks.json`:

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

### Hook Event Types

| Event | When it fires |
|---|---|
| `PostToolUse` | After any tool is executed |
| `SessionStart` | When a new session begins |
| `PreCommit` | Before a git commit is created |

### Hook Matcher Syntax

- Use regex patterns to match tool names
- `Write|Edit` matches both Write and Edit tools
- `.*` matches all tools

---

## Contributing Commands

### Structure

```
commands/<command-name>.md
```

### Command Template

```markdown
---
description: Brief description of the command
argument-hint: [arg1] [arg2]
---

# /command-name

[What the command does and how to use it]

## Usage

```
/command-name [arguments]
```
```

---

## Documentation

### When to Update Docs

- **README.md** — when install steps, features, or platform support change
- **AGENTS.md** — when agents are added, removed, or substantially modified
- **CONTRIBUTING.md** — when the contribution process changes
- **Skill docs** — when adding or modifying skills
- **Architecture docs** — when making structural or design changes

### Context7

Use the Context7 MCP server for live documentation lookup when writing skills or agent instructions for external frameworks.

---

## Cross-Platform Support

When contributing, ensure your change works across all supported platforms:

| Platform | Notes |
|---|---|
| **Claude Code** | Primary platform — test here first |
| **Codex** | Shares `skills/` directory — no duplication needed |
| **OpenCode** | Uses `.opencode/opencode.json` for config |
| **Gemini CLI** | Uses `.gemini/` for extension surface |
| **Copilot CLI** | Uses `.github-copilot/` — agents need `.agent.md` symlinks |
| **Cursor** | Manual context pack — limited support |

Skills in `skills/` are shared between Claude Code and Codex — single source of truth, no duplication.

### Copilot CLI Notes

- Agents must have `.agent.md` symlinks (e.g., `planner.agent.md -> planner.md`)
- Plugin manifest is `.github-copilot/plugin.json`
- Marketplace is `.github-copilot/marketplace.json`
- Symlinks in `.github-copilot/` point to actual content directories

---

## Pull Request Process

### PR Title Format

```
type(scope): brief description
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`

### PR Description Template

```markdown
## What
[One sentence describing the change]

## Why
[Brief explanation of the motivation]

## How
[Summary of the approach]

## Testing
- [ ] `npm test` passes
- [ ] `node scripts/validate-surface.js` passes
- [ ] Manual testing completed
```

### Review Process

1. Submit PR with description
2. `npm test` and surface validation must pass
3. Automated checks run on the PR
4. Maintainer reviews and requests changes if needed
5. Address feedback
6. Squash merge to `main`

---

## Standards

- ASCII-only files unless a file already uses non-ASCII content
- Keep plugin manifests valid JSON — run `python3 -m json.tool <file>` to validate
- Treat `scripts/validate-surface.js` failures as blockers
- Keep skill files under 500 lines
- Keep agent files under 300 lines
- No hardcoded secrets anywhere
- Use kebab-case for file and directory names

---

## Questions?

Open an issue or reach out to the maintainer. We're happy to help you contribute.

# AI Dev Kit

> Production-ready AI dev workflow scaffold with 59 skills, 33 agents, hooks, and rules.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Claude%20Code%20%7C%20Codex%20%7C%20OpenCode%20%7C%20Gemini%20%7C%20Copilot%20CLI%20%7C%20Qwen%20Code-lightgrey)](https://noahsheldon.dev)
[![Skills](https://img.shields.io/badge/skills-59-brightgreen)](./skills/)
[![Agents](https://img.shields.io/badge/agents-33-blue)](./agents/)
[![Commands](https://img.shields.io/badge/commands-41-orange)](./commands/)

---

## What Is This?

AI Dev Kit is a **complete plugin-oriented developer workspace** for AI coding assistants. It ships everything needed to run professional-grade engineering workflows — TDD, code review, security audit, CI/CD, ML pipelines, infrastructure-as-code, code quality analysis, and debt tracking — across Claude Code, Codex, OpenCode, and Gemini CLI.

Think of it as a **system prompt that scales to 59 specialized skills and 33 domain agents**, with lifecycle hooks and automated validation.

---

## Quick Start

### Claude Code

```bash
/plugin marketplace add noah-sheldon/ai-dev-kit
/plugin install ai-dev-kit@ai-dev-kit
```

Or install directly via HTTPS:

```bash
/plugin marketplace add https://github.com/noah-sheldon/ai-dev-kit
/plugin install ai-dev-kit@ai-dev-kit
```

### Codex

```bash
codex extensions add https://github.com/noah-sheldon/ai-dev-kit
```

Or clone and discover automatically:

```bash
git clone https://github.com/noah-sheldon/ai-dev-kit
```

The marketplace at `.agents/plugins/marketplace.json` will be discovered automatically.

### OpenCode

```bash
cd .opencode/plugins && npm install && npm run build
```

Or install via HTTPS:

```bash
npx opencode plugin install https://github.com/noah-sheldon/ai-dev-kit
```

### Gemini CLI

```bash
gemini extensions link https://github.com/noah-sheldon/ai-dev-kit
```

Or install via HTTPS directly:

```bash
gemini extensions install https://github.com/noah-sheldon/ai-dev-kit
```

### GitHub Copilot CLI

```bash
copilot plugin marketplace add https://github.com/noah-sheldon/ai-dev-kit
copilot plugin install ai-dev-kit@ai-dev-kit
```

Or install via HTTPS shorthand:

```bash
copilot plugin install https://github.com/noah-sheldon/ai-dev-kit
```

### Qwen Code

```bash
qwen extensions install https://github.com/noah-sheldon/ai-dev-kit
```

Or install locally:

```bash
qwen extensions install /path/to/ai-dev-kit
```

### Manual Install (any harness)

```bash
./install.sh
```

---

## What's Inside

```
ai-dev-kit/
├── agents/              33 specialized agents (planner, architect, code-reviewer, debt analyzers, ...)
├── skills/              59 skill playbooks (TDD, security, ML, infra, web, data, ...)
├── commands/            41 workflow commands and shims
├── hooks/               lifecycle automation (pre-tool, post-tool, session events)
├── rules/               language-specific guidance (common, python, typescript, web)
├── manifests/           install manifests for deterministic setup
├── schemas/             JSON schemas for validation
├── docs/                architecture, design decisions, troubleshooting
├── examples/            reusable templates
├── scripts/             install, validate, sync, and template helpers
├── tests/               smoke tests and surface validation
├── .claude-plugin/      Claude Code plugin manifest + marketplace
├── .codex-plugin/       Codex plugin manifest
├── .agents/             Codex marketplace catalog
├── .gemini/             Gemini CLI extension
└── .opencode/           OpenCode project config + TypeScript plugin
```

---

## Agents (33)

| Agent | When to Use |
|---|---|
| `planner` | Complex feature work — breaks requirements into phased, mergeable plans |
| `architect` | System design, component boundaries, API contracts |
| `tdd-guide` | Writing tests first — RED/GREEN/REFACTOR loop |
| `code-reviewer` | Reviewing diffs for correctness, regressions, quality |
| `security-reviewer` | Auth, secrets, input validation, OWASP review |
| `ai-judge` | Rubric-based validation of plans and outputs |
| `build-error-resolver` | Fixing TypeScript, Python, and build pipeline errors |
| `e2e-runner` | End-to-end test authoring and execution |
| `refactor-cleaner` | Cleanup, modernization, tech debt paydown |
| `doc-updater` | Syncing docs with code changes |
| `docs-lookup` | Finding and referencing documentation |
| `python-reviewer` | Python-specific code review (Pandas, FastAPI, SQLAlchemy) |
| `database-reviewer` | Schema, migration, and query review |
| `git-agent-coordinator` | Branch coordination, merges, PR orchestration |
| `ml-engineer` | ML/LLMOps: RAG, evals, model training, deployment |
| `chrome-ext-developer` | WXT and Chrome extension development |
| `data-engineer` | ETL, data quality, pipeline architecture |
| `infra-as-code-specialist` | IaC, CI/CD, deployment pipelines |
| `observability-telemetry` | Logs, metrics, traces, dashboard setup |
| `multi-agent-project-manager` | Multi-workflow orchestration, backlog, priority queue (never stops) |
| `workflow-auditor` | Health checks, stuck detection, quality gate trending, anomaly reporting |
| `reddit-researcher` | Reddit sentiment, production war stories, community consensus |
| `codebase-analyzer` | Codebase structure, dependency, and complexity analysis |
| `codebase-learner` | Learning and understanding unfamiliar codebases |
| `code-quality-analyzer` | Static analysis, code quality metrics, and standards enforcement |
| `test-debt-analyzer` | Identifying and tracking test coverage gaps |
| `security-debt-analyzer` | Security vulnerabilities and debt tracking |
| `performance-debt-analyzer` | Performance bottlenecks and optimization opportunities |
| `dependency-debt-analyzer` | Outdated dependencies and upgrade paths |
| `architecture-debt-analyzer` | Architectural issues and design debt |
| `process-debt-analyzer` | Workflow inefficiencies and process bottlenecks |
| `documentation-debt-analyzer` | Documentation gaps and staleness detection |
| `technical-debt-analyzer` | Overall technical debt assessment and prioritization |

---

## Skills (59)

### Core Engineering
`agentic-engineering` `api-design` `api-integrations` `backend-patterns` `frontend-patterns` `frontend-design` `hexagonal-architecture` `coding-standards` `codebase-onboarding`

### Testing & Quality
`tdd-workflow` `code-review` `security-review` `security-scan` `e2e-testing` `python-testing` `eval-harness` `verification-loop`

### AI / ML
`claude-api` `openai-api` `langchain-llamaindex` `mlops-workflow` `mlops-rag` `pytorch-patterns` `deep-research` `exa-search` `search-first` `iterative-retrieval` `autonomous-agent-harness` `autonomous-loops` `continuous-agent-loop` `context-prune` `token-budget-advisor` `prompt-optimizer` `mcp-server-patterns`

### Data
`data-pipelines` `data-pipelines-ai` `database-migrations` `postgres-patterns` `document-processing`

### Infrastructure
`aws-devops` `aws-deployment` `docker-patterns` `deployment-patterns` `ci-pipeline` `github-ops` `observability-telemetry` `multi-agent-git-workflow`

### Workflow & Operations
`architecture-decision-records` `dmux-workflows` `documentation-lookup` `git-workflow` `skill-authoring` `backlog-management` `workflow-status`

### Code Quality & Analysis
`codebase-report` `technical-debt-report`

### Specialized
`wxt-chrome-extension`

---

## Commands (41)

Build & quality: `build-fix` `code-review` `doctor` `eval` `ml-review` `quality-gate` `review` `review-pr` `test-coverage` `validate` `verify`

Workflow: `checkpoint` `feature-dev` `plan` `project-template` `promote` `resume-session` `save-session` `sessions` `skill-create` `skill-health`

Git & multi-agent: `git-agent` `multi-agent-status`

DevEx: `context-budget` `context-prune` `install` `uninstall` `update-codemaps` `update-docs`

Hook automation: `hookify` `hookify-configure` `hookify-list` `hookify-help`

Loop & continuous: `loop-start` `loop-status`

ML: `e2e` `launch`

Learning: `learn` `learn-eval`

---

## Cross-Platform Support

| Platform | Manifest | Marketplace | Install |
|---|---|---|---|
| **Claude Code** | `.claude-plugin/plugin.json` | `.claude-plugin/marketplace.json` | `/plugin marketplace add noah-sheldon/ai-dev-kit` |
| **Codex** | `.codex-plugin/plugin.json` | `.agents/plugins/marketplace.json` | Plugin Directory (after clone) |
| **Gemini CLI** | `.gemini/gemini-extension.json` | `.gemini/GEMINI.md` | `gemini extensions link .` |
| **OpenCode** | `.opencode/opencode.json` | `.opencode/plugins/` (npm) | `npm install opencode-ai-dev-kit` |
| **Copilot CLI** | `.github-copilot/plugin.json` | `.github-copilot/marketplace.json` | `copilot plugin install noah-sheldon/ai-dev-kit:.github-copilot` |
| **Qwen Code** | `qwen-extension.json` | `.qwen/marketplace.json` | `qwen extensions install noah-sheldon/ai-dev-kit` |
| **Cursor** | `.cursor/` | — | Manual context pack |

---

## Core Principles

1. **Agent-first** — delegate domain work to the right specialist.
2. **Test-driven** — write tests before implementation when behavior changes.
3. **Security-first** — validate inputs, avoid unsafe defaults, never hardcode secrets.
4. **Plan-before-execute** — break complex work into phases with the planner.
5. **Model fallback** — if a requested model is unavailable, use the default and continue.

---

## Workflow

```
Request → Planner → Architect → Domain Agents → AI-Judge → Implementation → Code Review → Security Review → Merge
```

1. **Plan** complex work with the `planner` agent before touching code.
2. **Write tests** first — use `tdd-guide` for RED/GREEN/REFACTOR discipline.
3. **Implement** with domain specialists (python-reviewer, ml-engineer, etc.).
4. **Validate** with `ai-judge` — rubric covers completeness, correctness, security, feasibility, testability.
5. **Review** with `code-reviewer` and `security-reviewer` before merge.
6. **Ship** with `git-agent-coordinator` for clean branch management.

---

## MCP Servers (Optional)

MCP servers are **not bundled** with this kit to avoid corporate network/proxy issues. Add your own MCP servers as needed:

| Server | Purpose |
|---|---|
| `github` | GitHub API access, PR management |
| `context7` | Live documentation lookup |
| `exa` | Neural web search |
| `memory` | Persistent memory across sessions |
| `playwright` | Browser automation & E2E testing |
| `sequential-thinking` | Step-by-step reasoning |

Configure MCP servers in your own `.mcp.json` at the project root.

---

## Requirements

- **Claude Code** v2.1+ (hooks auto-load by convention)
- **Node.js** 24+ LTS (for scripts and validation)
- **Git** (for agent coordination and version control)

---

## FAQ

**Q: How do I adapt this for my project?**
Start from `docs/examples/project-guidelines-template.md` and customize the skills you need.

**Q: What if a model is unavailable?**
Every agent has a `fallback_model` setting. If the specified model is down, it falls back to the workspace default.

**Q: How do I validate everything is correct?**
```bash
npm test                    # smoke tests
node scripts/validate-surface.js  # production surface check
```

**Q: Can I install only certain skills?**
Yes — the kit supports selective install. Each skill is self-contained. Copy only what you need.

**Q: How do I contribute?**
See [CONTRIBUTING.md](./CONTRIBUTING.md). Run `npm test` before submitting.

---

## Docs

| Document | Purpose |
|---|---|
| [Catalog](docs/CATALOG.md) | Full inventory of all skills, agents, commands |
| [Command-Agent Map](docs/COMMAND-AGENT-MAP.md) | Which agent handles each command |
| [Skill Development Guide](docs/SKILL-DEVELOPMENT-GUIDE.md) | How to write new skills |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common issues and workarounds |
| [Architecture Improvements](docs/ARCHITECTURE-IMPROVEMENTS.md) | Design recommendations |
| [Selective Install Design](docs/SELECTIVE-INSTALL-DESIGN.md) | How partial installs work |
| [Session Adapter Contract](docs/SESSION-ADAPTER-CONTRACT.md) | Session state specification |

---

## Security

- Never hardcode secrets — use environment variables or secret managers.
- Validate all external input at boundaries.
- Prefer least privilege and explicit allowlists.
- Review any change touching auth, secrets, or shell execution with `security-reviewer`.

See [SECURITY.md](./SECURITY.md) for the full policy.

---

## License

MIT — see [LICENSE](./LICENSE).

## Author

**Noah Sheldon** — [noahsheldon.dev](https://noahsheldon.dev)

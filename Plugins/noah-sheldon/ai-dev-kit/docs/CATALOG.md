# Catalog

This repo ships a compact production surface:

- **33 agents** — specialists for planning, architecture, review, security, ML, data, infra, git coordination, project management, and debt analysis
- **59 skills** — task-specific playbooks for TDD, security, code review, ML, infrastructure, data, web, AI workflows, and code quality reporting
- **41 commands** — slash-command shims for build, workflow, git, hooks, context, learning, and diagnostics
- **Rules** — common, Python, TypeScript, and web coding standards
- **Multi-platform surfaces** — Claude Code, Codex, OpenCode, Gemini CLI, Copilot CLI, and Qwen Code plugin manifests

---

## Agents (33)

| Agent | Purpose |
|---|---|
| `planner` | Implementation planning for complex features |
| `architect` | System design, tradeoffs, component boundaries |
| `tdd-guide` | Test-driven development specialist |
| `code-reviewer` | Code quality and regression prevention |
| `security-reviewer` | Security audit and threat modeling |
| `ai-judge` | Rubric-based validation |
| `build-error-resolver` | Build and type error diagnosis |
| `e2e-runner` | End-to-end testing |
| `refactor-cleaner` | Cleanup and modernization |
| `doc-updater` | Documentation sync |
| `docs-lookup` | Documentation reference |
| `python-reviewer` | Python-specific code review |
| `database-reviewer` | Database and migration review |
| `git-agent-coordinator` | Git orchestration and PR management |
| `ml-engineer` | ML/LLMOps specialist |
| `chrome-ext-developer` | WXT and Chrome extension work |
| `data-engineer` | ETL and data quality |
| `infra-as-code-specialist` | IaC and delivery pipelines |
| `observability-telemetry` | Logs, metrics, traces, dashboards |
| `multi-agent-project-manager` | Multi-workflow orchestration, backlog, priority queue (never stops) |
| `workflow-auditor` | Health checks, stuck detection, quality gate trending, anomaly reporting |
| `reddit-researcher` | Reddit sentiment analysis, production war stories, community consensus |
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
`agentic-engineering` `api-design` `api-integrations` `architecture-decision-records` `backend-patterns` `coding-standards` `codebase-onboarding` `frontend-design` `frontend-patterns` `hexagonal-architecture`

### Testing & Quality
`code-review` `e2e-testing` `eval-harness` `python-testing` `security-review` `security-scan` `tdd-workflow` `verification-loop`

### AI / ML
`autonomous-agent-harness` `autonomous-loops` `claude-api` `continuous-agent-loop` `context-prune` `deep-research` `exa-search` `iterative-retrieval` `langchain-llamaindex` `mcp-server-patterns` `mlops-rag` `mlops-workflow` `openai-api` `prompt-optimizer` `pytorch-patterns` `search-first` `token-budget-advisor`

### Data
`data-pipelines` `data-pipelines-ai` `database-migrations` `document-processing` `postgres-patterns`

### Infrastructure
`aws-deployment` `aws-devops` `ci-pipeline` `deployment-patterns` `dmux-workflows` `docker-patterns` `github-ops` `multi-agent-git-workflow` `observability-telemetry`

### Workflow & Operations
`backlog-management` `documentation-lookup` `git-workflow` `skill-authoring` `workflow-status`

### Code Quality & Analysis
`codebase-report` `technical-debt-report`

### Specialized
`wxt-chrome-extension`

---

## Commands (41)

| Category | Commands |
|---|---|
| **Build & Quality** | `build-fix`, `code-review`, `review`, `review-pr`, `quality-gate`, `verify`, `test-coverage`, `validate`, `eval`, `ml-review` |
| **Workflow** | `plan`, `feature-dev`, `checkpoint`, `install`, `uninstall`, `project-template`, `promote`, `resume-session`, `save-session`, `sessions`, `skill-create`, `skill-health`, `update-docs`, `update-codemaps`, `launch` |
| **Git & Multi-Agent** | `git-agent`, `multi-agent-status` |
| **Hooks** | `hookify`, `hookify-configure`, `hookify-list`, `hookify-help` |
| **Loop & Continuous** | `loop-start`, `loop-status` |
| **Context** | `context-budget`, `context-prune` |
| **Learning** | `learn`, `learn-eval` |
| **Diagnostics** | `doctor`, `e2e`, `refactor-clean` |

---

## Rules

| Surface | Files |
|---|---|
| **Common** | agents, cli, coding-principles, coding-style, docs, git-workflow, maintenance, performance, security, testing (10 files) |
| **Python** | coding-style, git-workflow, performance, security, testing (5 files) |
| **TypeScript** | architecture, coding-style, performance, security, testing (5 files) |
| **Web** | accessibility, design-quality, forms, performance, security, seo, testing, ux (8 files) |

---

## Platform Surfaces

| Platform | Manifest Directory | Installation |
|---|---|---|
| **Claude Code** | `.claude-plugin/` | `/plugin marketplace add noah-sheldon/ai-dev-kit` |
| **Codex** | `.codex-plugin/` + `.agents/plugins/` | Plugin Directory (after clone) |
| **OpenCode** | `.opencode/` + `.opencode/plugins/` | `npm install` + plugin reference |
| **Gemini CLI** | `.gemini/` | `gemini extensions link .` |
| **Copilot CLI** | `.github-copilot/` | `copilot plugin install noah-sheldon/ai-dev-kit:.github-copilot` |
| **Qwen Code** | `qwen-extension.json` + `.qwen/` | `qwen extensions install noah-sheldon/ai-dev-kit` |

---

Use this repo as a plugin-ready AI dev kit, not as a loose collection of prompts.

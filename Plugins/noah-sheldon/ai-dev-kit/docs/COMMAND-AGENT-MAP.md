# Command ↔ Agent Map

Maps every slash command to its primary agent(s) and the skills it draws on.

---

## Build & Quality

| Command | Primary Agent | Skills Referenced |
|---|---|---|
| `/build-fix` | `build-error-resolver` | `python-patterns`, `typescript-patterns` |
| `/code-review` | `code-reviewer` | `code-review`, `coding-standards` |
| `/review` | `code-reviewer` | `code-review`, `verification-loop` |
| `/review-pr` | `code-reviewer` | `code-review`, `github-ops` |
| `/quality-gate` | `code-reviewer`, `security-reviewer` | `verification-loop`, `security-review` |
| `/verify` | `code-reviewer` | `verification-loop` |
| `/test-coverage` | `e2e-runner`, `tdd-guide` | `python-testing`, `e2e-testing`, `eval-harness` |
| `/validate` | `doc-updater` | `skill-authoring` |
| `/eval` | `ml-engineer` | `eval-harness`, `token-budget-advisor` |
| `/ml-review` | `ml-engineer` | `mlops-workflow`, `mlops-rag` |

## Workflow

| Command | Primary Agent | Skills Referenced |
|---|---|---|
| `/plan` | `planner` | `architecture-decision-records`, `agentic-engineering` |
| `/feature-dev` | `planner`, `architect` | `agentic-engineering`, `api-design`, `backend-patterns` |
| `/checkpoint` | `git-agent-coordinator` | `git-workflow`, `multi-agent-git-workflow` |
| `/install` | `doc-updater` | `codebase-onboarding` |
| `/uninstall` | `doc-updater` | `codebase-onboarding` |
| `/project-template` | `architect` | `architecture-decision-records` |
| `/promote` | `git-agent-coordinator` | `github-ops`, `multi-agent-git-workflow` |
| `/resume-session` | `docs-lookup` | `documentation-lookup` |
| `/save-session` | `docs-lookup` | `documentation-lookup` |
| `/sessions` | `docs-lookup` | `documentation-lookup` |
| `/skill-create` | `doc-updater` | `skill-authoring` |
| `/skill-health` | `doc-updater` | `skill-authoring`, `verification-loop` |
| `/update-docs` | `doc-updater` | `documentation-lookup` |
| `/update-codemaps` | `doc-updater` | `documentation-lookup`, `context-prune` |
| `/launch` | `infra-as-code-specialist` | `deployment-patterns`, `ci-pipeline` |

## Git & Multi-Agent

| Command | Primary Agent | Skills Referenced |
|---|---|---|
| `/git-agent` | `git-agent-coordinator` | `git-workflow`, `multi-agent-git-workflow`, `github-ops` |
| `/multi-agent-status` | `multi-agent-project-manager` | `workflow-status`, `backlog-management` |

## Hook Automation

| Command | Primary Agent | Skills Referenced |
|---|---|---|
| `/hookify` | `refactor-cleaner` | `ci-pipeline`, `coding-standards` |
| `/hookify-configure` | `refactor-cleaner` | `ci-pipeline` |
| `/hookify-list` | `refactor-cleaner` | `ci-pipeline` |
| `/hookify-help` | `docs-lookup` | `documentation-lookup` |

## Loop & Continuous

| Command | Primary Agent | Skills Referenced |
|---|---|---|
| `/loop-start` | `tdd-guide` | `continuous-agent-loop`, `tdd-workflow` |
| `/loop-status` | `observability-telemetry` | `observability-telemetry`, `context-prune` |

## Context Management

| Command | Primary Agent | Skills Referenced |
|---|---|---|
| `/context-budget` | `docs-lookup` | `token-budget-advisor`, `context-prune` |
| `/context-prune` | `docs-lookup` | `context-prune` |

## Learning & Research

| Command | Primary Agent | Skills Referenced |
|---|---|---|
| `/learn` | `docs-lookup` | `documentation-lookup`, `codebase-onboarding` |
| `/learn-eval` | `ml-engineer`, `eval-harness` | `eval-harness`, `token-budget-advisor` |

## Diagnostics

| Command | Primary Agent | Skills Referenced |
|---|---|---|
| `/doctor` | `doc-updater` | `codebase-onboarding` |
| `/e2e` | `e2e-runner` | `e2e-testing`, `docker-patterns` |
| `/refactor-clean` | `refactor-cleaner` | `coding-standards`, `python-patterns`, `typescript-patterns` |

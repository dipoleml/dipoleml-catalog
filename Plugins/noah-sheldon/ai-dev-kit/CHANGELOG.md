# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- 11 debt analyzer agents (codebase-analyzer, codebase-learner, code-quality-analyzer, test-debt-analyzer, security-debt-analyzer, performance-debt-analyzer, dependency-debt-analyzer, architecture-debt-analyzer, process-debt-analyzer, documentation-debt-analyzer, technical-debt-analyzer)
- 2 code quality reporting skills (codebase-report, technical-debt-report)

---

## [1.1.0] — 2026-04-13

### Added
- 33 agents total (added: codebase-analyzer, codebase-learner, code-quality-analyzer, test-debt-analyzer, security-debt-analyzer, performance-debt-analyzer, dependency-debt-analyzer, architecture-debt-analyzer, process-debt-analyzer, documentation-debt-analyzer, technical-debt-analyzer)
- 59 skills total (added: codebase-report, technical-debt-report)
- Comprehensive technical debt analysis suite with 11 specialized debt analyzer agents
- Codebase analysis and learning agents for rapid onboarding
- Static analysis and code quality metrics enforcement

---

## [1.0.0] — 2026-04-12

### Added
- Initial production scaffold
- Plugin manifests for Claude Code (`.claude-plugin/plugin.json`) and marketplace (`.claude-plugin/marketplace.json`)
- Plugin manifest for Codex (`.codex-plugin/plugin.json`) and marketplace (`.agents/plugins/marketplace.json`)
- Gemini CLI extension (`.gemini/gemini-extension.json`)
- OpenCode plugin (`.opencode/plugins/`) with TypeScript entry point
- Core content directories: `agents/`, `skills/`, `commands/`, `hooks/`, `rules/`
- Install tooling (`install.sh`, `install.ps1`)
- Validation scripts (`scripts/validate-surface.js`, `tests/`)
- Documentation: README, AGENTS, CONTRIBUTING, SECURITY, CHANGELOG
- MCP configuration files

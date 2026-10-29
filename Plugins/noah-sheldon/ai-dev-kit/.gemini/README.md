# Gemini Extension — AI Dev Kit

This directory contains the Gemini CLI extension for AI Dev Kit.

## Structure

```
.gemini/
├── gemini-extension.json   — Extension manifest (name, version, context, keywords)
└── GEMINI.md               — Persistent context and instructions for the model
```

## What This Provides

- **55 skills** from `./skills/` — task-specific playbooks for TDD, security, ML, infrastructure, and web development
- **19 agents** from `./agents/` — specialist agents for planning, architecture, review, and domain expertise
- **Context file** (`GEMINI.md`) — auto-loaded into Gemini's context with workflow principles, coding standards, and security guidelines

## Installation

```bash
# Install locally from repo root
gemini extensions link .
```

## Notes

- The `contextFileName` in `gemini-extension.json` points to `GEMINI.md` — this file is automatically loaded into Gemini's context when the extension is active
- Skills and agents reference the root `skills/` and `agents/` directories — shared source of truth across all platforms
- The extension does not override any `~/.gemini/` user settings

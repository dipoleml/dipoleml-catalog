# Privacy Policy — AI Dev Kit

**Last updated:** April 13, 2026

## What This Plugin Is

AI Dev Kit is an open-source plugin for AI coding assistants (Claude Code, Codex, OpenCode, Gemini CLI, Copilot CLI, Qwen Code). It provides pre-built agent workflows, skill playbooks, commands, and lifecycle hooks for developer workflows.

## Data Collection

**This plugin does not collect, store, or transmit any user data.**

- No telemetry, analytics, or usage metrics are included.
- No phone-home, tracking, or external network calls are made by the plugin itself.
- No personal information, code, or project data is sent to any third party.

## MCP Servers (Optional)

This plugin **does not bundle or configure any MCP servers by default**. If you choose to add MCP server connections (e.g., GitHub API, web search, documentation lookup), those connections are governed by the respective third-party service privacy policies:

| Service | Privacy Policy |
|---|---|
| GitHub API | https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement |
| Context7 (Upstash) | https://upstash.com/privacy |
| Exa AI | https://exa.ai/privacy |
| Model Context Protocol | https://modelcontextprotocol.io/ |

MCP servers are entirely optional and must be explicitly configured by the user.

## Local Storage

The plugin operates entirely within your local workspace:

- Agent definitions, skill playbooks, and commands are static Markdown files.
- Lifecycle hooks (`hooks/hooks.json`) only contain text-based instructions.
- Any session state, saved sessions, or context files remain on your local machine.

## External Dependencies

The plugin includes install scripts (`install.sh`, `install.ps1`) that download and set up the plugin files. These scripts:

- Only read from this public GitHub repository (`https://github.com/noah-sheldon/ai-dev-kit`).
- Do not transmit any data from your machine.
- Can be audited — the source code is fully open and transparent.

## Open Source

The complete source code is available at:
- **Repository:** https://github.com/noah-sheldon/ai-dev-kit
- **License:** MIT

You are free to audit, modify, and verify all code in this plugin.

## Changes to This Policy

Updates to this policy will be posted in the repository and reflected in the "Last updated" date above.

## Contact

For questions or concerns about this privacy policy:
- **Email:** noahsheldon06@gmail.com
- **Website:** https://noahsheldon.dev

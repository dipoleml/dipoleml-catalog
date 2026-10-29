# Claude Code Skills registry — designlang

## Skill name

designlang

## SKILL.md (the file the registry expects)

```markdown
---
name: designlang
description: Reverse-engineer any website into a complete design system. Outputs DTCG W3C tokens, motion, anatomy, voice, page intent, material language, plus a single agent-native DESIGN.md and a one-command Next.js clone. Use when the user wants to extract, mirror, or compare design tokens against a live URL.
when_to_use: |
  Use this skill when the user wants to:
  - Extract design tokens, palette, typography, or shadows from a public website
  - Generate a DESIGN.md for an existing site (agent-native single-file artifact)
  - Clone a website's design as a runnable Next.js starter
  - Compare local tokens against a deployed site (drift detection)
  - Import a website's tokens into Figma, Tailwind, iOS, Android, Flutter, or WordPress
arguments:
  - name: url
    description: Public URL of the site to extract from.
    required: true
---

# designlang skill

`npx designlang <url>` runs a Playwright extraction and writes ~25 files
(DTCG tokens, Tailwind, CSS vars, Figma vars, motion, anatomy, voice,
intent, material, library detection, prompt pack for v0/Lovable/Cursor,
plus the single-file `DESIGN.md`).

Sub-commands:
- `designlang clone <url>` — generates a working Next.js repo from the extraction
- `designlang ci <url> --tokens ./tokens.json` — drift bot, writes a PR-comment markdown
- `designlang studio` — local web studio over the latest extraction
- `designlang chat <url>` — REPL with mutations (sharpen / soften / dark / brutalist / glass / swap-color / swap-font)
- `designlang mcp` — stdio MCP server

For agent rules and ready-to-paste prompts, run with `--emit-agent-rules` or read
the `*-prompts/` directory.

The full spec for `DESIGN.md` is at <https://designlang.app/spec>.
```

## Submission flow

1. Fork <https://github.com/anthropics/claude-code> (or the then-current registry repo).
2. Add `skills/designlang/SKILL.md` with the content above.
3. PR title: `Add: designlang skill`.
4. PR body: link to <https://designlang.app>, describe the surface, mention 1.6k stars + 5K npm downloads.
5. Tag the PR with `skill` and `community`.

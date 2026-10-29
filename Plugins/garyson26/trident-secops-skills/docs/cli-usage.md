# CLI usage

This document explains how to use the installed skills during a session on
any of the three supported agents.

Skill invocation differs slightly per agent:

| Agent | How skills are invoked |
| --- | --- |
| Gemini CLI | `/skills list`, then reference a skill by name in your prompt |
| Claude Code | Skills load automatically by description match; `/plugin` manages the bundle |
| Codex | Skills load at startup and match on the `description` field; `$skill-name` references one directly |

All three read the same `SKILL.md` frontmatter, so a skill's `name` and
`description` drive activation everywhere.

## Discovery model

Each agent discovers skills from its own locations. In practical order for
this repository:

| Agent | User scope | Project scope | Bundled |
| --- | --- | --- | --- |
| Gemini CLI | `~/.gemini/skills/` | `.gemini/skills/` | extension `skills/` |
| Claude Code | `~/.claude/skills/` | `.claude/skills/` | plugin `skills/` |
| Codex | `~/.agents/skills/` | `.agents/skills/` | — |

Codex also searches the repository root and `/etc/codex/skills`. Gemini CLI
additionally recognizes `~/.agents/skills/` and `.agents/skills/` as
interoperable aliases, so a Codex-scope install is often visible to Gemini
too.

Each skill must be one directory deep and must contain a file named
`SKILL.md`.

Example:

```text
~/.gemini/skills/
├── go-programming/
│   └── SKILL.md
└── offensive-security/
    └── SKILL.md
```

## Manage skills in a session

### Gemini CLI only

```text
/skills list
/skills list nodesc
/skills reload
/skills disable offensive-security
/skills enable offensive-security
```

Use `/skills reload` after copying or editing skill files.

### Claude Code only

```text
/plugin
```

Manages the installed bundle — enable, disable, update, or remove it.
Individual skills activate automatically on description match.

### Codex only

Skills are loaded at startup, so restart Codex after copying or editing skill
files. Reference one directly with `$skill-name`.

## Invoke skills naturally

Every agent activates skills based on each skill's `name` and `description`.
You can rely on natural language or explicitly mention the skill by name.

Examples:

```text
Use go-programming to review this package for goroutine leaks.
Use soc-operations to triage this failed-login spike.
Use devsecops to harden this GitHub Actions pipeline.
Use prompt-enhancement to rewrite this vague agent prompt.
Use multilingual to localize this README into Indonesian.
```

## Combine skills

Complex tasks can benefit from multiple skills. State the order when the order
matters.

Examples:

```text
Use cybersecurity-partner first to threat model this service, then use
devsecops to turn the highest risks into CI/CD controls.
```

```text
Use malware-reverse-engineering to summarize this sandbox report, then use
soc-operations to create a triage note and hunting plan.
```

```text
Use prompt-enhancement to clarify this assessment prompt, then use
offensive-security to build a safe authorized test plan.
```

## Trust and consent

Every agent treats skills as privileged context. Gemini CLI may require the
workspace to be trusted before workspace skills load. When a skill activates,
review the skill name and path before approving activation.

Do not install skills from repositories you do not trust. A skill can influence
agent behavior and may include bundled resources.

## Updating installed skills

If you installed by copying folders, pull and re-run the installer:

```bash
cd /path/to/Trident-SecOps-Skills
git pull
./install.sh codex     # or claude, or gemini
```

Re-running is safe: each of the 24 skill directories is replaced
individually, and unrelated skills in the destination are left alone.

Then reload:

| Agent | Reload |
| --- | --- |
| Gemini CLI | `/skills reload` |
| Claude Code | restart, or `/plugin` to update the bundle |
| Codex | restart — skills load at startup |

If you installed through an extension or plugin instead:

```bash
gemini extensions update trident-secops-skills
```

```text
/plugin marketplace update trident-secops
```

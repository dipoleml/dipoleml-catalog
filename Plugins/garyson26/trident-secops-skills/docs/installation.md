# Installation guide

This guide covers prerequisites and per-agent setup detail. For the
copy-paste install commands, see [INSTALL.md](../INSTALL.md) — it is the
single source for those, and this guide does not repeat them.

The repository URL used by all examples is:

```text
https://github.com/Garyson26/Trident-SecOps-Skills
```

## Requirements

Common to every agent:

- `git` for cloning the repository.
- A trusted terminal environment, because skills provide instructions and
  bundled resources to the agent.

Per agent:

| Agent | Requirement |
| --- | --- |
| Gemini CLI | Node.js with `npm`, then `npm install -g @google/gemini-cli` |
| Claude Code | Claude Code installed and authenticated |
| Codex | Codex CLI installed and authenticated |

Start your agent once to complete authentication before installing skills.

## Choosing an install scope

Both installers support user scope and project scope.

- **User scope** puts the skills in your home directory, where every project
  sees them. This is the default.
- **Project scope** puts them inside one repository, so they travel with that
  project and do not affect anything else. Pass `--project <dir>`
  (`-Project <dir>` in PowerShell).

Project scope is the better choice when the skills are relevant to one
codebase, or when you want them committed alongside a team's repository.

## Where each agent looks

| Agent | User scope | Project scope |
| --- | --- | --- |
| Gemini CLI | `~/.gemini/skills` | `<project>/.gemini/skills` |
| Claude Code | `~/.claude/skills` | `<project>/.claude/skills` |
| Codex | `~/.agents/skills` | `<project>/.agents/skills` |

Codex additionally searches the repository root and `/etc/codex/skills`.
Its path is `.agents/skills`, not `.codex/skills` — this is the most common
source of "the skills did not load" reports.

## Extension and plugin installs

Gemini CLI and Claude Code can install the bundle directly from GitHub
without cloning, through the extension and plugin-marketplace mechanisms
respectively. Codex has no equivalent, so it always installs by copy.

See [INSTALL.md](../INSTALL.md) for the exact commands.

## Development installs

When editing skills locally, install with project scope into a scratch
directory and re-run the installer after each change, rather than editing
installed copies in place. Installed copies are overwritten on the next run.

Gemini CLI also supports linking individual skills for live development:

```bash
gemini skills link ./skills/go-programming
```

Repeat for each skill you want to test.

## Verify

Run the repository's own structural check:

```bash
bash scripts/validate.sh
```

Then confirm the agent sees them:

| Agent | Check |
| --- | --- |
| Gemini CLI | `/skills list` |
| Claude Code | `/plugin`, or prompt something a skill description matches |
| Codex | reference a skill directly, e.g. `$soc-operations` |

If an agent does not see the skills, see
[troubleshooting](troubleshooting.md).

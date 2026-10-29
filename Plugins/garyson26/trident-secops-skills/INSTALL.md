# Install

This document gives direct installation commands for
`https://github.com/Garyson26/Trident-SecOps-Skills`.

The same 24 skills install on Gemini CLI, Claude Code, and OpenAI Codex. The
repository holds one canonical `skills/` tree; each agent reaches it
differently.

| Agent | Discovery path | Easiest install |
| --- | --- | --- |
| Gemini CLI | extension `skills/` | `gemini extensions install ...` |
| Claude Code | plugin `skills/` | `/plugin marketplace add ...` |
| Codex | `.agents/skills` | `./install.sh codex` |

> Codex discovers skills under `.agents/skills` — not `.codex/skills`.
> It searches the current directory, the repository root, `$HOME`, and
> `/etc/codex/skills`, in that order.

---

## Gemini CLI

Install Gemini CLI first:

```bash
npm install -g @google/gemini-cli
```

### Extension install (recommended)

```bash
gemini extensions install https://github.com/Garyson26/Trident-SecOps-Skills --consent
```

Restart Gemini CLI, then verify:

```text
/extensions list
/skills list
```

Update later with:

```bash
gemini extensions update trident-secops-skills
```

### Manual global install

```bash
git clone https://github.com/Garyson26/Trident-SecOps-Skills.git
cd Trident-SecOps-Skills
./install.sh gemini
```

Or without the script:

```bash
mkdir -p ~/.gemini/skills && cp -R skills/* ~/.gemini/skills/
```

Reload inside Gemini CLI:

```text
/skills reload
```

### Project-scoped install

```bash
./install.sh gemini --project /path/to/your/project
```

Or manually:

```bash
mkdir -p /path/to/your/project/.gemini/skills
cp -R skills/* /path/to/your/project/.gemini/skills/
```

If Gemini CLI does not load workspace skills, trust the workspace and reload:

```text
/trust
/skills reload
```

---

## Claude Code

### Plugin marketplace install (recommended)

```text
/plugin marketplace add Garyson26/Trident-SecOps-Skills
/plugin install trident-secops-skills@trident-secops
```

The same commands work from the CLI:

```bash
claude plugin marketplace add Garyson26/Trident-SecOps-Skills
claude plugin install trident-secops-skills@trident-secops
```

Verify with `/plugin` and confirm the skills appear when their descriptions
match your prompt.

### Manual personal install

```bash
git clone https://github.com/Garyson26/Trident-SecOps-Skills.git
cd Trident-SecOps-Skills
./install.sh claude
```

Or without the script:

```bash
mkdir -p ~/.claude/skills && cp -R skills/* ~/.claude/skills/
```

### Project-scoped install

```bash
mkdir -p /path/to/your/project/.claude/skills
cp -R skills/* /path/to/your/project/.claude/skills/
```

---

## Codex

Codex has no extension or marketplace mechanism for this bundle, so
installation is a copy into `.agents/skills`.

### Script install (recommended)

```bash
git clone https://github.com/Garyson26/Trident-SecOps-Skills.git
cd Trident-SecOps-Skills
./install.sh codex
```

### Manual install

```bash
# user scope
mkdir -p ~/.agents/skills && cp -R skills/* ~/.agents/skills/

# project scope
mkdir -p /path/to/project/.agents/skills && cp -R skills/* /path/to/project/.agents/skills/
```

Codex loads skills at startup and matches them on the `description` field.
Reference one directly with `$skill-name`, for example
`$soc-operations`.

---

## Windows

Both installers are at feature parity. Use `install.ps1` from PowerShell:

```powershell
git clone https://github.com/Garyson26/Trident-SecOps-Skills.git
cd Trident-SecOps-Skills
./install.ps1 -Platform codex
./install.ps1 -Platform claude
./install.ps1 -Platform gemini
```

Add `-Yes` to skip the confirmation prompt, and `-Project <dir>` to install
into a project instead of your home directory.

Manual equivalents:

```powershell
New-Item -ItemType Directory -Force -Path "$HOME/.agents/skills" | Out-Null
Copy-Item -Recurse -Force skills/* "$HOME/.agents/skills/"
```

---

## Installer reference

```text
./install.sh <codex|claude|gemini> [--project <dir>] [--yes]
./install.ps1 -Platform <codex|claude|gemini> [-Project <dir>] [-Yes]
```

| Platform | Destination |
| --- | --- |
| `codex` | `<base>/.agents/skills` |
| `claude` | `<base>/.claude/skills` |
| `gemini` | `<base>/.gemini/skills` |

`<base>` is your home directory unless `--project` / `-Project` is given.

Both installers replace each of the 24 skill directories individually, so
unrelated skills already in the destination are left untouched. Re-running an
installer is safe.

---

## Verification checklist

After installation, confirm these points:

- The destination contains 24 skill directories, each with a `SKILL.md`.
- The skill folders are exactly one directory deep under the discovery path.
- For Gemini CLI, `/skills list` shows the expected names and the CLI was
  restarted or `/skills reload` was run.
- For Claude Code, `/plugin` lists `trident-secops-skills`.
- For Codex, the skills live under `.agents/skills`, not `.codex/skills`.
- Workspace installs are inside a trusted workspace.

To validate the repository tree itself:

```bash
bash scripts/validate.sh
```

---

## Uninstall

Gemini CLI extension:

```bash
gemini extensions uninstall trident-secops-skills
```

Claude Code plugin:

```text
/plugin uninstall trident-secops-skills@trident-secops
```

Manually copied skills — remove only the directories this bundle installed:

```bash
for skill in $(ls skills); do rm -rf ~/.agents/skills/"$skill"; done
```

Substitute `~/.claude/skills` or `~/.gemini/skills` for other agents. Running
this from a clone guarantees you remove exactly the 24 bundled skills and
nothing else.

# FAQ

## What is this repository?

This repository is a Gemini CLI Agent Skills collection for security,
programming, reverse engineering, DevSecOps, SOC operations, prompt work, and
multilingual communication.

## What is the repository URL?

```text
https://github.com/Garyson26/Trident-SecOps-Skills
```

## What is the recommended install command?

```bash
gemini extensions install https://github.com/Garyson26/Trident-SecOps-Skills --consent
```

## Where do the skills live?

In `skills/`, and nowhere else. Gemini CLI reads it through
`gemini-extension.json`, Claude Code through `.claude-plugin/plugin.json`,
and Codex through a copy into `.agents/skills` made by the installers.

Earlier revisions also kept a copy of each skill at the repository root.
Those were removed in 3.0.0, and `scripts/validate.sh` now fails if they
reappear.

## Do I need different skill files for each agent?

No. All three agents read the same `SKILL.md` format — YAML frontmatter with
`name` and `description`, then a markdown body. Nothing in `skills/` is
platform-specific. Only the discovery path differs, which is what the
manifests and installers handle.

## Which skills are included?

The repository includes:

- `go-programming`
- `python-programming`
- `assembly-programming`
- `offensive-security`
- `exploit-development`
- `malware-reverse-engineering`
- `devsecops`
- `soc-operations`
- `cybersecurity-partner`
- `prompt-enhancement`
- `multilingual`
- `claude-mythos-emulation`

## Are these skills safe for offensive security?

They are intended for authorized offensive security, defensive validation,
education, and lab work. They are not intended for unauthorized access,
stealth, persistence, credential theft, destructive activity, or malware
deployment.

## How do I verify the skills loaded?

Run this inside Gemini CLI:

```text
/skills list
```

If you installed or edited files while Gemini CLI was running, reload:

```text
/skills reload
```

## How do I update the extension?

```bash
gemini extensions update trident-secops-skills
```

## How do I use one skill directly?

Mention it by name:

```text
Use devsecops to review this CI/CD pipeline for secrets, permissions, and
artifact integrity.
```

## Can I use these skills outside Gemini CLI?

The skills use the `SKILL.md` format. Other compatible agent tools may be able
to read the same skill folders, but installation paths and activation behavior
depend on the tool.


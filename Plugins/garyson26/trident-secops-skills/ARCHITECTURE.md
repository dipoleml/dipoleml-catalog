# Architecture

This repository uses a single source of truth with thin per-platform
adapters. One canonical `skills/` tree serves Gemini CLI, Claude Code, and
OpenAI Codex.

## Main components

The primary components are:

- `skills/`: the canonical Agent Skills tree. The only copy.
- `gemini-extension.json`: Gemini CLI extension manifest.
- `.claude-plugin/plugin.json`: Claude Code plugin manifest; its `skills`
  field points at `./skills/`.
- `.claude-plugin/marketplace.json`: Claude Code marketplace entry.
- `install.sh` / `install.ps1`: copy `skills/` into an agent's discovery
  directory. Required for Codex, optional for the other two.
- `scripts/validate.sh`: structural validation of the skills tree.
- `docs/`: Detailed documentation.
- `assets/banner.svg`: README banner.

## Adapter model

All three agents read the same unit: a directory containing a `SKILL.md`
whose YAML frontmatter supplies `name` and `description`. They differ only
in where they look for it.

| Agent | Reaches `skills/` via |
| --- | --- |
| Gemini CLI | `gemini-extension.json`, which bundles the top-level `skills/` directory |
| Claude Code | `.claude-plugin/plugin.json`, whose `skills` field points at `./skills/` |
| Codex | a copy into `.agents/skills`, performed by the installers |

Gemini and Claude therefore install straight from the repository. Codex
scans `.agents/skills` rather than `skills/`, so it needs the copy step.

Because the format is common, no skill file contains platform-specific
content, and adding a fourth agent means adding an adapter, not editing 24
skills.

## Extension layout

Gemini CLI extensions can bundle Agent Skills in a top-level `skills/`
directory.

```text
trident-secops-skills/
├── gemini-extension.json
└── skills/
    └── go-programming/
        └── SKILL.md
```

The extension install command is:

```bash
gemini extensions install https://github.com/Garyson26/Trident-SecOps-Skills --consent
```

## Skill layout

Each skill is self-contained:

```text
skill-name/
├── SKILL.md
└── agents/
    └── openai.yaml
```

`SKILL.md` is the required file, and its frontmatter `name` must match the
directory name. `agents/openai.yaml` is Codex interface metadata; Gemini CLI
and Claude Code ignore it.

## No duplication

`skills/` is the only skill tree. Earlier revisions also kept a copy of each
skill at the repository root for direct-copy workflows; those copies were
removed in 3.0.0 after two skills had already drifted out of sync.

`scripts/validate.sh` fails if a skill directory reappears at the repository
root, so the duplication cannot return unnoticed. Run it before opening a
pull request:

```bash
bash scripts/validate.sh
```

## Safety architecture

Cyber security skills include boundaries in both metadata and body text. This
matters because the metadata influences activation before the full body is
loaded.

Safety requirements:

- Mention authorization and defensive purpose in dual-use skill descriptions.
- Put high-risk disallowed behavior in the skill body.
- Prefer remediation, detection, evidence, and containment outputs.
- Avoid operational misuse guidance.


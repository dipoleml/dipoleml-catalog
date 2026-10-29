# Contributing

Contributions are welcome if they improve the quality, safety, clarity, or
coverage of Trident SecOps Skills.

Repository URL:

```text
https://github.com/Garyson26/Trident-SecOps-Skills
```

## Contribution priorities

High-value contributions include:

- Clearer skill descriptions that improve activation accuracy.
- Better safety boundaries for dual-use security workflows.
- More precise workflows for realistic operational tasks.
- Documentation improvements.
- Validation fixes.
- New skills with a focused, reusable purpose.

Avoid contributions that:

- Add unauthorized offensive guidance.
- Add malware improvement or evasion guidance.
- Add vague persona text without operational value.
- Duplicate existing skill coverage.
- Add large generated files without a clear use.

## Repository layout

All skills live under:

```text
skills/<skill-name>/SKILL.md
```

`skills/` is the single canonical tree. Never add a skill directory at the
repository root — an earlier duplicate layout drifted out of sync and was
removed in 3.0.0. `scripts/validate.sh` fails if one reappears.

The same tree serves all three agents. Gemini CLI reaches it through
`gemini-extension.json`, Claude Code through `.claude-plugin/plugin.json`,
and Codex through a copy into `.agents/skills`. A skill needs no
platform-specific variants.

## Skill authoring rules

Use these rules for `SKILL.md` files:

- Start with YAML frontmatter on line 1.
- Include `name:` and `description:`.
- Match folder name and `name:`.
- Use lowercase hyphenated names.
- Make the description specific because it controls activation.
- Keep the body concise and procedural.
- Include safety boundaries for dual-use work.
- Prefer workflows, checklists, and output formats over generic teaching text.

## Documentation rules

Use these rules for Markdown:

- Use clear headings.
- Use fenced code blocks with language tags when possible.
- Keep commands copyable.
- Use repository URL `https://github.com/Garyson26/Trident-SecOps-Skills`.
- Prefer relative links for local files.
- Keep security claims precise.

## Validation

Validate the skills tree. This is the check that must pass before any pull
request:

```bash
bash scripts/validate.sh
```

It asserts that every skill has a `SKILL.md`, that its frontmatter `name` and
`description` are present and the name matches the directory, that any
`agents/openai.yaml` parses, and that no skill directory exists at the
repository root.

Validate the manifests:

```bash
python -m json.tool gemini-extension.json
python -m json.tool .claude-plugin/plugin.json
python -m json.tool .claude-plugin/marketplace.json
```

Keep the `version` field in step across all three when releasing.

Test the installers against a scratch directory rather than your real
configuration:

```bash
scratch="$(mktemp -d)"
./install.sh codex --project "$scratch" --yes
find "$scratch/.agents/skills" -mindepth 2 -maxdepth 2 -name SKILL.md | wc -l   # expect 24
rm -rf "$scratch"
```

Check local Markdown links:

```bash
python - <<'PY'
from pathlib import Path
import re, sys
bad = []
for path in Path('.').rglob('*.md'):
    text = path.read_text(errors='ignore')
    for match in re.finditer(r'\[[^\]]+\]\(([^)]+)\)', text):
        target = match.group(1).split('#', 1)[0]
        if not target or '://' in target or target.startswith('mailto:'):
            continue
        if not (path.parent / target).exists():
            bad.append((path, target))
if bad:
    for path, target in bad:
        print(f'{path} -> {target}')
    sys.exit(1)
print('Markdown local links OK')
PY
```

Search for stale URLs and placeholders:

```bash
rg -n "TODO|\\[TODO|github.com" .
```

## Pull request checklist

Before submitting a change:

- Run `bash scripts/validate.sh` and confirm it exits zero.
- Validate `gemini-extension.json`, `.claude-plugin/plugin.json`, and
  `.claude-plugin/marketplace.json`.
- Confirm no skill directory was added at the repository root.
- Check Markdown local links.
- Check that docs and README agree on installation commands.
- Confirm all GitHub repository links use
  `https://github.com/Garyson26/Trident-SecOps-Skills`.
- Confirm cyber security content stays within authorized, defensive,
  educational, or lab-scoped boundaries.


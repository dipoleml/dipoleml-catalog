# Personal Voice Capture

> Teach an AI agent to write like *you* — not from a one-off prompt, but from your own writing and your own edits.

Every agent I use writes the same way. Competent, fluent, and unmistakably not me. I bet yours do too.

**Personal Voice Capture** is a Claude Code meta-skill that compiles your real writing into a durable, reusable *voice skill*. Run one short calibration session: the agent reads your samples, tests what it learned against your edits, and writes a `SKILL.md` that any future agent loads to draft or rewrite in your voice — chat, email, memos, public posts. You stop re-explaining "make it sound more like me" every time.

It captures **how you express things, not what you believe**. A voice skill rewrites the intent *you* give it. It doesn't decide what you think.

## Why

Generic AI prose is recognizable, and it's flat. The usual fix — paste a few examples, hope for the best — doesn't compound. The next session starts from zero.

So treat your voice as something to compile from evidence, not guess from a prompt:

```
your writing samples  +  generated probes  +  your edits
        →  voice rules + approved examples  →  a reusable SKILL.md
```

The output is portable. Build it once, then load it from any agent, in any project.

## How it works

The meta-skill runs an interactive calibration loop:

1. **Scope & consent** — whose voice, which languages, which contexts (DM, email, memo, post…), and where the output skill lives.
2. **Ingest** — you hand it writing samples: pasted, files, or exports you authorize.
3. **Draft a voice model** — a first hypothesis covering cadence, diction, structure, warmth, and context-specific habits.
4. **Calibrate** — the agent shows you generic-vs-personalized rewrites in an editable file. You edit them inline.
5. **Diff into rules** — your edits become small, testable voice rules: add, strengthen, weaken, delete, or split by context.
6. **Consolidate** — every few rounds the model gets rewritten and re-tested.
7. **Emit a voice skill** — once the voice stabilizes, it generates a `<your-name>-voice` skill (e.g. `eran-voice`) you keep using.

It's not a style preset. It's your voice, compiled from your own edits.

## See the difference

Same intent, two voices. The first is what an agent writes by default. The second is the same paragraph after a voice skill is loaded (here, the author's own).

**Generic:**

> In today's fast-paced environment, it's more important than ever to ship quickly. Building a small prototype over a weekend can help validate an idea before investing significant resources. We encourage everyone to experiment and learn by doing.

**In voice:**

> People keep waiting for permission to build.
>
> You can just build things now.
>
> I shipped a working prototype over a weekend, by myself. Two days gave me the answer a quarter of planning kept circling: whether the idea was real.
>
> Build the small thing. Let it argue back.

The meaning didn't move — only the expression did.

## Install

### As a Claude Code plugin (recommended)

```
/plugin marketplace add eranshir/personal-voice-capture
/plugin install personal-voice-capture@personal-voice-capture
```

Then invoke it in any session with `/personal-voice-capture:personal-voice-capture`, or just tell Claude to "capture my voice."

### As a standalone skill

Copy the skill directory into your skills folder:

```bash
git clone https://github.com/eranshir/personal-voice-capture.git
cp -r personal-voice-capture/skills/personal-voice-capture ~/.claude/skills/
```

It's then available as `/personal-voice-capture`.

## Usage

Start a session and say something like:

- "Capture my voice."
- "Learn how I write and build my voice skill."
- "Make future agents write like me."

Want to sharpen an existing voice skill later? Correct a draft:

- "That doesn't sound like me — update the voice skill."

The agent runs a calibration round, diffs your edits into rules, and patches the skill.

## What you get

A real `SKILL.md` named `<person-slug>-voice` that holds:

- a high-level voice signature and per-context modes,
- diction and cadence rules with a phrasebank,
- your own approved before/after examples,
- a transformation workflow and quality checklist,
- a hard rule that preserves your supplied intent and never fabricates your beliefs.

## Privacy

Privacy is the default here, not a setting you go find:

- **Raw source text isn't retained** unless you ask for it. The skill keeps derived rules and the examples you approve — nothing else.
- Calibration files are written to a **gitignored scratch path** (`.scratch/`), so source material never lands in version control by accident.
- The generated voice skill encodes *style*, not private content.

## Repository layout

```text
.claude-plugin/plugin.json               # Plugin manifest
.claude-plugin/marketplace.json          # Marketplace catalog (install via /plugin marketplace add)
skills/personal-voice-capture/SKILL.md   # The meta-skill
templates/generated-voice-skill.md       # Template for the per-person output skill
examples/calibration-round.md            # Example calibration interaction
docs/design-notes.md                     # Design rationale and storage policy
scripts/validate_skill.py                # Lightweight SKILL.md frontmatter validator
```

## Development

Validate the skill frontmatter:

```bash
python3 scripts/validate_skill.py
```

If you have the Claude Code CLI, validate the plugin and marketplace manifests too:

```bash
claude plugin validate .
```

## Contributing

Issues and pull requests welcome. Good first contributions: more calibration example templates, new context modes, and language-specific voice-capture guidance.

## License

[MIT](LICENSE) © Eran Shir

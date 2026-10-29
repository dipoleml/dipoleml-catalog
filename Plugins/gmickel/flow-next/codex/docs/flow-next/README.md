# Flow-Next docs

> **Codex install note:** when YOU run a flow-next command on THIS Codex install, invoke it as `$flow-next-<name>` (or pick it from the skills dropdown) wherever this page writes `/flow-next:<name>` — and when the written name itself already starts with `flow-next-` (e.g. `/flow-next:flow-next-drive`), the prefix is not doubled: invoke `$flow-next-drive`. Passages describing OTHER hosts (Claude Code `claude -p` / `/loop` examples, Grok, Cursor, OpenCode sections) document those hosts' own syntax and are quoted verbatim — do not convert them.


The canonical user documentation is [flow-next.dev](https://flow-next.dev). Read it for the introduction, [choosing your route](https://flow-next.dev/choosing-your-route/), [autonomy](https://flow-next.dev/autonomy/going-autonomous/), [teams](https://flow-next.dev/guides/for-teams/), [model routing](https://flow-next.dev/guides/model-routing/), [review backends](https://flow-next.dev/reference/review-backends/), [configuration](https://flow-next.dev/flowctl/configuration/), the [skills catalog](https://flow-next.dev/skills/), the [glossary](https://flow-next.dev/reference/glossary/), and the [changelog](https://flow-next.dev/releases/changelog/).

The pages below ship with the plugin because skills, agents, and templates read them at runtime. Codex installs carry a copy under `docs/flow-next/`.

## Runtime reference

| Doc | Covers |
|---|---|
| [`prose.md`](prose.md) | How to write any artifact prose: PR bodies, specs, comments, memory entries, changelog lines |
| [`flowctl.md`](flowctl.md) | The `flowctl` CLI: every command, flag, and default |
| [`orchestration.md`](orchestration.md) | Which model does what: tiers, reach, and how to change them |
| [`reach/README.md`](reach/README.md) and the per-harness pages | How each host reaches a model tier; [`reach/codex.md`](reach/codex.md) and [`reach/cursor.md`](reach/cursor.md) cover their hosts |
| [`read-back.md`](read-back.md) | The review shape refine, plan, and capture use before writing to `.flow/` |
| [`pipeline-variations.md`](pipeline-variations.md) | Worked routes through the stages, chosen by risk and unknowns |
| [`skills.md`](skills.md) | Every shipped skill in one table, and the backend-split heuristic |
| [`tracker-sync.md`](tracker-sync.md) | Projecting specs to Linear, GitHub, GitLab, or Jira |
| [`memory-schema.md`](memory-schema.md) | The `.flow/memory/` entry schema, tracks, and categories |
| [`pr-cognitive-aid.md`](pr-cognitive-aid.md) | The stored PR walkthrough and its rendered briefing |
| [`review-findings.md`](review-findings.md) | The structured review findings contract |
| [`judge.md`](judge.md) | Optional Jev judgment: presets and API key handling |
| [`running-lean.md`](running-lean.md) | What each optional layer costs and how to run without it |
| [`spec-template.md`](spec-template.md) | Spec scaffold rules and auxiliary sections |
| [`teams.md`](teams.md) | Several humans and agents sharing one repo |
| [`architecture.md`](architecture.md) | The `.flow/` layout and review bookkeeping |
| [`platforms.md`](platforms.md) | Supported hosts and per-platform install notes |
| [`troubleshooting.md`](troubleshooting.md) | Landing upgrades, manual chain recovery, bug reports |
| [`glossary.md`](glossary.md) | Your repo-root `GLOSSARY.md`: shape, resolution, and `flowctl glossary` |
| [`ci-workflow-example.yml`](https://github.com/gmickel/flow-next/blob/main/plugins/flow-next/docs/ci-workflow-example.yml) | A drop-in `flowctl validate --all` CI job |

Skill prose lives beside each skill under `../skills/`. The flow conductor is [`flow-next-flow/SKILL.md`](../../skills/flow-next-flow/SKILL.md) (`/flow-next:flow --explain` prints a route without running it), and the optional chart stage is [`flow-next-chart/SKILL.md`](../../skills/flow-next-chart/SKILL.md).

## See also

- [`../README.md`](https://github.com/gmickel/flow-next/blob/main/plugins/flow-next/README.md) - plugin overview.
- [Contributing](https://github.com/gmickel/flow-next/blob/main/CONTRIBUTING.md) - how to contribute to Flow-Next.

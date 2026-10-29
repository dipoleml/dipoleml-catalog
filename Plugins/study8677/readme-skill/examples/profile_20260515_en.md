# JingWen Fan · AI-Native Developer Profile
> Generated from local Claude Code + Codex data from 2025-05-21 to 2026-05-15 · 2026-05-15T18:48:52+08:00
> _Personal philosophy: decompose complex problems into irreducible facts or constraints, then reason only from those undeniable ground truths rather than experience, analogy, or inherited conclusions._

---

## At a glance

- Across **149** active days: **605** Claude sessions + **1569** Codex threads, with **177,932** Claude messages
- Daily output: **7.5** local commits / **4,171** lines of churn / **6.8** GitHub contributions
- Active across **31** local candidate repos and **15+** languages / file formats
- Same-period GitHub: **823** commits / **85** PRs / **35** issues / **1018** total contributions
- AI input: **429.9M** Claude paid/new tokens + **8.73B** Codex tokens; **10.22B** Claude cache-read tokens reused (**96.0%** of Claude I/O)
- Main tools: Claude Code (Opus 4.6 / Opus 4.7 / Sonnet 4.6 / Haiku 4.5) + Codex CLI (GPT-5.4 / GPT-5.5)

## 🚀 Velocity & Leverage — AI gives one person small-team delivery capacity

The strongest signal is not a single spike. It is sustained parallel delivery: 31 local repos, 1111 local commits, and more than 620K lines of churn across 149 active days.

| Metric | Value | Notes |
| --- | ---: | --- |
| Daily commits | 7.5 | 1111 local commits / 149 active days |
| Daily code churn | 4,171 lines | (528,556 additions + 92,859 deletions) / active days |
| Active repos | 31 | Candidate repos with commits by the current git author |
| Cross-stack languages | 15+ | Python / TypeScript / Rust / Go / Shell / Markdown / SQL etc. |
| GitHub burst | 2026-04-02 to 2026-04-04 | 52 / 66 / 33 contributions over three consecutive days |
| Open-source reach | 1,503 stars | 30 starred public repos |

## 🤖 AI-Native practice

> This is not occasional AI usage. It is a working system built from multi-model orchestration, planning, reasoning-effort control, skills, and local data loops.

### Multi-model orchestration

| Model | sessions / threads | spent / used tokens | cache-read | Typical role |
| --- | ---: | ---: | ---: | --- |
| GPT-5.4 (Codex) | 752 threads | 4.12B | - | Large codebase edits, validation, second execution lane |
| GPT-5.5 (Codex) | 645 threads | 3.60B | - | New complex tasks, long execution chains, publishing |
| Claude Opus 4.6 | - | 308.9M | 7.79B | Deep reasoning, complex planning, long-context work |
| Claude Opus 4.7 | - | 83.3M | 1.82B | High-intensity exploration during model migration |
| Claude Haiku 4.5 | - | 25.4M | 250.6M | Fast assistance and low-cost routing |
| Claude Sonnet 4.6 | - | 12.3M | 357.8M | Medium-complexity iteration |

### Power-feature usage

- **Reasoning effort control**: `/effort` used **986** times; 486 Claude history sessions include effort changes
- **Plan-mode**: `/plan` used **94** times; 37 sessions started with `/plan`
- **Skills**: **13** Claude skills + **15** Codex skills
- **Plans / Tasks / Todos**: **16** plans, **234** tasks, **6** todos
- **Hooks / Automations / Rules**: **1** Claude hook, **2** Codex automations, **1** Codex rule

### Prompt caching maturity

Claude paid/new tokens total **429.9M**, while cache-read totals **10.22B**. Every new Claude token pulls roughly **23.8** cached tokens back into play; cache-read is **96.0%** of Claude I/O.

### Reasoning effort preference

Codex threads are strongly biased toward deep reasoning: `xhigh` **1236** (**78.8%**) · `medium` **96** · `high` **75** · `low` **14** · `unspecified` **148**.

## 🔧 AI infrastructure — not just using AI, but building tooling for AI

> The durable signal is workflow productization: skills, automations, deployment checks, document tools, and collaboration protocols are all being turned into reusable AI infrastructure.

### Self-built skills (redacted shareable view)

| Name | Type | One-line description | Tool |
| --- | --- | --- | --- |
| Skill α | Deploy / DevOps | Multi-service commit, build, deploy, and validation flow | Claude |
| Skill β | Integrator | Integration health checks and service patrols | Claude |
| Skill γ | Agent Team | Multi-agent team bootstrap via Agent Mailer Protocol | Claude |
| Skill δ | Server Ops | Controlled dev/prod server checks and execution | Claude / Codex |
| Skill ε | Usage Audit | Subscription and LLM cost spike investigation | Codex |

### Installed skills

| Name | Description | Tool |
| --- | --- | --- |
| docx / pdf / pptx / xlsx | Documents, PDFs, decks, and spreadsheets | Claude / Codex |
| playwright / chronicle | Browser automation and screen-context assistance | Codex |
| follow-builders / redbook | Content monitoring, industry signals, social research | Claude |
| self-improving | Self-review and long-term memory maintenance | Claude |

### Other infrastructure

- Claude settings include **1** hook; Codex has **2** automations and **1** rule
- Codex CLI evolved from 0.77.0 to 0.131.0-alpha.9
- Local Markdown churn reached **113K** lines, meaning protocols, plans, docs, and AI-collaboration structures are real output, not side notes

## 🛠️ AI collaboration style

### Top slash commands

| # | Command | Count | Meaning |
| --- | --- | ---: | --- |
| 1 | `/effort` | 986 | Adjust reasoning depth by task phase |
| 2 | `/usage` | 127 | Watch consumption, limits, and account state |
| 3 | `/plan` | 94 | Plan before execution |
| 4 | `/resume` | 79 | Continue long-running work across sessions |
| 5 | `/clear` | 61 | Reset context deliberately |
| 6 | `/btw` | 60 | Insert side tasks or follow-up context |
| 7 | `/compact` | 28 | Compress context to extend task continuity |
| 8 | `/rate-limit-options` | 21 | Manage rate-limit strategy |
| 9 | `/vibe-forge` | 20 | Invoke a custom / installed workflow |
| 10 | `/plugin` | 20 | Manage plugins and extended capabilities |

### Session architecture

- Typical pattern: raise reasoning depth with `/effort`, plan or execute, manage context with `/compact` / `/clear`, then continue through `/resume` when needed.
- **5.8%** of Claude history sessions start with `/plan`; **12.5%** use `/compact` or `/clear`; **12.0%** use `/resume`.
- Average Claude session depth is **294** messages. The longest session spans **172.9** hours and **1444** messages, which is a multi-day execution chain rather than a chat.

## 📂 Projects & domains

The project map shows a clear orchestration pattern: Codex carries a lot of execution density, while Claude acts as long-context coordination and workflow structure.

| Domain | Projects | Signal |
| --- | ---: | --- |
| Product / backend | 4 | Services, monitoring, users, CLI, dashboards |
| AI tooling / skills | 3 | Agents, plugins, workspace templates, workflows |
| Data / analytics | 2 | User research, industry data, content analysis |
| Open-source / devtools | 2 | Frameworks, templates, agent protocols |
| Docs / Markdown | 1 | README, profile, poster distribution |

### Top projects (redacted)

| Project | Claude | Codex | Git commits | Orchestration | Domain |
| --- | ---: | ---: | ---: | --- | --- |
| Project A | 5 | 457 | 0 | Codex-led | Content / data engineering |
| Project B | 105 | 223 | 322 | Dual-engine | Product / backend |
| Project C | 16 | 114 | 330 | Codex-led | AI product / Python |
| Project D | 7 | 133 | 0 | Codex-led | Data / analytics |
| Project E | 28 | 58 | 147 | Dual-engine | AI tooling / template |
| Project F | 31 | 78 | 7 | Codex-led | CLI / toolchain |
| Project G | 0 | 28 | 0 | Codex-led | Platform integration |
| Project H | 0 | 25 | 37 | Codex-led | User research / analytics |
| Project I | 0 | 22 | 23 | Codex-led | Monitoring / ops |
| Project J | 0 | 20 | 21 | Codex-led | AI collaboration tooling |
| Project K | 13 | 16 | 15 | Dual-engine | User service |
| Project L | 5 | 15 | 15 | Dual-engine | Product backend |

Orchestration summary: **4** dual-engine projects · **0** Claude-led projects · **8** Codex-led projects.

## 🧬 Evolution curve — AI usage is maturing

```text
2026-01  Codex starts with CLI 0.77.0 / 0.80.0
2026-02  Codex becomes routine; early/unknown models reach 191M tokens
2026-03  Claude Code joins; planning and effort controls become visible
2026-04  Dual-tool execution matures; GPT-5.4 reaches 3.89B monthly tokens
2026-05  GPT-5.5 takes over the main Codex lane
```

| Month | Claude sessions | Codex threads | Milestone |
| --- | ---: | ---: | --- |
| 2026-01 | 0 | 29 | Codex CLI starts |
| 2026-02 | 0 | 22 | Early versions become routine |
| 2026-03 | 261 | 109 | Claude Code joins; planning / effort increase |
| 2026-04 | 282 | 946 | GPT-5.4 execution peak and GitHub burst |
| 2026-05 | 62 | 463 | GPT-5.5 migration and continued high frequency |

## 💡 Topics & keywords

> **agent** · **codex** · **claude** · **skills** · **workflow** · **deploy** · **monitor** · **api** · **tests** · **data** · **analytics** · **python** · **typescript** · **rust** · **github** · **docs** · **plugin** · **dashboard** · **usage** · **review**

The common thread is system-building: deployment, monitoring, data, docs, review, cost, and team workflows are all part of the AI loop.

## ⏱️ Working rhythm

Peak work happens from **16:00-20:00**, but 00:00-01:00 still has substantial activity. This is not a traditional single-peak schedule; it is an afternoon-to-night execution band with late-night continuation.

- First / latest activity: **2025-05-21** / **2026-05-15**
- Active days: **149**; longest streak: **67** days
- Claude peak day: **2026-03-18**, 12,301 messages
- GitHub peak day: **2026-04-03**, 66 contributions

## 💎 Token economics

> **9.16B** paid / metered tokens pulled **10.22B** Claude cache-read tokens through the system. Total token-through is **19.38B**; Claude cache leverage is **1 : 23.8**.

| Model | spent / used | cache-read | leverage | Share of new tokens |
| --- | ---: | ---: | ---: | ---: |
| GPT-5.4 (Codex) | 4.12B | - | - | 45.0% |
| GPT-5.5 (Codex) | 3.60B | - | - | 39.3% |
| Codex unspecified | 727.9M | - | - | 7.9% |
| Claude Opus 4.6 | 308.9M | 7.79B | 25.2x | 3.4% |
| GPT-5.4-mini (Codex) | 265.0M | - | - | 2.9% |
| Claude Opus 4.7 | 83.3M | 1.82B | 21.9x | 0.9% |
| Claude Haiku 4.5 | 25.4M | 250.6M | 9.9x | 0.3% |
| Claude Sonnet 4.6 | 12.3M | 357.8M | 29.1x | 0.1% |

### Model migration notes

- 2026-04: Codex GPT-5.4 is the main execution model with **3.89B** monthly tokens.
- 2026-05: GPT-5.5 takes over with **1.66B** monthly tokens, while GPT-5.4 drops to **1.65M**.
- Claude Opus 4.6 carries the largest cache-read load; Sonnet 4.6 has the highest leverage despite lower spent tokens.

## 💰 Output & input

### Same-period GitHub output

- Total 365-day contributions: **1018** = **823** commits / **85** PRs / **35** issues / **2** reviews
- Owned repos: **78**; all-time PR records: **144**; all-time issue records: **43**
- Top contribution days: 2026-04-03 (**66**) / 2026-04-02 (**52**) / 2026-04-29 (**45**) / 2026-03-29 (**44**) / 2026-04-28 (**35**)

#### Top GitHub repositories

| Repository | Language | Commits | Stars |
| --- | --- | ---: | ---: |
| `study8677/OpenCMO` | Python | 325 | 76 |
| `study8677/antigravity-workspace-template` | Python | 158 | 1217 |
| `study8677/vibe-forge` | Rust | 38 | 15 |
| `study8677/ReadYourUsers` | TypeScript | 37 | 9 |
| `stelee410/agent-mailer` | Python | 36 | 10 |
| `study8677/Readme.skill` | - | 17 | 85 |

### Main languages

| Source | Top languages / formats |
| --- | --- |
| GitHub language bytes | Python 6.54M · TypeScript 2.53M · Jupyter 1.26M · Rust 819K · JavaScript 455K |
| Local git churn | Python 194K · Markdown 113K · JSON 108K · TSX 61K · TypeScript 50K · Go 22K · Rust 16K |

Markdown and JSON churn are high enough to matter: protocols, plans, docs, config, and collaboration structure are core output.

## 📊 Data sources & privacy commitment

- Data is local: `~/.claude/*` + `~/.codex/*` + local `git log` + GitHub via `gh`
- Conversation bodies were used only for statistics and abstraction; raw text is not copied into this report
- Project names are anonymized as Project A/B/C; private paths and absolute paths are not listed in the project table
- API keys / tokens / webhooks / emails are scrubbed by regex; this report contains no secrets or email addresses
- Generated by Readme.skill v2.4.0 and reproducible
- Generated at: **2026-05-15T18:48:52+08:00**

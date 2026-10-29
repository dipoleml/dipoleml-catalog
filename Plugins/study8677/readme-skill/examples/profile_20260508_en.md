# JingWen Fan · AI-Native Developer Profile

> Auto-generated from **128 days** (2026-01-01 → 2026-05-08) of local Claude Code + Codex conversation data · 2026-05-08
> _Personal philosophy: break complex problems down to irreducible basic facts or constraints; reason only from those "undeniable bottom-layer truths" — never lean on experience, analogy, or prior conclusions._

---

## At a glance

- **522** Claude sessions + **1,165** Codex threads in **128** days, **144,116+** messages, **87** active days (68%), longest streak **56** days
- Daily output: **9.5** commits / **4,759** LOC churn / **11.1** GitHub contributions (denominator = 87 active days)
- **15** active local repos · **15** programming languages running concurrently
- Same-window GitHub: **773** commits / **84** PRs / **34** issues / **966** total contributions / **72** new repos
- AI investment: **286M** Claude spent tokens + **7.36B** Codex tokens; **6.64B** Claude cache reuse (cache leverage **23.2×**)
- Primary tools: Claude Code (Opus 4.6 / 4.7 + Sonnet 4.6 + Haiku 4.5) + Codex CLI (GPT-5.4 / 5.5 / mini, across 7 model versions and 44 CLI versions)

## 🚀 Velocity & Leverage — AI gives one person small-team delivery capability

> 87 active days, 15 repos, 15 languages, ~9.5 commits/day, ~4.7K LOC/day, **14.3B tokens through** —— this kind of cross-stack breadth and delivery density only becomes realistic when you treat **Claude + Codex as two coworkers who never sleep**.

| Metric | Value | Note |
| --- | ---: | --- |
| Commits / day | 9.5 | 827 commits / 87 active days |
| LOC churn / day | 4,759 | (335,295 add + 78,778 del) / 87 |
| Concurrent repos | 15 | Repos with at least one commit in the past year |
| Cross-stack langs | 15 | Python · TypeScript · Jupyter · Rust · JavaScript · HTML · CSS · PLpgSQL · Go · Shell · Vue · Makefile · Batch · Dockerfile · PowerShell |
| GitHub burst windows | 2026-03-17 / 03-18 / 03-24 / 04-01 / 03-19 | Streaks where daily prompts > 195 |
| Open-source impact | **1,421 stars** | Across 30 starred repos; top: antigravity-workspace-template 1,211★ |
| Repos created in 365d | 72 | One new repo every ~5 days |

## 🤖 AI-Native practice

> Not "occasionally ask the AI". Every number below is real "AI operation fluency" earned over the past four months.

### Multi-model orchestration

| Model | sessions / threads | spent tokens | cache-read | Use bias |
| --- | ---: | ---: | ---: | --- |
| Claude Opus 4.6 | majority (~90% spent) | 256.7M | 6.09B | Deep reasoning / large refactors / skill design |
| Claude Sonnet 4.6 | subset, fast iteration | 11.8M | 356.5M | Mid-size tasks / batch edits |
| Claude Haiku 4.5 | subset | 16.5M | 150.9M | Subtasks / heavy tool-call loops |
| Claude Opus 4.7 (1M) | new exploration | 1.2M | 43.7M | Long context / cross-file analysis |
| Codex GPT-5.4 | 741 threads | 4.09B | — | Primary execution engine (xhigh effort 80%+) |
| Codex GPT-5.5 | 260 threads | 2.22B | — | Took over starting in April; primary by May |
| Codex GPT-5.4-mini | 17 threads | 265M | — | Light tasks / control runs |
| Codex GPT-5.3-codex / spark / 5.2 / unknown | 147 threads | 786M | — | Earlier versions / historical experiments |

### Power features in deep use
- **Plan-mode**: **92** invocations (`/plan`) — used at key decision points before doing
- **Effort tuning**: **778** invocations (`/effort`) — one effort switch every 1.9 prompts on average; the absolute core action
- **Skills**: **30** total (Claude 15 + Codex 15); **~11** self-built
- **Plans**: 13; **Tasks**: 36
- **Hooks**: 1 (system notification)
- **Codex automations**: 1; **rules**: 1 set (default rules)

### Prompt-caching fluency
- Claude side: every **1** new token leverages **23.2** cache tokens
- Cache-read accounts for **95.9%** of total Claude I/O — Anthropic prompt-caching pushed close to its ceiling

### Reasoning-effort preference (Codex side)
xhigh **940** (**80.7%**) · high **51** (4.4%) · medium **30** (2.6%) · low **3** (0.3%) · unspecified **141** (12.1%)

> One-line read: **almost always picks the most expensive reasoning depth — quality is more sensitive than cost**.

## 🔧 AI infrastructure — not just using AI, but building tooling for AI

> From multi-agent mailbox protocols, to push/health-check pipelines, to content-collection and social-publishing pipelines — this is someone who **actively builds infrastructure for AI workflows**, not someone who "uses AI to write code".

### Self-built skills (anonymized — only category preserved)
| # | Type | Description (one line) | Platform |
| --- | --- | --- | --- |
| Skill α | Coordination | Multi-agent mailbox watcher (start-shift / end-shift semantics + scheduled poll) | Claude + Codex |
| Skill β | Coordination | One-shot multi-agent team registration + launcher | Claude |
| Skill γ | DevOps | Push + remote pull + atomic deploy for a private project | Claude |
| Skill δ | DevOps | Service integration health check / patrol script | Claude |
| Skill ε / ζ | DevOps | Run pre-vetted commands on remote machines via cloud-vendor command channel (dev / prod variants) | Claude / Codex |
| Skill η | Network | SSH SOCKS5 + isolated browser shell (specific egress IP scenarios) | Claude / Codex |
| Skill θ | Content | Cross-platform builder content digest (X / YouTube) | Claude |
| Skill ι | Content | Mainstream-social-platform content automation (search / read / analyze / publish) | Claude |
| Skill κ | Automation | URL watcher → IM webhook + GitHub Issue 3-piece generator | Codex |
| Skill λ | Multimodal | Video-generation task orchestration + local job queue | Codex |
| Skill μ | Context | Desktop screen-recording playback context (screen memory → second-pass questions) | Codex |

### Installed skills (selection · public ecosystem)
| Name | Description | Platform |
| --- | --- | --- |
| `skill-creator` | Meta skill: build new skills / run evals / optimize description | Claude |
| `antigravity:*` | Multi-agent repo scaffolding + knowledge base refresh + Q&A | Claude |
| `codex:rescue / setup / runtime / prompting` | Codex coordination 3-piece (rescue / setup / prompt engineering) | Claude |
| `docx · pptx · xlsx · pdf · pdf-reading` | Document handling standards | Claude + Codex |
| `playwright` | Drive a real browser from the terminal | Codex |
| `self-improving` | Failure / correction / learning / memory organization | Claude |

### Other infrastructure
- Hooks: **1** (system notification)
- Codex automations: **1** (an internal bug-tracking flow)
- Codex rules: **1** set (default rules)
- Enabled plugin marketplaces: **3** (incl. official + 1 self-owned)
- Enabled plugins: **4** (skill-creator / rust-analyzer-lsp / codex / antigravity)

## 🛠️ AI collaboration style

### Top 10 slash commands
| # | Command | Count | Meaning |
| --- | --- | ---: | --- |
| 1 | `/effort` | 778 | Switch reasoning depth (absolute core) |
| 2 | `/usage` | 126 | Check token usage and rate limits |
| 3 | `/plan` | 92 | Enter plan-mode to plan first |
| 4 | `/resume` | 71 | Resume historical session |
| 5 | `/btw` | 60 | Side-context inject (custom) |
| 6 | `/clear` | 53 | Clear current conversation |
| 7 | `/compact` | 27 | Compact context, keep going |
| 8 | `/vibe-forge` | 20 | Sync current project to a self-built skill collection |
| 9 | `/init` | 20 | Initialize CLAUDE.md |
| 10 | `/plugin` | 19 | Plugin marketplace / install management |

### Session architecture
- Typical flow: **`/effort` to set depth → execute directly → `/compact` or `/clear` mid-session as needed** (not plan-first)
- **72.4%** of sessions used `/effort` at some point ("less than 1/3 run on default depth")
- **73.0%** of sessions start with `/effort` (set depth first thing)
- **13.4%** of sessions used `/compact` or `/clear` (active context management)
- `/plan`-first only **0.4%** — this is an **effort-first** developer, not plan-first
- Avg session depth: **325** messages / session (stats-cache scope)
- Longest session: **1,444** messages / **7.2** days (one marathon-grade deep iteration)
- Plan-to-direct ratio: 92 / 3,904 = **2.4%** (plan used as a "key-checkpoint tool", not a default entry)

## 📂 Projects & domains

Active across **30+** projects (composite score ≥ 10), domain distribution:

| Domain | Count (within Top 12) |
| --- | ---: |
| AI tools / Skills / Agents | 6 |
| Data / Analytics | 2 |
| Infrastructure / Deploy | 2 |
| Product / Backend | 2 |

### Top 12 projects (anonymized, sorted by composite score; score = sessions×5 + threads×4 + commits)
| Project | Claude sessions | Codex threads | Git commits | Orchestration | Domain |
| --- | ---: | ---: | ---: | --- | --- |
| Project A | 5 | 457 | 0 | Codex-led | AI tool / Skill |
| Project B | 14 | 63 | 318 | Codex-led | AI tool / Skill |
| Project C | 24 | 67 | 193 | Codex-led | Infra / Deploy |
| Project D | 9 | 133 | 0 | Codex-led | Data / Analytics |
| Project E | 16 | 56 | 142 | Codex-led | AI tool / Skill |
| Project F | 14 | 16 | 15 | Two-engine | Product / Backend |
| Project G | 0 | 25 | 37 | Codex-led | Data / Analytics |
| Project H | 5 | 22 | 23 | Codex-led | Infra / Deploy |
| Project I | 14 | 7 | 22 | Two-engine | AI tool / Skill |
| Project J | 0 | 28 | 0 | Codex-led | AI tool / Skill |
| Project K | 0 | 20 | 21 | Codex-led | AI tool / Skill |
| Project L | 5 | 15 | 15 | Codex-led | Product / Backend |

**Orchestration counts**: Two-engine **2** · Codex-led **10** · Claude-led **0**

> Implicit signal: **think / compute / design with Claude; run volume with Codex**. Codex thread count far exceeds Claude session count (1,165 vs 522), but Claude's "325 messages / session avg" carries the overall message volume — they **divide labor, not substitute**.

## 🧬 Evolution curve — AI usage is maturing

```
2026-01    Codex starts · 29 threads · 38.6M tokens · CLI 0.77.0 → 0.81.0-alpha
2026-02    Daily-ization · 23 threads / 251.5M tokens · Claude Code introduced (first /clear · /resume · /skill-creator)
2026-03    Claude Code as primary battle station · 109 Codex threads + many Claude sessions
            · 03-09 first /plan · 03-12 first /compact · 03-13 first /ssh-prod · 03-17 first /effort · 03-22 first /review · 03-23 first /loop
2026-04    Two-engine peak · 945 Codex threads (+767%) · 6.10B Codex tokens
            · 04-02 first /plugin · 04-07 first /vibe-forge (self-built skill in production) · 04-20 first /follow-builders
2026-05    New-protocol era · 59 Codex threads (through 5/8) · self-built multi-agent mail protocol (start-shift / team-up skills) shipped early May
```

### Monthly activity trend
| Month | Claude sessions (≈) | Codex threads | Dominant Codex model | Milestone |
| --- | ---: | ---: | --- | --- |
| 2026-01 | — | 29 | (unlabeled) | Codex starts |
| 2026-02 | exploration | 23 | (unlabeled) | First Claude Code touch |
| 2026-03 | ≈ 250+ | 109 | gpt-5.4 (43) | Claude /plan /effort /compact muscle memory in place |
| 2026-04 | ≈ 200+ | **945** | gpt-5.4 (694) → gpt-5.5 (205) | Two-engine, ~10 commits/day, self-built skills go to production |
| 2026-05 (through 5/8) | ongoing | 59 | gpt-5.5 (55) | Self-built multi-agent mail protocol in production |

## 💡 Topics & keywords

> **agent · claude · codex · llm · plugin · cli · skill · python · github · service · router · redis · queue · promptfoo · context** · module · data · invoke · graph · path · service · config · repo · channel · detect

(top 25, stop-words filtered; ordered by frequency)

## ⏱️ Working rhythm

### 24h activity heatmap (Claude history + Codex threads merged)
```
00 |▮▮             16
01 |▮              14+2 codex
02 |▮              6+10
03 |               1+60
04 |▮▮▮▮          77 codex
05 |▮▮▮            51
06 |▮▮▮▮          69
07 |▮▮▮            60
08 |▮▮▮▮▮          73
09 |▮▮▮▮▮▮         97
10 |▮▮▮▮▮▮▮▮▮     156 (Claude 10 + Codex 146)
11 |▮▮▮▮▮▮▮▮▮     142 (Claude 46 + Codex 96)
12 |▮▮▮▮▮▮▮▮      125
13 |▮▮▮▮▮          82
14 |▮▮▮▮           69
15 |▮▮▮▮▮          89
16 |▮▮▮▮▮▮         97
17 |▮▮▮▮▮▮▮▮      121 (Claude 26 + Codex 95)
18 |▮▮             33
19 |▮▮▮            36 (Claude only)
20 |▮▮▮            33
21 |▮▮▮            35
22 |▮              24
23 |▮              24
```

**Read of the rhythm**:
- Bimodal: **morning 10-12 (Codex prime time)** + **17:00 Codex closing peak** + **evening 19-21 (Claude thinking time)**
- Codex still moving 03-05 AM (mostly scheduled automations / long batch jobs)
- 19-23 Claude beats Codex → "think with Claude, output with Codex" time-of-day division of labor

### Time span
- First / latest active: **2026-01-01 → 2026-05-08** (128-day window)
- Active days / longest streak / single-day prompt peak: **87 days / 56 days / 303 prompts (2026-03-18)**
- Single-day message peak: **12,301 (2026-03-18, stats-cache)**
- Longest session: 1,444 messages / 7.2 days (one extended marathon)

## 💎 Token economics

> **7.65B spent tokens** leverage **6.64B cache reuse**, ratio (Claude scope) **1 : 23.2**; total tokens through these hands: **14.28B**. That's about **10 billion English words ≈ writing *War & Peace* roughly 18,000 times**.

### Per-model token detail (sorted by spent)
| Model | spent | cache-read | leverage | % of total spent |
| --- | ---: | ---: | ---: | ---: |
| Codex GPT-5.4 | ~4.09B | — | — | 53.5% |
| Codex GPT-5.5 | ~2.22B | — | — | 29.0% |
| Codex (other / unlabeled) | ~1.05B | — | — | 13.7% |
| Claude Opus 4.6 | 256.7M | 6.09B | **23.7×** | 3.4% |
| Claude Haiku 4.5 | 16.5M | 150.9M | 9.2× | 0.22% |
| Claude Sonnet 4.6 | 11.8M | 356.5M | **30.2×** | 0.15% |
| Claude Opus 4.7 (1M) | 1.2M | 43.7M | **35.8×** | 0.02% |

> Note: Sonnet 4.6 and Opus 4.7 leverage exceeds 30× — these models run **almost entirely in cache-hit mode** (build context with Opus 4.6 first, then keep asking the cheaper model).

### Monthly token trend (Codex scope)
| Month | Codex threads | Codex tokens | Dominant model | Note |
| --- | ---: | ---: | --- | --- |
| 2026-01 | 29 | 38.6M | (unlabeled) | Bootstrap |
| 2026-02 | 23 | 251.5M | (unlabeled) | tokens ↑ 6.5× (daily-ization begins) |
| 2026-03 | 109 | 681.5M | gpt-5.4 + unknown | threads ↑ 4.7×; new model GPT-5.4 onboarded |
| 2026-04 | **945** | **6.10B** | gpt-5.4 (694) → gpt-5.5 (205) | **threads ↑ 8.7× / tokens ↑ 8.9×**; monthly peak |
| 2026-05* | 59 | 284.2M | gpt-5.5 (55) + gpt-5.4 (4) | gpt-5.4 contracts ↓98%, gpt-5.5 takes over (*through 5/8) |

### Model migration notes
- **2026-03 → 04**: Codex GPT-5.4 truly becomes primary (694 threads / 3.88B), unknown label tails off
- **2026-04 → 05**: GPT-5.4 → GPT-5.5 takeover is clearly visible (by 5/8 GPT-5.4 only 4 threads / 1.65M, GPT-5.5 already 55 threads / 282.5M)
- **Claude side**: Opus 4.6 always primary (3.4% spent but 23.7× leverage drives 6.09B cache); from April Opus 4.7 (1M) + Sonnet 4.6 + Haiku 4.5 run in parallel
- CLI versions: spans **44 versions** (0.77 → 0.129.0-alpha), avg less than 3 days per version — **Codex Early Adopter** confirmed

### Unit input vs output (reference only — not a KPI)
- Per commit ≈ **346K** Claude spent tokens (spent only, excluding cache and Codex)
- Per commit ≈ **8.94M** Codex tokens
- Per LOC ≈ **691** Claude spent tokens / **17.8K** Codex tokens

> Reminder: AI output also includes large amounts of high-value labor that doesn't directly translate into commits — skill design / plan exploration / patrols / data cleaning / multi-agent orchestration. Treating "X tokens per commit" as a KPI is anti-incentive — **this section is just an order-of-magnitude reference**.

## 💰 Output & input

### GitHub same-window output (365-day window)
- Total contributions: **966** · Owned repos: **77** · Created in 365d: **72**
- PRs total: **101** (lifetime) / 365d **84** · Issues 365d **34** · PR Reviews **2**
- Single-day peaks (message scope): 03-18 / 03-17 / 03-24 / 04-01 / 03-19

#### Top repos (by 365d commits)
| Repo | language | commits | stars |
| --- | --- | ---: | ---: |
| study8677/OpenCMO | Python | 318 | 74 |
| study8677/antigravity-workspace-template | Python | 153 | **1,211** |
| study8677/vibe-forge | Rust | 38 | 15 |
| study8677/ReadYourUsers | TypeScript | 37 | 8 |
| study8677/study8677 | (profile) | 32 | 1 |
| study8677/easy-claude-code | (mixed) | 24 | 43 |
| study8677/724claw.icu | HTML | 22 | 3 |
| stelee410/agent-mailer | Python | 16 | 9 |
| study8677/Readme.skill | (skill) | 12 | 13 |
| study8677/clawdbot-webchat-lite | TypeScript | 11 | 12 |
| study8677/Steward | Python | 10 | 4 |
| study8677/post-training | Jupyter | 10 | 2 |
| loks666/get_jobs | Java | 4 | **6,896** |

### Primary languages (GitHub bytes + local git LOC)
**Python (primary)** · **TypeScript** · **Markdown (huge — 82K lines)** · **Jupyter Notebook (RL / academic)** · **Rust** · **JavaScript** · HTML · CSS · PLpgSQL · Go · Shell · Vue · Makefile · Batchfile · Dockerfile · PowerShell

> Note: markdown LOC (82K) is roughly half of .py LOC (166K) — this person writes **about as much documentation as code**. AGENT.md / SKILL.md / plan markdown / spec docs together form the "system-prompt foundation" of the AI collaboration.

## 📊 Data sources & privacy commitment

- 100% local: `~/.claude/*` + `~/.codex/*` + local `git log` + GitHub via `gh`
- Conversation bodies are used only for keyword / collaboration-style / session-architecture statistics; raw text never enters the report
- Project names anonymized (Project A → L); API keys / tokens / emails scrubbed via regex
- Generated by Claude Opus 4.7 (1M) following Readme.skill v2.4 — fully reproducible
- Generated at: **2026-05-08T07:40:00Z**

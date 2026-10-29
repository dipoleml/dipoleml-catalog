# Simian Programmer Plugin (SPP) for Claude Code

**Pair programming with AI.**

SPP is a Claude Code plugin that helps you learn how code, or to keep your skills sharp. It is useful for learning new languages, ramping up on code bases, or learning CS and engineering concepts.

## Why?

Over-reliance on AI coding tools leads to skill atrophy. [A study from Anthropic](https://www.anthropic.com/research/AI-assistance-coding-skills) found that:

> AI use impairs conceptual understanding, code reading, and debugging abilities... Participants who fully delegated coding tasks showed some productivity improvements, but at the cost of learning.

SPP lets you use AI as a collaborator rather than a crutch. It works two ways:

1. **Drive mode** — Toggle `spp drive` to write code yourself while Claude coaches. In drive mode, Claude can't write code.

2. **Coaching skill** - While in drive mode, SPP writes every file save and conversation exchange to a transcript file. When you're done, run `/coach` to get coaching and feedback on your session.

3. **Human coding goal** — Set a goal for how much code you want to write per week. When you are under the goal, SPP blocks Claude from writing more until you catch up. Claude can stil give guidance, code pointers, and reviews your work.

## Quick Start

```bash
# 1. Install the CLI
npm i -g claude-spp

# 2. Initialize in your project
cd /path/to/your/project
spp init

# 3. Add the plugin to Claude Code
claude
> /plugin marketplace add mlolson/claude-spp
> /plugin install spp@mlolson
```

## How It Works

### Tracking

SPP reads your commit history. Commits with `Co-Authored-By: Claude` in the message count as Claude commits; commits without it count as human commits.

- Tracking starts from when you run `spp init` (previous commits are ignored)
- By default, looks at the last 7 days of commits
- Can optionally track by lines of code instead of commits

### Enforcement

When your human coding ratio drops below your target, Claude is **blocked** from writing code. Instead of writing code for you, Claude uses a "help human code" skill that provides:

- A high-level overview of the task
- Specific file and line number references
- Step-by-step guidance
- Code review after you write it

### Modes

SPP has two mode types:

| # | Mode | Description |
|---|------|-------------|
| 1 | **Weekly Goal** | Set a weekly human coding target (% of code). Default. |
| 2 | **Learning Project** | Coming soon. |

Change modes anytime with `spp mode <1-2>`.

#### Weekly Goal

The default mode. You set a target percentage of code you want to write yourself (10%, 25%, 50%, or 100%). SPP tracks commits (or lines of code) over a rolling window and blocks Claude from writing code when your ratio drops below the target.

## Features

### Status Line

See your current ratio at a glance in Claude Code's status line:

```
🟢 Claude can write 9 more commits 🤖 > 🐵 > 🤖 > 🐵 > 🐵 ...
🔴 Human needs to write 2 more commits 🤖 > 🤖 > 🤖 > 🐵 ...
🚙 Drive mode enabled. Claude cannot write code.                                                                                          
```

Enable by adding to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "spp hook:status-line"
  }
}
```

### Drive Mode + Coaching

Drive mode is the core hands-on coding experience. Toggle it on, write code, get coached afterward:

```bash
spp drive              # Toggle on — you code, Claude guides
# ... write code, ask questions, Claude can't touch files ...
spp drive              # Toggle off — transcript archived
/spp:coach                 # Get coaching on your session
```

When drive mode is on:
- Claude is **blocked** from writing code (except `.md` files)
- A **file watcher** records every save as a diff in a transcript
- **Conversation hooks** capture your questions and Claude's answers
- Claude remains available for guidance, code review, and questions

When you toggle off, the transcript is archived. Run `/coach` to get a review of your session — what went well, where you struggled, and what to try next.

```bash
spp transcript         # View live transcript (during) or list archives (after)
```

### Pause / Resume

Need Claude to write freely for a bit? Pause enforcement for 24 hours:

```bash
spp pause    # Pause for 24 hours
spp resume   # Resume immediately
```

### Reset

Behind on commits and want a fresh start? Reset tracking:

```bash
spp reset
```

## CLI Reference

| Command | Description |
|---------|-------------|
| `spp init` | Initialize SPP in the current project |
| `spp stats` | Show current ratio and statistics |
| `spp mode [n]` | Show or change mode type (1-2) |
| `spp modes` | List all available mode types |
| `spp settings` | View and modify SPP settings |
| `spp drive` | Toggle drive mode (watcher + transcript) |
| `spp transcript` | Show live transcript or list archives |
| `/coach` | Get coaching on your latest drive session |
| `spp pause` | Pause enforcement for 24 hours |
| `spp resume` | Resume enforcement |
| `spp reset` | Reset tracking to current commit |

## Configuration

Config is stored in `.claude-spp/config.json`:

| Option | Default | Description |
|--------|---------|-------------|
| `modeType` | `"weeklyGoal"` | Mode type: `"weeklyGoal"`, `"learningProject"` |
| `targetPercentage` | `25` | Human coding target for weekly goal mode: `10`, `25`, `50`, `100` |
| `trackingMode` | `"commits"` | What to count: `"commits"` or `"lines"` |
| `statsWindow` | `"oneWeek"` | Time window: `"oneDay"`, `"oneWeek"`, `"allTime"` |
| `driveMode` | `false` | Block Claude regardless of ratio |
| `enabled` | `true` | Whether enforcement is active |

Example:

```json
{
  "enabled": true,
  "modeType": "weeklyGoal",
  "targetPercentage": 25,
  "statsWindow": "oneWeek",
  "trackingMode": "commits",
  "vcsType": "git"
}
```

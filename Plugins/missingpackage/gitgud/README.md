# GitGud

Keep your coding skills sharp while using AI. A Claude Code plugin that periodically assigns manual coding challenges with gamification features.

## Why GitGud?

AI assistants like Claude Code make us incredibly productive, but there's a risk: if we never write code ourselves, our skills atrophy. GitGud ensures you practice regularly while still benefiting from AI assistance.

## Features

- **Periodic Challenges**: Every N requests, you'll get a coding task related to your current work
- **Smart Categorization**: Tasks match your context (API, auth, testing, database, etc.)
- **Gamification**:
  - **Streaks**: Track consecutive days of completed tasks
  - **Achievements**: Unlock badges as you progress
  - **Skip System**: Skip tasks when you're in a hurry (limited per day)
- **Persistent Progress**: Your data is stored in `~/.gitgud/` and persists across plugin updates
- **Fully Configurable**: Adjust frequency, difficulty, and daily skips

## Installation

### Claude Code

#### From Marketplace (recommended)

```bash
/plugin marketplace add MissingPackage/gitgud
/plugin install gitgud
```

#### From local folder (for development)

```bash
claude --debug --plugin-dir /path/to/gitgud
```

### Cursor IDE

GitGud now supports Cursor IDE! The same repository works for both Claude Code and Cursor, with shared data between them.

#### Requirements

- Node.js 14+ installed
- Cursor IDE 1.7+ (with hook support)
- Git (for cloning the repository)

#### macOS/Linux

```bash
# Clone and run installer
git clone https://github.com/MissingPackage/gitgud.git ~/.gitgud-cursor
cd ~/.gitgud-cursor
./install-cursor.sh
```

#### Notes for multi-shell setups (bash + zsh, etc.)

The installer adds command aliases (e.g. `gg-stats`) to your **primary/login shell** config file:
- zsh → `~/.zshrc`
- bash → `~/.bashrc`
- fish → `~/.config/fish/config.fish`
- other → `~/.profile`

If you want to override the target file explicitly:

```bash
GITGUD_SHELL_RC="$HOME/.zshrc" ./install-cursor.sh
```

#### Windows

```powershell
# Run in PowerShell
git clone https://github.com/MissingPackage/gitgud.git $env:USERPROFILE\.gitgud-cursor
cd $env:USERPROFILE\.gitgud-cursor
.\install-cursor.ps1
```

#### How Cursor Support Works

Unlike Claude Code which can inject context directly, Cursor's `beforeSubmitPrompt` hook only supports `{ continue: boolean }`. Therefore, GitGud for Cursor uses a different approach:

1. **Hook**: Processes prompts and writes task state to files
2. **Cursor Rule**: Reads task state and instructs the AI to enforce training mode
3. **Shared Data**: Both Claude Code and Cursor use `~/.gitgud/` for data storage

This means your streak, achievements, and settings are synchronized between both IDEs!

#### ⚠️ IMPORTANT: Cursor Rules Configuration

**Cursor does NOT support global rules that apply automatically across all projects.** You must manually configure GitGud rules for each project where you want to use it.

> 📖 **Official documentation**: [Cursor Rules](https://docs.cursor.com/context/rules)

##### Step 1: Copy the Rule File

For each project where you want GitGud active:

```bash
# From your project root:
mkdir -p .cursor/rules
cp ~/.gitgud-cursor/cursor/rules/gitgud.mdc .cursor/rules/
```

Or append to an existing `.cursorrules` file:

```bash
cat ~/.gitgud-cursor/cursor/rules/gitgud.cursorrules >> .cursorrules
```

##### Step 2: Enable the Rule in Cursor Settings

**⚠️ Copying the file is not enough!** You must also enable the rule in Cursor:

The GitGud rule should always be active, but sometimes you may need to enable it once, the first time you want to activate GitGud in a project.

1. Open the project in Cursor
2. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
3. Run **"Reload Window"** to detect new rules
4. Go to **Cursor Settings** → **Rules** (or open the **Context** panel → **Rules**)
5. Verify that the GitGud rule appears and is **enabled** (toggle ON)

Without enabling the rule, Cursor's AI will not enforce training mode even if tasks are assigned!

##### Verifying the Setup

To check if GitGud is working in Cursor:

1. Open a project with the rule configured and enabled
2. Run `node ~/.gitgud-cursor/cursor/validate-cursor.js` to verify setup
3. Check if pending tasks appear when you interact with Cursor AI

#### Uninstalling from Cursor

```bash
# macOS/Linux
~/.gitgud-cursor/uninstall-cursor.sh

# Windows (PowerShell)
~\.gitgud-cursor\uninstall-cursor.ps1
```

The uninstaller will ask if you want to keep your data for future reinstallation.

## Commands

| Command | Description |
|---------|-------------|
| `/gg-complete` | Mark current task as completed |
| `/gg-stats` | View statistics, achievements, and streak |
| `/gg-reset [counter\|stats\|all]` | Reset data |
| `/gg-config` | View current configuration |
| `/gg-config <setting> <value>` | Change a setting |


## How It Works

1. Every N requests (default: 10), you'll receive a coding challenge
2. The task is **related but not identical** to your request
3. Claude guides you but won't write the code for you
4. Complete the task and run `/gg-complete` to update your stats
5. Or type "skip" to use a skip (limited per day)

## Task Categories

Tasks are automatically matched to your work context:

| Category | Triggered by |
|----------|--------------|
| Security | auth, login, password, jwt, token, oauth |
| API | endpoint, route, request, response, http, graphql |
| Database | query, sql, model, schema, migration, orm |
| Debug | bug, fix, error, problem, crash, issue |
| Test | test, spec, assert, pytest, jest, mock |
| Architecture | refactor, pattern, structure, interface |
| Frontend | component, react, vue, css, form, modal |
| Function | implement, create, add, write, build |

## Configuration

```bash
/gg-config                      # View current configuration
/gg-config frequency 15         # Set task frequency to every 15 requests
/gg-config daily_skips 5        # Allow 5 skips per day
/gg-config difficulty hard      # Set difficulty to hard
/gg-config enabled false        # Disable the plugin
```

### Settings

| Setting | Description | Options | Default |
|---------|-------------|---------|---------|
| `frequency` | Requests between tasks | Any number | 10 |
| `daily_skips` | Max skips per day | Any number | 3 |
| `difficulty` | Task complexity | easy, medium, hard, adaptive | adaptive |
| `enabled` | Plugin active | true, false | true |

## Data Storage

Your progress is stored in `~/.gitgud/` (cross-platform):
- **Windows**: `C:\Users\<username>\.gitgud\`
- **macOS**: `/Users/<username>/.gitgud/`
- **Linux**: `/home/<username>/.gitgud/`

This ensures your achievements and streaks persist even when updating the plugin.

## Achievements

### Task Milestones
- 🎯 **First Steps** - Complete your first task
- ✋ **Getting Hands Dirty** - Complete 5 tasks
- 📚 **Apprentice** - Complete 10 tasks
- 🔨 **Craftsman** - Complete 25 tasks
- 🎓 **Master** - Complete 50 tasks
- 🏆 **Legend** - Complete 100 tasks

### Streak Achievements
- 🔥 **Three in a Row** - 3 day streak
- 📅 **Perfect Week** - 7 day streak
- 💪 **Two Weeks Strong** - 14 day streak
- 🥇 **Golden Month** - 30 day streak

## Tips for Success

1. **Don't skip too often** - The challenges are designed to keep your skills sharp
2. **Take your time** - Quality practice beats rushing through tasks
3. **Use hints wisely** - Ask Claude for conceptual help, but write the code yourself
4. **Build a streak** - Consistency is key to maintaining skills

## Current Limitations

This is v1.0, built in a couple hours on a Friday night. It works, but has room for improvement. Most of these limitations can be overcome with a much higher token usage but this would make no-sense for this kind of plugins:

- **Keyword matching is basic** - Categories are detected via simple regex patterns, not semantic understanding
- **Tasks are generic** - They don't deeply analyze your specific code context, but are rather based on the conversation context.
- **No difficulty progression** - Tasks don't automatically become more difficult but if you select the *adaptive* difficulty, Claude will assign them based on what it thinks is your skill level
- **Limited task variety** - 3 tasks per category, could use more
- **English only** - Tasks and achievements are only in English

## Contributing

This plugin was built to scratch my own itch - I wanted to keep my skills sharp while using AI. If you have ideas for improvements, I'd love your help!

**Areas that need love:**
- Better task categorization (maybe using embeddings?)
- More diverse and specific tasks
- Difficulty progression system
- Localization support
- More achievements and gamification features
- Better integration with specific frameworks/agents

Feel free to open issues, submit PRs, or fork and make your own version!

## Author

Built with ❤️ (and some AI assistance) by [MissingPackage](https://github.com/MissingPackage)

## License

MIT

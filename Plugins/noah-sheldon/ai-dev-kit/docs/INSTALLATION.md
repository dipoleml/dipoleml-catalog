# Installation

Complete guide for installing and configuring AI Dev Kit.

---

## Prerequisites

| Requirement | Version | Why |
|---|---|---|
| **Node.js** | 18+ | Scripts, validation, and OpenCode plugin |
| **Git** | 2.0+ | Version control and agent coordination |
| **Python** | 3.10+ (optional) | Python workflows, FastAPI, testing |

---

## Quick Install

### Clone and Install

```bash
git clone https://github.com/noah-sheldon/ai-dev-kit.git
cd ai-dev-kit
npm install
```

### Validate

```bash
npm test                       # Smoke tests
node scripts/validate-surface.js  # Full surface validation
```

---

## Platform-Specific Setup

### Claude Code

1. Ensure Claude Code v2.1+ is installed
2. Add the marketplace:

```
/plugin marketplace add noah-sheldon/ai-dev-kit
```

3. Install the plugin:

```
/plugin install ai-dev-kit@ai-dev-kit
```

4. Verify:

```
/plugin list
```

You should see `ai-dev-kit` listed as installed.

### Codex

1. Clone this repository
2. Restart Codex — the marketplace at `.agents/plugins/marketplace.json` will be discovered automatically
3. Open the Plugin Directory and install `ai-dev-kit`

### Gemini CLI

1. Clone this repository
2. Run from the repo root:

```bash
gemini extensions link .
```

3. Restart Gemini CLI to load the extension

### OpenCode

1. Build the TypeScript plugin:

```bash
cd .opencode/plugins
npm install
npm run build
```

2. The parent `.opencode/opencode.json` already references this plugin via `"plugin": ["./plugins"]`

3. Launch OpenCode from the repo root:

```bash
opencode
```

---

## MCP Server Configuration

MCP servers provide tool access. Edit `.mcp.json` to configure credentials:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token-here"
      }
    }
  }
}
```

| Server | Environment Variable |
|---|---|
| `github` | `GITHUB_PERSONAL_ACCESS_TOKEN` |
| `exa` | `EXA_API_KEY` |
| `context7` | None required (public API) |

**Never commit API keys.** Use `.env` files (listed in `.gitignore`) or set them in your shell profile.

---

## Custom LLM Gateway

If you use a custom LLM gateway (Anthropic-compatible API):

```bash
export ANTHROPIC_BASE_URL=https://your-gateway.example.com
export ANTHROPIC_AUTH_TOKEN=your-token
```

The plugin works with any compatible endpoint — it does not override transport settings.

---

## Verification

After installation, run the full validation:

```bash
npm test
```

Expected output:
```
✓ All required files present
✓ All JSON manifests valid
✓ All skill frontmatter parses correctly
✓ No broken references
✓ Production surface complete
```

### Check Plugin Installation

**Claude Code:**
```
/plugin list
/plugin marketplace list
```

**Codex:**
- Open Plugin Directory and verify `ai-dev-kit` appears

---

## Troubleshooting

### "File not found: .claude-plugin/marketplace.json"

Ensure the `.claude-plugin/` directory exists and contains `marketplace.json`. If you cloned the repo, these files should be present.

### "Duplicate hooks file detected"

Do not add a `"hooks"` field to `plugin.json`. Claude Code v2.1+ auto-loads `hooks/hooks.json` by convention. Declaring it explicitly causes a conflict.

### "agents: Invalid input"

The `agents` field in `plugin.json` must be an array of explicit file paths (e.g., `"./agents/planner.md"`), not a directory reference (e.g., `"./agents/"`). See `.claude-plugin/PLUGIN_SCHEMA_NOTES.md`.

### MCP server won't connect

- Verify the API key is set in your environment
- Check that the server binary is accessible
- Run Claude Code with `--verbose` for detailed error output

### Plugin doesn't appear in `/plugin list`

- Run `/plugin marketplace update` to refresh from source
- Check that the marketplace name in `marketplace.json` matches what you're querying

---

## Uninstall

```bash
./install.sh --uninstall
# or
node scripts/uninstall.js
```

This removes installed plugins and marketplace registrations while keeping the source repo intact.

---

## Next Steps

- Read [AGENTS.md](../AGENTS.md) for the full agent orchestration guide
- Browse `skills/` to see all 55 available skills
- Run `npm run doctor` for a health check of your installation
- See [docs/ARCHITECTURE.md](ARCHITECTURE.md) for the system design

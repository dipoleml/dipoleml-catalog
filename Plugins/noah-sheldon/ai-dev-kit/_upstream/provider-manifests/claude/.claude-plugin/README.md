### Plugin Manifest Gotchas

If you plan to edit `.claude-plugin/plugin.json`, be aware that the Claude plugin validator enforces several **undocumented but strict constraints** that can cause installs to fail with vague errors (for example, `agents: Invalid input`).

Key constraints:

- **`version` is required** — omitting it causes installation failure
- **`agents` must be an array of explicit file paths** (e.g., `"./agents/planner.md"`) — directory paths like `"./agents/"` are rejected with `agents: Invalid input`
- **`commands`, `skills`, `hooks` must be arrays** (even with one entry)
- **Do NOT add a `"hooks"` field** to `plugin.json` for `hooks/hooks.json` — Claude Code v2.1+ auto-loads it by convention. Declaring it causes a "Duplicate hooks file detected" error

Always validate with `claude plugin validate .` or `/plugin validate .` before pushing changes.

### Custom Endpoints and Gateways

This kit does not override Claude Code transport settings. If Claude Code is configured to run through an official LLM gateway or a compatible custom endpoint, the plugin continues to work because hooks, skills, and commands execute locally after the CLI starts successfully.

Use Claude Code's own environment/configuration for transport selection:

```bash
export ANTHROPIC_BASE_URL=https://your-gateway.example.com
export ANTHROPIC_AUTH_TOKEN=your-token
claude
```

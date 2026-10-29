# Contributing to Cross-Code Organizer (CCO)

Thanks for your interest in contributing! This project is maintained by [@ithiria894](https://github.com/ithiria894).

## Quick Start

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/cross-code-organizer.git
cd cross-code-organizer

# Install the locked dependencies
npm ci

# Start the dashboard (dev mode)
npm start

# Run tests
npm test

# Run tests with visible browser
npm run test:headed
```

## Project Structure

```
bin/cli.mjs          # Entry point (dashboard or MCP server mode)
src/
  harness/           # Harness adapters and their declared capabilities
  scanner.mjs        # Claude compatibility scanner
  control-plane.mjs  # Effective context and hygiene analysis
  server.mjs         # Local dashboard API
  mcp-server.mjs     # MCP server wrapper
  session-distiller.mjs # Resumable Claude session distillation
  privacy-metrics.mjs   # Opt-in monthly active-install signal
  ui/
    app.js           # Dashboard interactions and editors
    index.html       # Three-panel layout
    style.css        # Dashboard styling
tests/
  unit/              # Node unit and regression tests
  e2e/               # Playwright E2E tests
infra/
  metrics-worker/    # First-party opt-in metrics collector
```

## How It Works

1. **Harness adapters** inventory Claude Code, Codex CLI, OpenCode, and DeepSeek Harness sources.
2. **Control plane** explains effective context and hygiene only where an adapter declares the relevant precedence rules.
3. **Server** exposes a loopback-only dashboard API with adapter-approved file boundaries.
4. **UI** provides inventory, Markdown editing, search, reversible repair, migration previews, and Session Distiller.

### Scope model

Harness scope and precedence rules are not interchangeable. Each adapter owns
its roots, project discovery, capabilities, and effective-context declarations.
Do not infer one harness's behavior from another.

Claude Code includes these two common scopes:

- **Global** — `~/.claude/` — applies to every session on this machine
- **Project** — `<repo>/.claude/` — applies only to that repository

The sidebar may group projects visually by path, but visual nesting alone must
never be treated as inheritance.

## What to Work On

- Check [open issues](https://github.com/mcpware/cross-code-organizer/issues) for bugs and feature requests
- Issues labeled `good first issue` are great starting points
- If you want to work on something not listed, open an issue first to discuss

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run tests: `npm test`
4. Commit with clear messages (e.g., `fix: handle empty memory files`, `feat: add bulk export`)
5. Open a PR against `main`

## Code Style

- Pure ES modules (`.mjs` files)
- Keep runtime dependencies small and justified
- No build step — source files run directly
- Keep it simple — no abstractions for one-time operations
- Treat every mutation as adapter-specific; unsupported operations stay disabled
- Preserve loopback, origin, request-size, and adapter-approved path checks

## Testing

We use Playwright for E2E tests. Tests spin up the real server and test through the browser.

```bash
# Run unit tests
npm run test:unit

# Run all Playwright E2E tests
npm test

# Run a specific E2E test file
npx playwright test --config tests/e2e/playwright.config.mjs tests/e2e/dashboard.spec.mjs

# Debug with headed browser
npm run test:headed
```

## Reporting Issues

- Use [GitHub Issues](https://github.com/mcpware/cross-code-organizer/issues)
- Include your OS, Node.js version, selected harness, and harness version
- For bugs, include steps to reproduce

## Maintainer releases

See [RELEASING.md](RELEASING.md). Releases are tag-driven and use trusted
publishing; do not publish npm or create a GitHub Release manually.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

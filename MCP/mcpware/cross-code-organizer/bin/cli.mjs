#!/usr/bin/env node

/**
 * cli.mjs — Entry point for Cross-Code Organizer (CCO).
 * Usage:
 *   node bin/cli.mjs              → Start web dashboard (HTTP server)
 *   node bin/cli.mjs --mcp        → Start MCP server (stdio, for AI clients)
 *   node bin/cli.mjs --port 3847  → Start web dashboard on custom port
 *   node bin/cli.mjs --help       → Show CLI usage
 */

import { access, constants, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { isNewerVersion } from '../src/version.mjs';

const args = process.argv.slice(2);
const isMcpMode = args.includes('--mcp');
const distillIdx = args.indexOf('--distill');
const isDistillMode = distillIdx !== -1;

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Cross-Code Organizer (CCO)

Usage:
  cross-code-organizer [--port <number>] [--no-open]
  cross-code-organizer --distill <session.jsonl>
  cross-code-organizer --mcp

Options:
  --port <number>          Dashboard port (default: 3847)
  --no-open                Do not open a browser automatically
  --distill <session>      Create a resumable distilled Claude session
  --mcp                    Run the MCP server over stdio
  -v, --version            Print the installed version
  -h, --help               Show this help`);
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  console.log(require('../package.json').version);
  process.exit(0);
}

// Claude Code is optional: Codex, OpenCode, and DSH-only users must still be
// able to start the cross-harness dashboard.
const claudeDir = join(homedir(), '.claude');
let hasClaudeHome = false;
try {
  await access(claudeDir, constants.R_OK);
  hasClaudeHome = true;
} catch {}

// ── Auto-install /cco skill if not present ──
if (!isMcpMode && hasClaudeHome) {
  const skillDir = join(claudeDir, 'skills', 'cco');
  const skillFile = join(skillDir, 'SKILL.md');
  try {
    await access(skillFile, constants.R_OK);
  } catch {
    // Skill doesn't exist yet — install it
    try {
      await mkdir(skillDir, { recursive: true });
      await writeFile(skillFile, [
        '---',
        'name: cco',
        'description: Open the local Cross-Code Organizer dashboard to inspect and clean AI coding harness configuration',
        'model: haiku',
        '---',
        '',
        '1. Run `npx @mcpware/cross-code-organizer@latest --no-open` in the background.',
        '2. Wait until CCO prints its local dashboard URL.',
        '3. Open that exact URL with the available browser command or browser tool.',
        '4. Tell the user the exact URL that CCO printed.',
        '',
        'CCO inventories Claude Code, Codex CLI, OpenCode, and DeepSeek Harness configuration. Use it to inspect and edit supported memories, skills, agents, commands, hooks, instructions, MCP servers, and config, or to run preview-first Harness Doctor repairs.',
        ''
      ].join('\n'));
      console.log('  ✓ Installed /cco skill globally — next time just type /cco in Claude Code!\n');
    } catch {
      // Non-critical — skip silently if we can't write
    }
  }
}

// ── Update check (non-blocking) ──
async function checkForUpdate() {
  try {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json');
    const localVersion = pkg.version;

    const resp = await fetch('https://registry.npmjs.org/@mcpware/cross-code-organizer/latest', { signal: AbortSignal.timeout(3000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    const latestVersion = data.version;

    if (isNewerVersion(latestVersion, localVersion)) {
      return { local: localVersion, latest: latestVersion };
    }
  } catch { /* silent — don't block startup */ }
  return null;
}

if (isDistillMode) {
  // CLI distill mode: npx @mcpware/cross-code-organizer --distill <session.jsonl>
  const sessionPath = args[distillIdx + 1];
  if (!sessionPath || !sessionPath.endsWith('.jsonl')) {
    console.error('\n  Usage: npx @mcpware/cross-code-organizer --distill <session.jsonl>\n');
    process.exit(1);
  }
  const { resolve } = await import('node:path');
  const { distillSession } = await import('../src/session-distiller.mjs');
  const fmt = b => b < 1024 ? b + 'B' : b < 1048576 ? (b / 1024).toFixed(1) + 'K' : (b / 1048576).toFixed(1) + 'M';
  try {
    const r = await distillSession(resolve(sessionPath));
    const s = r.stats;
    console.log(`\n  Session Distiller — by @mcpware/cross-code-organizer`);
    console.log(`  ─────────────────────────────────────────────────────`);
    console.log(`  Backup:    ${r.backupPath} (${fmt(s.backupBytes)})`);
    console.log(`  Distilled: ${r.outputPath} (${fmt(s.outputBytes)}, ${s.reduction} reduction)`);
    if (s.indexEntries > 0) {
      console.log(`  Index:     ${s.indexPath} (${s.indexEntries} refs)`);
    }
    console.log(`  Lines:     ${s.inputLines} → ${s.keptLines}\n`);
  } catch (err) {
    console.error(`\n  Error: ${err.message}\n`);
    process.exit(1);
  }
} else if (isMcpMode) {
  // MCP server mode — AI clients connect via stdio
  await import('../src/mcp-server.mjs');
} else {
  // Web dashboard mode — human opens browser
  const { startServer } = await import('../src/server.mjs');
  const { execFileSync } = await import('node:child_process');

  const portIdx = args.indexOf('--port');
  const port = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : 3847;

  // Check for update in background (don't block server start)
  const updatePromise = checkForUpdate();

  const server = startServer(port);

  // Show update notice after server starts (CLI users)
  updatePromise.then(update => {
    if (update) {
      console.log(`\n  📦 New version available! You're not on the latest.`);
      console.log(`     Run: npx @mcpware/cross-code-organizer@latest`);
      console.log(`     Or:  npm update -g @mcpware/cross-code-organizer\n`);
    }
  });

  if (!args.includes('--no-open') && process.env.CCO_NO_OPEN !== '1') {
    server.once('listening', () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      const dashboardUrl = `http://localhost:${actualPort}`;
      try {
        if (process.platform === 'win32') {
          execFileSync('cmd.exe', ['/d', '/s', '/c', 'start', '', dashboardUrl], { stdio: 'ignore' });
        } else {
          const openCmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
          execFileSync(openCmd, [dashboardUrl], { stdio: 'ignore' });
        }
      } catch {
        // Browser didn't open, user can navigate to the printed URL manually.
      }
    });
  }
}

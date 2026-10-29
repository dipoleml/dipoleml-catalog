// chisle — `npx chisle mcp <wrap|unwrap|status>`: route stdio MCP servers
// through hooks/chisle-mcp-proxy.js so their oversized tool results get the
// same compression Claude Code and Pi get from PostToolUse.
//
// Opt-in, because it rewrites other tools' config files:
//   - strict JSON only: a file with comments is reported and left alone,
//     since rewriting it would drop them
//   - first write of each file keeps a `<file>.chisle-bak` copy
//   - only stdio entries (`command`) are wrapped; url/http servers untouched
//   - wrapped form is reversible from the args alone, no extra keys a host
//     schema might reject: { command: "node", args: [proxy, "--", cmd, ...args] }
//
// Claude Code is never a target: its PostToolUse hook already compresses
// mcp__* output, and wrapping would only add a process per server.
// Codex (TOML config) is not wrapped automatically.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { getConfigDir } = require('../../hooks/chisle-config');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PROXY_FILE = 'chisle-mcp-proxy.js';
const PROXY_SOURCES = ['chisle-mcp-proxy.js', 'chisle-compress-output.js', 'chisle-config.js'];

function home() { return process.env.CHISLE_HOME || os.homedir(); }
function proxyDir() { return path.join(getConfigDir(), 'mcp-proxy'); }

// VS Code-family user dirs, for Cline's global MCP settings.
function vscodeUserDirs() {
  const base = process.platform === 'darwin' ? path.join(home(), 'Library', 'Application Support')
    : process.platform === 'win32' ? (process.env.APPDATA || path.join(home(), 'AppData', 'Roaming'))
    : (process.env.XDG_CONFIG_HOME || path.join(home(), '.config'));
  return ['Code', 'Code - Insiders', 'VSCodium', 'Cursor', 'Windsurf'].map(n => path.join(base, n, 'User'));
}

// Global MCP config files, all `{ "mcpServers": { name: { command, args } } }`.
function targets() {
  const h = home();
  const copilot = process.env.COPILOT_HOME || path.join(h, '.copilot');
  const list = [
    ['cursor', 'Cursor', path.join(h, '.cursor', 'mcp.json')],
    ['windsurf', 'Windsurf', path.join(h, '.codeium', 'windsurf', 'mcp_config.json')],
    ['gemini', 'Gemini CLI', path.join(h, '.gemini', 'settings.json')],
    ['qwen', 'Qwen Code', path.join(h, '.qwen', 'settings.json')],
    ['kiro', 'Kiro', path.join(h, '.kiro', 'settings', 'mcp.json')],
    ['copilot-cli', 'Copilot CLI', path.join(copilot, 'mcp-config.json')],
  ];
  for (const dir of vscodeUserDirs()) {
    list.push(['cline', 'Cline', path.join(dir, 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json')]);
  }
  return list.map(([id, label, file]) => ({ id, label, file }));
}

function isWrapped(entry) {
  return !!(entry && Array.isArray(entry.args) && typeof entry.args[0] === 'string' &&
    path.basename(entry.args[0]) === PROXY_FILE && entry.args[1] === '--');
}

function isStdio(entry) {
  return !!(entry && typeof entry.command === 'string' && entry.command &&
    !entry.url && !entry.httpUrl && !entry.serverUrl &&
    (entry.type == null || entry.type === 'stdio' || entry.type === 'local'));
}

function wrapEntry(entry, proxy) {
  const args = Array.isArray(entry.args) ? entry.args : [];
  entry.args = [proxy, '--', entry.command, ...args];
  entry.command = 'node';
}

function unwrapEntry(entry) {
  const rest = entry.args.slice(2);
  entry.command = rest[0];
  entry.args = rest.slice(1);
  if (!entry.args.length) delete entry.args; // wrap added it; most configs omit an empty one
}

function readConfig(file) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (e) { return { missing: true }; }
  try {
    const data = JSON.parse(raw.replace(/^﻿/, ''));
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { error: 'not a JSON object' };
    return { data, raw };
  } catch (e) { return { error: 'not strict JSON (comments?); edit by hand' }; }
}

function writeConfig(file, raw, data) {
  const bak = file + '.chisle-bak';
  if (!fs.existsSync(bak)) fs.writeFileSync(bak, raw, { mode: 0o600 });
  let mode = 0o600;
  try { mode = fs.statSync(file).mode & 0o777; } catch (e) {}
  const tmp = file + '.chisle-tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', { mode });
  fs.renameSync(tmp, file);
}

function installProxy() {
  const dir = proxyDir();
  fs.mkdirSync(dir, { recursive: true });
  for (const f of PROXY_SOURCES) fs.copyFileSync(path.join(REPO_ROOT, 'hooks', f), path.join(dir, f));
  fs.writeFileSync(path.join(dir, 'package.json'), '{ "type": "commonjs" }\n');
  return path.join(dir, PROXY_FILE);
}

function parse(argv) {
  const o = { action: argv[0], dryRun: false, only: [], files: [] };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') o.dryRun = true;
    else if (a === '--only' && argv[i + 1]) o.only.push(argv[++i]);
    else if (a === '--file' && argv[i + 1]) o.files.push(path.resolve(argv[++i]));
    else if (a === '--no-color' || a === '--') continue;
    else throw new Error('unknown option: ' + a);
  }
  if (!['wrap', 'unwrap', 'status'].includes(o.action)) throw new Error('usage: npx chisle mcp <wrap|unwrap|status> [--only <agent>] [--file <mcp.json>] [--dry-run]');
  return o;
}

function selected(o) {
  if (o.files.length) return o.files.map(file => ({ id: 'file', label: 'custom', file }));
  return targets().filter(t => !o.only.length || o.only.includes(t.id));
}

// Returns { changed, files } so `--uninstall` can reuse it quietly.
function run(argv, out) {
  out = out || (s => process.stdout.write(s + '\n'));
  const o = parse(argv);
  const proxy = o.action === 'wrap' && !o.dryRun ? installProxy() : path.join(proxyDir(), PROXY_FILE);
  let changed = 0, found = 0;

  for (const t of selected(o)) {
    const cfg = readConfig(t.file);
    if (cfg.missing) { if (o.files.length) out('  ' + t.file + ': not found'); continue; }
    found++;
    if (cfg.error) { out('  ' + t.label + ': ' + t.file + ': skipped, ' + cfg.error); continue; }
    const servers = cfg.data.mcpServers;
    if (!servers || typeof servers !== 'object') { out('  ' + t.label + ': no mcpServers in ' + t.file); continue; }

    const names = Object.keys(servers);
    const wrapped = names.filter(n => isWrapped(servers[n]));
    if (o.action === 'status') {
      out('  ' + t.label + ': ' + wrapped.length + '/' + names.filter(n => isStdio(servers[n])).length +
        ' stdio server(s) wrapped  ' + t.file);
      continue;
    }

    const todo = o.action === 'wrap'
      ? names.filter(n => isStdio(servers[n]) && !isWrapped(servers[n]))
      : wrapped;
    if (!todo.length) { out('  ' + t.label + ': nothing to ' + o.action + '  ' + t.file); continue; }
    for (const n of todo) (o.action === 'wrap' ? wrapEntry(servers[n], proxy) : unwrapEntry(servers[n]));
    if (!o.dryRun) writeConfig(t.file, cfg.raw, cfg.data);
    changed += todo.length;
    out('  ' + t.label + ': ' + (o.dryRun ? 'would ' + o.action : o.action + 'ped') + ' ' + todo.join(', ') + '  ' + t.file);
  }

  if (!found) out('  no MCP config files found' + (o.only.length ? ' for ' + o.only.join(', ') : ''));
  if (o.action === 'status') {
    const dir = process.env.CHISLE_STATE_DIR || getConfigDir();
    let stats = null;
    try { stats = JSON.parse(fs.readFileSync(path.join(dir, '.chisle-compress-stats.json'), 'utf8')); } catch (e) {}
    out('\n  saved so far: ' + (stats && Number.isFinite(stats.savedChars)
      ? stats.savedChars.toLocaleString('en-US') + ' chars over ' + stats.events + ' tool result(s)'
      : 'nothing yet') + '  (' + dir + ')');
  }
  if (o.action === 'wrap' && changed && !o.dryRun) out('\n  Restart the agent so it relaunches its MCP servers.');
  return { changed, found };
}

function main(argv) {
  try { run(argv); }
  catch (e) { process.stderr.write('error: ' + e.message + '\n'); process.exit(2); }
}

module.exports = { main, run, targets, isWrapped, isStdio, proxyDir };

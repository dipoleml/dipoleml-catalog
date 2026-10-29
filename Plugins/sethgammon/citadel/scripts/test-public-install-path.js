#!/usr/bin/env node
'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { projectReleaseReadme } = require('./release-package');

const ROOT = path.resolve(__dirname, '..');
const README = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const RELEASE_README = projectReleaseReadme(README);
const INSTALL = fs.readFileSync(path.join(ROOT, 'INSTALL.md'), 'utf8');
const CLI = fs.readFileSync(path.join(ROOT, 'docs', 'CLI.md'), 'utf8');
const LIFECYCLE = fs.readFileSync(path.join(ROOT, 'docs', 'GOVERNED_LIFECYCLE.md'), 'utf8');
const PRIVACY = fs.readFileSync(path.join(ROOT, 'PRIVACY.md'), 'utf8');
const SECURITY = fs.readFileSync(path.join(ROOT, 'SECURITY.md'), 'utf8');
const ROUTING = fs.readFileSync(path.join(ROOT, 'docs', 'ROUTING_PREVIEW.md'), 'utf8');
const ARCHITECTURE = fs.readFileSync(path.join(ROOT, 'docs', 'ARCHITECTURE.md'), 'utf8');
const RELEASES = fs.readFileSync(path.join(ROOT, 'docs', 'RELEASES.md'), 'utf8');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

const TRIO = Object.freeze([
  'citadel-vX.Y.Z.tar.gz',
  'citadel-vX.Y.Z.tar.gz.manifest.json',
  'citadel-vX.Y.Z.tar.gz.sha256',
]);

for (const asset of TRIO) assert(INSTALL.includes(asset), `INSTALL.md missing stable release asset ${asset}`);
for (const [name, document] of [['README.md', README], ['INSTALL.md', INSTALL]]) {
  assert(document.includes('floating `main`') || document.includes('floating main'), `${name} must label floating main as development-only`);
  assert(document.includes('No npm package') || document.includes('unsupported acquisition paths'), `${name} must reject npm acquisition`);
}

function fencedTextContaining(document, needle) {
  const normalized = document.replace(/\r\n/g, '\n');
  const blocks = [...normalized.matchAll(/```text\s*\n([\s\S]*?)\n```/g)].map((match) => match[1].trim());
  return blocks.find((block) => block.includes(needle)) || null;
}

const promptNeedle = 'Citadel is an open-source operating layer for Claude Code and OpenAI Codex';
assert.equal(
  fencedTextContaining(README, promptNeedle),
  fencedTextContaining(INSTALL, promptNeedle),
  'README and INSTALL agent-paste prompts must remain verbatim',
);

const WINDOWS_SNIPPETS = Object.freeze([
  'tar -xzf "$citadelArchive"',
  '$env:CITADEL_ROOT = (Resolve-Path',
  'node "$env:CITADEL_ROOT\\scripts\\release-verify.js"',
  'node "$env:CITADEL_ROOT\\scripts\\adopt.js"',
  'node "$env:CITADEL_ROOT\\scripts\\install.js" --runtime codex --install',
]);
for (const snippet of WINDOWS_SNIPPETS) {
  assert(INSTALL.includes(snippet), `INSTALL.md missing quoted PowerShell stable path: ${snippet}`);
}
assert(INSTALL.includes('node "$CITADEL_ROOT/scripts/release-verify.js"'), 'INSTALL.md missing Linux/macOS release verifier path');
assert(README.includes('Windows users should use the'), 'README must identify its compact manual block as Linux/macOS syntax');
for (const [name, document] of [['README.md', README], ['INSTALL.md', INSTALL]]) {
  assert(document.includes(`codex plugin marketplace add SethGammon/Citadel --ref v${VERSION}`),
    `${name} missing exact Codex marketplace install`);
  assert(document.includes('codex plugin add citadel@citadel-local'),
    `${name} missing exact Codex plugin install`);
  assert(document.includes(`claude plugin marketplace add SethGammon/Citadel@v${VERSION} --scope local`),
    `${name} missing exact Claude marketplace install`);
  assert(document.includes('claude plugin install citadel@citadel-local --scope local'),
    `${name} missing exact Claude plugin install`);
  assert(document.includes('repository-local state that survives sessions'),
    `${name} agent prompt does not explain what Citadel is`);
  assert(!fencedTextContaining(document, promptNeedle).includes('/do setup --express'),
    `${name} agent prompt must not make setup a second install gate`);
}

for (const [name, document] of [
  ['README.md', README],
  ['INSTALL.md', INSTALL],
  ['docs/CLI.md', CLI],
  ['docs/GOVERNED_LIFECYCLE.md', LIFECYCLE],
]) {
  const inTargetPlan = /--out\s+(?!\.\.[\\/])citadel-(?:adoption|update|rollback|leave)\.plan\.json/g;
  assert(!inTargetPlan.test(document), `${name} writes a governed plan inside the target`);
}

const releaseFiles = new Set([
  'README.md',
  'INSTALL.md',
  'LICENSE',
  'SECURITY.md',
  'PRIVACY.md',
  'CHANGELOG.md',
  'docs/CLI.md',
  'docs/RELEASES.md',
  'docs/ROUTING_PREVIEW.md',
  'docs/ARCHITECTURE.md',
  'assets/icon.svg',
  'assets/terminal-demo.svg',
]);
const shippedDocs = [
  ['README.md', RELEASE_README],
  ['INSTALL.md', INSTALL],
  ['PRIVACY.md', PRIVACY],
  ['SECURITY.md', SECURITY],
  ['docs/CLI.md', CLI],
  ['docs/ROUTING_PREVIEW.md', ROUTING],
  ['docs/ARCHITECTURE.md', ARCHITECTURE],
  ['docs/RELEASES.md', RELEASES],
];
assert.match(README, /\[Evaluator start here\]\(docs\/grants\/EVALUATOR_START_HERE\.md\)/, 'source README must retain its maintainer proof entry point');
assert.doesNotMatch(RELEASE_README, /### Source-only proof program|docs\/grants\/EVALUATOR_START_HERE\.md/, 'release README leaked source-only proof instructions');
assert.match(RELEASE_README, /## Trust boundary/, 'release README projection lost the public trust boundary');
for (const [name, document] of shippedDocs) {
  for (const match of document.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(?:https?:|#)/.test(target)) continue;
    const withoutAnchor = target.split('#')[0];
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(name), withoutAnchor));
    assert(releaseFiles.has(resolved), `${name} links to non-release surface ${target}`);
    assert(fs.existsSync(path.join(ROOT, resolved)), `${name} has broken local link ${target}`);
  }
}
assert(README.includes('src="assets/terminal-demo.svg"'), 'README must retain the shipped terminal demo');
assert(!/src="assets\/(?!terminal-demo\.svg|icon\.svg)/.test(README), 'README references an asset outside the release');

const cliHelp = childProcess.execFileSync(process.execPath, [path.join(ROOT, 'bin', 'citadel.js'), '--help'], { encoding: 'utf8' });
const stableCommands = new Set(['install', 'doctor', 'update', 'rollback', 'uninstall']);
for (const command of stableCommands) {
  assert(new RegExp(`^  ${command}\\b`, 'm').test(cliHelp), `release CLI help missing documented command ${command}`);
}
const documentedCommands = new Set();
for (const document of [README, INSTALL, CLI, PRIVACY, SECURITY]) {
  for (const match of document.matchAll(/\bcitadel\s+([a-z][a-z0-9-]*)/g)) documentedCommands.add(match[1]);
  for (const match of document.matchAll(/bin[\\/]citadel\.js["']?\s+([a-z][a-z0-9-]*)/g)) documentedCommands.add(match[1]);
}
for (const command of documentedCommands) {
  assert(stableCommands.has(command), `shipped docs advertise command absent from release CLI: citadel ${command}`);
}

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'citadel-public-install-'));
try {
  const target = path.join(temporary, 'target');
  fs.mkdirSync(target, { recursive: true });
  childProcess.execFileSync('git', ['init', '--quiet'], { cwd: target, windowsHide: true });

  const command = process.platform === 'win32'
    ? 'node "$env:CITADEL_ROOT\\scripts\\install.js" --runtime codex --install --dry-run --json'
    : 'node "$CITADEL_ROOT/scripts/install.js" --runtime codex --install --dry-run --json';
  const executable = process.platform === 'win32' ? 'powershell.exe' : '/bin/sh';
  const args = process.platform === 'win32' ? ['-NoProfile', '-Command', command] : ['-c', command];
  const result = childProcess.spawnSync(executable, args, {
    cwd: target,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: 30000,
    env: { ...process.env, CITADEL_ROOT: ROOT },
  });
  assert.strictEqual(result.status, 0, `documented installer path failed: ${result.stderr || result.stdout}`);
  const output = JSON.parse(result.stdout);
  assert.strictEqual(output.pass, true, 'documented installer did not return a passing dry-run plan');
  assert.strictEqual(output.dryRun, true, 'documented installer did not preserve dry-run mode');
  assert.strictEqual(output.installPlugin, true, 'documented Codex install must include native plugin installation');
  assert(output.steps.some((step) => step.name === 'Install Citadel Harness plugin with Codex CLI'
    && step.command.includes('codex plugin add citadel@citadel-local')),
  'documented Codex install did not plan the native plugin add command');
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

process.stdout.write(`public install path passed: immutable release trio, CLI help parity, outside-target plans, release-only links, and ${process.platform === 'win32' ? 'PowerShell' : 'shell'} installer path\n`);

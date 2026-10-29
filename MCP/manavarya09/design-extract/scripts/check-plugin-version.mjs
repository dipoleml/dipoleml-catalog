#!/usr/bin/env node
// Guard: the Claude-plugin manifests must stay in lockstep with package.json.
//
// They silently drifted 12 releases behind once (12.10.1 vs 12.22.0). This
// fails loud — in CI and via the test suite — so it can't happen again.

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf-8'));

export function checkPluginVersions() {
  const pkg = read('package.json');
  const plugin = read('.claude-plugin/plugin.json');
  const market = read('.claude-plugin/marketplace.json');
  const marketVersion = market.plugins?.[0]?.version;

  const problems = [];
  if (plugin.version !== pkg.version) {
    problems.push(`.claude-plugin/plugin.json is ${plugin.version}, expected ${pkg.version}`);
  }
  if (marketVersion !== pkg.version) {
    problems.push(`.claude-plugin/marketplace.json plugin is ${marketVersion}, expected ${pkg.version}`);
  }
  return { ok: problems.length === 0, version: pkg.version, problems };
}

// CLI entry: exit non-zero on drift.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { ok, version, problems } = checkPluginVersions();
  if (ok) {
    console.log(`✓ plugin manifests in sync at ${version}`);
  } else {
    console.error('✗ plugin version drift:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
}

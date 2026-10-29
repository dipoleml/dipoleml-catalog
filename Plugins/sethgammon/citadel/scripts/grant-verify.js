#!/usr/bin/env node
'use strict';
const childProcess = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const checks = Object.freeze([
  ['readiness-v1', 'scripts/application-readiness-benchmark.js', ['verify']],
  ['readiness-v2', 'scripts/capability-profile-benchmark.js', ['verify']],
  ['representative-v2', 'scripts/representative-operation-pilot-v2.js', ['verify']],
  ['prospective-economic', 'scripts/prospective-economic-pilot.js', ['verify']],
  ['hybrid-calibration', 'scripts/hybrid-economic-pilot.js', ['verify']],
  ['hybrid-v2', 'scripts/hybrid-economic-pilot-v2.js', ['verify']],
  ['public-holdout-pilot-tests', 'scripts/test-public-holdout-pilot.js', []],
  ['public-holdout-pilot', 'scripts/public-holdout-pilot.js', ['verify']],
  ['operation-control', 'scripts/operation-control-proof.js', ['verify']],
  ['prospective-runtime', 'scripts/operation-control-prospective.js', []],
  ['optimizer-bundle', 'scripts/optimizer-proof-bundle.js', ['verify', 'benchmarks/optimizer-proof/proof-bundle']],
  ['application-evidence', 'scripts/application-evidence.js', ['check']],
  ['fresh-clone', 'scripts/fresh-clone-onboarding-proof.js', ['verify']],
  ['claim-discipline', 'scripts/test-application-claim-discipline.js', []],
  ['application-package', 'scripts/test-sentient-application-package.js', []],
  ['application-media', 'scripts/test-application-media.js', []],
  ['site-story', 'scripts/test-citadel-site-story.js', []],
]);

function tail(value, lines = 3) { return String(value || '').trim().split(/\r?\n/).slice(-lines).join(' | '); }
function main() {
  const results = checks.map(([id, script, args]) => {
    const started = Date.now();
    const result = childProcess.spawnSync(process.execPath, [path.join(ROOT, script), ...args], { cwd: ROOT, encoding: 'utf8', shell: false, windowsHide: true, timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
    const item = { id, status: result.status === 0 && !result.error ? 'passed' : 'failed', duration_ms: Date.now() - started, command: `node ${script}${args.length ? ` ${args.join(' ')}` : ''}`, output_tail: tail(result.stdout), error_tail: tail(result.stderr), error: result.error ? result.error.message : null };
    process.stdout.write(`[${item.status === 'passed' ? 'PASS' : 'FAIL'}] ${id} (${item.duration_ms} ms)\n`);
    return item;
  });
  const summary = { schema: 1, kind: 'citadel-grant-verification', status: results.every((item) => item.status === 'passed') ? 'passed' : 'failed', checks: results.length, passed: results.filter((item) => item.status === 'passed').length, failed: results.filter((item) => item.status === 'failed').length, results };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (summary.status !== 'passed') process.exitCode = 1;
  return summary;
}
if (require.main === module) main();
module.exports = Object.freeze({ checks, main });

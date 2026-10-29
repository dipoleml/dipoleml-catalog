#!/usr/bin/env node
'use strict';
const assert = require('assert');
const childProcess = require('child_process');
const crypto = require('crypto');
const path = require('path');
const pilot = require('../core/application-readiness/prospective-economic-operation');

const repairs = {
  'docs-trace-flag': { 'README.md': '# Start the service\n\nFor a trace-enabled local start, run `CITADEL_TRACE=true npm run start`.\nThe trace is useful while diagnosing an operation.\n' },
  'docs-verify-command': { 'QUICKSTART.md': '# Quick verification\n\nAfter a run, use `citadel operation verify` to validate its evidence.\nThe command does not contact a model.\n' },
  'config-retry-numbers': { 'config/settings.json': '{\n  "schema": 3,\n  "service": "relay",\n  "enabled": true,\n  "retries": 4,\n  "backoff_ms": 250\n}\n' },
  'package-health-script': { 'package.json': '{\n  "name": "fixture-service",\n  "private": true,\n  "scripts": {\n    "start": "node server.js",\n    "test": "node test.js",\n    "health": "node scripts/health-check.js"\n  }\n}\n' },
  'bug-nullish-timeout': { 'src/timeout.js': "'use strict';\nfunction effectiveTimeout(value) {\n  return value === null || value === undefined ? 30 : value;\n}\nmodule.exports = { effectiveTimeout };\n" },
  'bug-inclusive-range': { 'src/range.js': "'use strict';\nfunction isWithinRange(value, minimum, maximum) {\n  return typeof value === 'number' && typeof minimum === 'number' && typeof maximum === 'number' && value >= minimum && value <= maximum;\n}\nmodule.exports = { isWithinRange };\n" },
  'bug-status-normalization': { 'src/status.js': "'use strict';\nfunction normalizeStatus(value) {\n  if (typeof value !== 'string') return 'unknown';\n  return value.trim().toLowerCase();\n}\nmodule.exports = { normalizeStatus };\n" },
  'api-formatter-alias': { 'src/format.js': "'use strict';\nfunction formatItem(item) {\n  return `${item.id}: ${item.label}`;\n}\nconst formatLegacy = formatItem;\nmodule.exports = { formatItem, formatLegacy };\n" },
  'parser-port-boundary': { 'src/port.js': "'use strict';\nfunction parsePort(value) {\n  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) return 3000;\n  const parsed = Number(value);\n  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535 ? parsed : 3000;\n}\nmodule.exports = { parsePort };\n" },
  'refactor-first-unique': { 'src/unique.js': "'use strict';\nfunction uniqueById(items) {\n  const seen = new Set();\n  return items.filter((item) => {\n    if (seen.has(item.id)) return false;\n    seen.add(item.id);\n    return true;\n  });\n}\nmodule.exports = { uniqueById };\n" },
  'security-header-crlf': { 'src/header.js': "'use strict';\nfunction safeHeaderValue(value) {\n  if (typeof value !== 'string' || /[\\r\\n]/.test(value)) return null;\n  return value;\n}\nmodule.exports = { safeHeaderValue };\n" },
  'security-local-redirect': { 'src/redirect.js': "'use strict';\nfunction isLocalRedirect(value) {\n  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');\n}\nmodule.exports = { isLocalRedirect };\n" },
};

const values = pilot.scenarios();
assert.strictEqual(values.length, 12);
assert.strictEqual(pilot.stableSchedule().length, 24);
assert.strictEqual(new Set(pilot.stableSchedule().map((cell) => `${cell.scenario_id}/${cell.policy_id}`)).size, 24);
assert.strictEqual(values.filter((scenario) => scenario.risk === 'high').length, 2);
assert(pilot.sourceFiles().includes('core/operation-control/contracts.js'));

for (const scenario of values) {
  const fixture = path.join(pilot.BENCHMARK, 'fixtures', scenario.fixture);
  const broken = childProcess.spawnSync(scenario.verifier[0], scenario.verifier.slice(1), { cwd: fixture, encoding: 'utf8', shell: false, windowsHide: true });
  assert.notStrictEqual(broken.status, 0, `${scenario.id} must begin broken`);
  const output = JSON.stringify({ files: repairs[scenario.id] });
  assert.strictEqual(pilot.evaluateRepositoryOutput(scenario, output).status, 'passed', `${scenario.id} reference repair must verify`);
}

const pair = crypto.generateKeyPairSync('ed25519');
const privateKey = pair.privateKey.export({ type: 'pkcs8', format: 'pem' });
const freeze = pilot.createFreeze(pilot.publicKeyFromPrivate(privateKey), '2026-08-02T00:00:00.000Z');
pilot.validateFreeze(freeze);
const scenario = values[0];
const repair = JSON.stringify({ files: repairs[scenario.id] });
const attempt = { ...pilot.createAttempt({ scenario, tier: 'strong', response: { done: true, model: pilot.MODELS.strong.model, done_reason: 'stop', message: { content: repair }, prompt_eval_count: 20, eval_count: 10, total_duration: 123 }, startedAt: '2026-08-02T00:00:01.000Z', durationMs: 1000, gpu: { energy_kwh: 0.00001, samples: 2, average_watts: 36 } }), attempt: 1 };
const scheduleCell = { order: 0, scenario_id: scenario.id, policy_id: pilot.POLICIES[0], repetition: 1 };
const cell = pilot.buildCell({ scheduleCell, scenario, route: pilot.routeFor(scheduleCell.policy_id, scenario), attempts: [attempt], previousCellDigest: null, privateKey });
pilot.verifyCell(cell, scheduleCell, scenario, freeze);
process.stdout.write('prospective economic pilot contract passed: 12 broken fixtures, 12 reference repairs, frozen routes, source closure, signing, and replay\n');

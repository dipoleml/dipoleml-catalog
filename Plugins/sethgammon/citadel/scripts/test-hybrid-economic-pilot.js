#!/usr/bin/env node
'use strict';
const assert = require('assert');
const childProcess = require('child_process');
const crypto = require('crypto');
const path = require('path');
const pilot = require('../core/application-readiness/hybrid-economic-operation');

const repairs = {
  'docs-audit-command': { 'GETTING_STARTED.md': '# Verify an operation\n\nRun `citadel operation audit` after the operation completes.\nThis check does not ask the model to grade itself.\n' },
  'docs-cache-variable': { 'README.md': '# Cache location\n\nSet `CITADEL_CACHE_DIR=.citadel/cache` to move the operation cache.\nThe directory is created on first use.\n' },
  'config-feature-boolean': { 'config/features.json': '{\n  "schema": 4,\n  "service": "controller",\n  "audit_enabled": true,\n  "dry_run": false\n}\n' },
  'package-diagnose-script': { 'package.json': '{\n  "name": "hybrid-fixture",\n  "private": true,\n  "scripts": {\n    "start": "node index.js",\n    "verify": "node verify.js",\n    "diagnose": "node scripts/diagnose.js --json"\n  }\n}\n' },
  'bug-zero-retry-delay': { 'src/retry.js': "'use strict';\nfunction retryDelay(value) {\n  return value === null || value === undefined ? 250 : value;\n}\nmodule.exports = { retryDelay };\n" },
  'bug-case-insensitive-header': { 'src/headers.js': "'use strict';\nfunction readHeader(entries, name) {\n  if (!Array.isArray(entries) || typeof name !== 'string') return null;\n  const target = name.toLowerCase();\n  const found = entries.find((entry) => entry && typeof entry.name === 'string' && entry.name.toLowerCase() === target);\n  return found ? found.value : null;\n}\nmodule.exports = { readHeader };\n" },
  'parser-positive-count': { 'src/count.js': "'use strict';\nfunction parseCount(value) {\n  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) return 1;\n  const parsed = Number(value);\n  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 1000 ? parsed : 1;\n}\nmodule.exports = { parseCount };\n" },
  'refactor-first-tag': { 'src/tags.js': "'use strict';\nfunction uniqueTags(tags) {\n  const seen = new Set();\n  return tags.filter((tag) => {\n    const key = tag.toLowerCase();\n    if (seen.has(key)) return false;\n    seen.add(key);\n    return true;\n  });\n}\nmodule.exports = { uniqueTags };\n" },
  'security-bearer-token': { 'src/auth.js': "'use strict';\nfunction parseBearer(value) {\n  if (typeof value !== 'string') return null;\n  const match = /^Bearer +(\\S+)$/i.exec(value);\n  return match ? match[1] : null;\n}\nmodule.exports = { parseBearer };\n" },
  'security-prototype-keys': { 'src/copy.js': "'use strict';\nfunction copySafeOwn(input) {\n  const output = {};\n  const blocked = new Set(['__proto__', 'constructor', 'prototype']);\n  for (const key of Object.keys(input)) if (!blocked.has(key)) output[key] = input[key];\n  return output;\n}\nmodule.exports = { copySafeOwn };\n" },
  'security-filename-boundary': { 'src/filename.js': "'use strict';\nfunction isSafeFilename(value) {\n  return typeof value === 'string' && value.length > 0 && value !== '.' && value !== '..' && !/[\\/\\\\\\0]/.test(value);\n}\nmodule.exports = { isSafeFilename };\n" },
  'api-parser-alias': { 'src/parser.js': "'use strict';\nfunction parseRecord(text) {\n  return JSON.parse(text);\n}\nconst parseLegacy = parseRecord;\nmodule.exports = { parseRecord, parseLegacy };\n", 'src/consumer.js': "'use strict';\nconst { parseRecord } = require('./parser');\nfunction loadRecord(text) {\n  return parseRecord(text);\n}\nmodule.exports = { loadRecord };\n" },
};

const values = pilot.scenarios();
assert.strictEqual(values.length, 12);
assert.strictEqual(pilot.stableSchedule().length, 24);
for (const risk of ['low', 'moderate', 'high']) assert.strictEqual(values.filter((scenario) => scenario.risk === risk).length, 4);
assert.strictEqual(new Set(pilot.stableSchedule().map((cell) => `${cell.scenario_id}/${cell.policy_id}`)).size, 24);
assert(pilot.sourceFiles().includes('core/operation-control/receipt.js'));

for (const scenario of values) {
  const fixture = path.join(pilot.BENCHMARK, 'fixtures', scenario.fixture);
  const broken = childProcess.spawnSync(scenario.verifier[0], scenario.verifier.slice(1), { cwd: fixture, encoding: 'utf8', shell: false, windowsHide: true });
  assert.notStrictEqual(broken.status, 0, `${scenario.id} must begin broken`);
  assert.strictEqual(pilot.evaluateRepositoryOutput(scenario, JSON.stringify({ files: repairs[scenario.id] })).status, 'passed', `${scenario.id} reference repair must verify`);
}

const pair = crypto.generateKeyPairSync('ed25519');
const privateKey = pair.privateKey.export({ type: 'pkcs8', format: 'pem' });
const freeze = pilot.createFreeze(pilot.publicKeyFromPrivate(privateKey), '2026-08-02T00:00:00.000Z');
pilot.validateFreeze(freeze);
const scenario = values[0];
const outputText = JSON.stringify({ files: repairs[scenario.id] });
const attempt = { ...pilot.createAttempt({ scenario, tier: 'cloud', outputText, identity: { status: 'verified', runtime: pilot.MODELS.cloud.runtime, requested_model: pilot.MODELS.cloud.requested_model, canonical_model: pilot.MODELS.cloud.canonical_model }, usage: { input_tokens: 20, output_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }, economics: { comparison_cost: { status: 'provider-reported-equivalent', total_usd: 0.001, source: 'test' }, provider_reported_equivalent_cost: { status: 'provider-reported-equivalent', amount_usd: 0.001, source: 'test' }, local_gpu_energy: { status: 'not-applicable', energy_kwh: 0, samples: 0, average_watts: null }, actual_subscription_cash: { status: 'unknown', amount_usd: null, source: 'test' } }, startedAt: '2026-08-02T00:00:01.000Z', durationMs: 1000 }), attempt: 1 };
const scheduleCell = { order: 0, scenario_id: scenario.id, policy_id: pilot.POLICIES[0], repetition: 1 };
const cell = pilot.buildCell({ scheduleCell, scenario, route: pilot.routeFor(scheduleCell.policy_id, scenario), attempts: [attempt], previousCellDigest: null, privateKey });
pilot.verifyCell(cell, scheduleCell, scenario, freeze);
process.stdout.write('hybrid economic pilot contract passed: 12 fresh broken fixtures, 12 reference repairs, frozen routes, signing, and replay\n');

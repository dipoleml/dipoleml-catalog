#!/usr/bin/env node
/**
 * test-demo.js — Demo page embarrassment check
 *
 * Extracts the routing logic from docs/index.html and verifies:
 *   1. All generator POOLS examples route to the tier/color they advertise
 *   2. All how-section examples route to the tier/color they advertise
 *   3. Spot-checks common "obviously wrong" inputs (regression guard)
 *
 * Run: node scripts/test-demo.js
 * Exit 0 = clean, Exit 1 = embarrassing bugs found
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { DETERMINISTIC_COMMANDS, normalizeRoutingInput } = require('../core/skills/routing');

const HTML_PATH = path.resolve(__dirname, '..', 'docs', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

// ── Extract routing JS from HTML ──────────────────────────────────────────────

function extractBetween(src, startMarker, endMarker) {
  let si = src.indexOf(startMarker);
  if (si === -1) return null;
  si = src.indexOf('\n', si); // skip past the comment line's trailing chars
  const ei = src.indexOf(endMarker, si);
  if (ei === -1) return null;
  return src.slice(si + 1, ei);
}

// TIER0, TIER2, TIER3, and route() live between these two comment anchors
const routeBlock = extractBetween(html, '// ─── Routing logic ─', '// ─── Static exact/candidate preview ─');
if (!routeBlock) {
  console.error('FATAL: Could not locate routing block in docs/index.html');
  process.exit(1);
}

const vm = require('vm');

let route, POOLS;
try {
  route = vm.runInNewContext(routeBlock + '\nroute;', {});
} catch (e) {
  console.error('FATAL: Could not execute routing block:', e.message);
  process.exit(1);
}

// POOLS lives nearby — find it
const poolsBlock = extractBetween(html, 'const POOLS = {', '};');
if (!poolsBlock) {
  console.error('FATAL: Could not locate POOLS in docs/index.html');
  process.exit(1);
}
try {
  POOLS = vm.runInNewContext('({' + poolsBlock + '})', {});
} catch (e) {
  console.error('FATAL: Could not execute POOLS:', e.message);
  process.exit(1);
}

// ── Expected decision boundary per generator category ────────────────────────

const POOL_EXPECTATIONS = {
  instant:  { final: true, tier: 0, label: 'exact deterministic command' },
  skill:    { final: false, candidates: true, label: 'skill candidate evidence' },
  fleet:    { final: false, candidates: true, label: 'parallel candidate evidence' },
  campaign: { final: false, candidates: true, label: 'persistence candidate evidence' },
};

// ── How-section examples ──────────────────────────────────────────────────────
// Parse data-cmd attributes and their expected color from style="--ex-color:..."

// Attributes appear in either order in the HTML, so match both
const HOW_EXAMPLE_RE = /(?:data-cmd="([^"]+)"[^>]*style="--ex-color:([^";]+)"|style="--ex-color:([^";]+)"[^>]*data-cmd="([^"]+)")/g;
const howExamples = [];
let m;
while ((m = HOW_EXAMPLE_RE.exec(html)) !== null) {
  // Groups 1+2 = data-cmd first; groups 4+3 = style first
  const cmd   = (m[1] || m[4]).trim();
  const color = (m[2] || m[3]).trim();
  howExamples.push({ cmd, expectedColor: color });
}

// ── Spot-check regressions ────────────────────────────────────────────────────
const SPOT_CHECKS = [
  { input: 'generate tests', final: false, candidate: '/test-gen', label: 'test generation stays semantic' },
  { input: 'build me a recipe app', final: false, candidate: '/create-app', label: 'feature build stays semantic' },
  { input: 'test the app', final: false, candidate: '/qa', label: 'browser QA stays semantic' },
  { input: 'review README.md', final: false, candidate: '/review', label: 'review/readme collision stays semantic' },
  { input: 'scaffold a new dashboard component', final: false, candidate: '/scaffold', label: 'scaffold/dashboard collision stays semantic' },
  { input: 'status page feature', final: false, forbiddenTool: '/dashboard', label: 'status inside a task is not Tier 0' },
  { input: 'continue implementing auth', final: false, forbiddenTool: '/do continue', label: 'continue inside a task is not Tier 0' },
  { input: 'rename Foo to Bar', final: false, candidate: '/refactor', label: 'rename request needs semantic confirmation' },
  { input: '@citadel inspect this marker', final: false, candidate: '/watch', label: '@citadel marker matches watch' },
  { input: 'use multiple agents in parallel', final: false, candidate: '/fleet --quick', label: 'Fleet candidate uses its canonical quick route' },
];

// ── Run checks ────────────────────────────────────────────────────────────────

let pass = 0, fail = 0;
const failures = [];

function check(cmd, expectation, label, source) {
  const result = route(cmd);
  const errors = [];
  if (expectation.final !== undefined && result.final !== expectation.final) {
    errors.push(`final=${result.final}, expected ${expectation.final}`);
  }
  if (expectation.tier !== undefined && result.tier !== expectation.tier) {
    errors.push(`tier=${result.tier}, expected ${expectation.tier}`);
  }
  if (expectation.tool && result.tool !== expectation.tool) {
    errors.push(`tool=${result.tool}, expected ${expectation.tool}`);
  }
  if (expectation.forbiddenTool && result.tool === expectation.forbiddenTool) {
    errors.push(`forbidden tool=${result.tool}`);
  }
  if (expectation.candidates === true && (!Array.isArray(result.candidates) || result.candidates.length === 0)) {
    errors.push('expected candidate evidence');
  }
  if (expectation.candidate && (!Array.isArray(result.candidates) || !result.candidates.includes(expectation.candidate))) {
    errors.push(`missing candidate ${expectation.candidate}`);
  }
  if (result.final === false) {
    if (result.command !== null) errors.push(`non-final command must be null, got ${result.command}`);
    if (result.canRunNow !== false) errors.push(`non-final canRunNow must be false, got ${result.canRunNow}`);
    if (result.boundary !== 'semantic-classification-required') errors.push(`non-final boundary=${result.boundary}`);
  }
  if (errors.length === 0) {
    pass++;
  } else {
    fail++;
    failures.push(`  ✗ [${source}] "${cmd}"\n    ${errors.join('; ')}\n    → ${label}`);
  }
}

// Pool checks
for (const [pool, exp] of Object.entries(POOL_EXPECTATIONS)) {
  const items = POOLS[pool];
  if (!items) { console.warn(`WARN: POOLS.${pool} not found — skipping`); continue; }
  for (const cmd of items) {
    check(cmd, exp, exp.label, `pool:${pool}`);
  }
}

// How-section example checks
const exactPhrases = new Set(DETERMINISTIC_COMMANDS.flatMap((entry) => entry.phrases.map(normalizeRoutingInput)));
for (const { cmd } of howExamples) {
  const normalized = normalizeRoutingInput(cmd);
  const exactEntry = DETERMINISTIC_COMMANDS.find((entry) => entry.phrases.includes(normalized));
  const final = Boolean(exactEntry && !exactEntry.projectScript);
  check(cmd, { final, ...(exactPhrases.has(normalized) ? { tier: 0 } : {}) }, final ? 'exact command example' : 'non-executable preview example', 'how-section');
}

// Spot-check regressions
for (const item of SPOT_CHECKS) {
  check(item.input, item, item.label, 'spot-check');
}

// Target package commands remain non-final because the browser has no target
// project context; all other generated exact commands remain final.
const targetProjectCommands = new Set(['test', 'build', 'typecheck']);
for (const entry of DETERMINISTIC_COMMANDS) {
  for (const phrase of entry.phrases) {
    if (targetProjectCommands.has(entry.id)) {
      check(phrase, { final: false, tier: 0 }, `target capability required for ${entry.id}`, 'exact-contract');
    } else {
      const expectedTool = entry.selected === 'direct-command' ? entry.command : entry.selected;
      check(phrase, { final: true, tier: 0, tool: expectedTool }, `shared exact command ${entry.id}`, 'exact-contract');
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log('\nDemo page routing check');
console.log('='.repeat(40));
console.log(`  Pool examples:     ${Object.values(POOLS).flat().length}`);
console.log(`  How-section cards: ${howExamples.length}`);
console.log(`  Spot-checks:       ${SPOT_CHECKS.length}`);
console.log('');

if (fail === 0) {
  console.log(`  ✓ All ${pass} checks pass — nothing embarrassing found.\n`);
  process.exit(0);
} else {
  console.log(`  ${pass} passed, ${fail} FAILED\n`);
  for (const f of failures) console.log(f);
  console.log('\nFix the routing rules in docs/index.html before shipping.\n');
  process.exit(1);
}

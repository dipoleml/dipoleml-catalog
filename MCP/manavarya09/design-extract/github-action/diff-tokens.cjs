#!/usr/bin/env node
// Minimal diff for DTCG-shaped (and legacy) design-tokens.json files.
// Usage: node diff-tokens.js <baseline.json> <new.json>
//
// Emits markdown to stdout. Each `- {path}: {from} → {to}` line is one changed
// token; the action's outputs key off these lines.

const { readFileSync } = require('fs');

function load(p) {
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch (e) { console.error(`Failed to read ${p}: ${e.message}`); process.exit(0); }
}

// DTCG leaves are `{ "$value": ..., "$type": ... }`. Legacy leaves are strings
// or primitives. Normalise into a flat `{ path: value }` map.
function flatten(node, path, out) {
  if (node == null) return;
  if (typeof node !== 'object') {
    out[path] = node;
    return;
  }
  if ('$value' in node && (typeof node.$value !== 'object' || node.$value === null)) {
    out[path] = node.$value;
    return;
  }
  if (Array.isArray(node)) {
    out[path] = JSON.stringify(node);
    return;
  }
  for (const key of Object.keys(node)) {
    if (key.startsWith('$')) continue;
    flatten(node[key], path ? `${path}.${key}` : key, out);
  }
}

const [baselinePath, newPath] = process.argv.slice(2);
const baseline = load(baselinePath);
const next = load(newPath);

const a = {};
const b = {};
flatten(baseline, '', a);
flatten(next, '', b);

const added = [];
const removed = [];
const changed = [];

for (const k of Object.keys(b)) {
  if (!(k in a)) added.push([k, b[k]]);
  else if (a[k] !== b[k]) changed.push([k, a[k], b[k]]);
}
for (const k of Object.keys(a)) {
  if (!(k in b)) removed.push([k, a[k]]);
}

const total = added.length + removed.length + changed.length;

if (total === 0) {
  console.log('**No design token changes** — the extracted design matches the baseline.');
  process.exit(0);
}

console.log(`**${total} token changes** vs baseline (${changed.length} changed, ${added.length} added, ${removed.length} removed).`);
console.log('');
if (changed.length) {
  console.log('#### Changed');
  for (const [k, from, to] of changed) console.log(`- \`${k}\`: \`${from}\` → \`${to}\``);
  console.log('');
}
if (added.length) {
  console.log('#### Added');
  for (const [k, v] of added) console.log(`- \`${k}\`: \`${v}\``);
  console.log('');
}
if (removed.length) {
  console.log('#### Removed');
  for (const [k, v] of removed) console.log(`- \`${k}\` (was \`${v}\`)`);
  console.log('');
}

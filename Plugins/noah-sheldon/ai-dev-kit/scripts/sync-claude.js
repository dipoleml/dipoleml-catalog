#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const target = path.join(root, '.claude');
fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(path.join(target, 'README.md'), '# Claude Sync\n\nKeep Claude surfaces aligned with the canonical repo files.\n');
console.log('Claude sync surface ready.');

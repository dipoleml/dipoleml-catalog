#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const target = path.join(root, '.codex');
fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(path.join(target, 'README.md'), '# Codex Sync\n\nKeep Codex surfaces aligned with the canonical repo files.\n');
console.log('Codex sync surface ready.');

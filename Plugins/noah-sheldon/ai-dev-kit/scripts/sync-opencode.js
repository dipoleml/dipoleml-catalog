#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const target = path.join(root, '.opencode');
fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(path.join(target, 'SYNC.md'), '# OpenCode Sync\n\nKeep OpenCode surfaces aligned with the canonical repo files.\n');
console.log('OpenCode sync surface ready.');

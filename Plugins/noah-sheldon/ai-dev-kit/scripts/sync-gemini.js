#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const target = path.join(root, '.gemini');
fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(path.join(target, 'README.md'), '# Gemini Sync\n\nKeep Gemini surfaces aligned with the canonical repo files.\n');
console.log('Gemini sync surface ready.');

'use strict';

const fs = require('fs');
const path = require('path');
const { resolveTarget } = require('../distribution/fs-safety');
const { digestBytes } = require('./contracts');

const ADOPTION_DIR = '.citadel/adoption';
const ACTIVE_RECEIPT = `${ADOPTION_DIR}/active.json`;
const LOCK_PATH = '.citadel/.adoption-lock';
const ARCHIVE_DIR = '.planning/adoption-archives';

function normalize(relativePath) {
  return relativePath.replace(/\\/g, '/');
}

function snapshot(root, relativePath) {
  const candidate = resolveTarget(root, relativePath, 'adoption footprint');
  if (!fs.existsSync(candidate)) return { exists: false, digest: null, bytes: 0 };
  const stat = fs.lstatSync(candidate);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`Adoption footprint path must be a plain file: ${relativePath}`);
  }
  const content = fs.readFileSync(candidate);
  return { exists: true, digest: digestBytes(content), bytes: content.length };
}

function readExact(root, relativePath) {
  const current = snapshot(root, relativePath);
  if (!current.exists) return null;
  return fs.readFileSync(resolveTarget(root, relativePath, 'adoption footprint'));
}

function ensurePlainParent(root, candidate) {
  const relative = path.relative(root, path.dirname(candidate));
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) fs.mkdirSync(current);
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`Adoption parent is not a plain directory: ${current}`);
    }
  }
}

function atomicCreate(root, relativePath, content) {
  const candidate = resolveTarget(root, relativePath, 'adoption create');
  if (fs.existsSync(candidate)) throw new Error(`Refusing to overwrite existing path: ${relativePath}`);
  ensurePlainParent(root, candidate);
  const temporary = `${candidate}.tmp-${process.pid}-${Date.now()}`;
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, content);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, candidate);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return snapshot(root, relativePath);
}

function atomicReplace(root, relativePath, expected, content) {
  const candidate = resolveTarget(root, relativePath, 'adoption replace');
  const current = snapshot(root, relativePath);
  if (!current.exists || current.digest !== expected.digest || current.bytes !== expected.bytes) {
    throw new Error(`Refusing to replace drifted path: ${relativePath}`);
  }
  const temporary = `${candidate}.tmp-${process.pid}-${Date.now()}`;
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, content);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, candidate);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return snapshot(root, relativePath);
}

function removeIfExact(root, relativePath, expected) {
  const current = snapshot(root, relativePath);
  if (!current.exists) return { removed: false, reason: 'missing', current };
  if (current.digest !== expected.digest || current.bytes !== expected.bytes) {
    return { removed: false, reason: 'modified', current };
  }
  fs.unlinkSync(resolveTarget(root, relativePath, 'adoption removal'));
  return { removed: true, reason: null, current };
}

function cleanEmptyParents(root, relativePath, stopRelative = '') {
  const stop = path.resolve(root, stopRelative);
  let current = path.dirname(resolveTarget(root, relativePath, 'cleanup path'));
  while (current !== root && current !== stop && current.startsWith(`${root}${path.sep}`)) {
    if (!fs.existsSync(current) || fs.readdirSync(current).length) break;
    fs.rmdirSync(current);
    current = path.dirname(current);
  }
}

function portableState(root) {
  const planning = path.join(root, '.planning');
  const entries = [];
  if (!fs.existsSync(planning)) return entries;
  const planningStat = fs.lstatSync(planning);
  if (planningStat.isSymbolicLink()) {
    return [{ path: '.planning', kind: 'symlink', digest: null, bytes: 0, content_base64: null }];
  }
  if (!planningStat.isDirectory()) {
    return [{ path: '.planning', kind: 'other', digest: null, bytes: 0, content_base64: null }];
  }
  const visit = (directory) => {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, item.name);
      const relative = normalize(path.relative(root, absolute));
      if (relative === ARCHIVE_DIR || relative.startsWith(`${ARCHIVE_DIR}/`)) continue;
      if (item.isSymbolicLink()) {
        entries.push({ path: relative, kind: 'symlink', digest: null, bytes: 0, content_base64: null });
      } else if (item.isDirectory()) {
        visit(absolute);
      } else if (item.isFile()) {
        const content = fs.readFileSync(absolute);
        entries.push({
          path: relative, kind: 'file', digest: digestBytes(content),
          bytes: content.length, content_base64: content.toString('base64'),
        });
      }
    }
  };
  visit(planning);
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

module.exports = Object.freeze({
  ACTIVE_RECEIPT, ADOPTION_DIR, ARCHIVE_DIR, LOCK_PATH, atomicCreate,
  atomicReplace, cleanEmptyParents, normalize, portableState, readExact,
  removeIfExact, snapshot,
});

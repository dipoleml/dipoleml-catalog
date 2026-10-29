#!/usr/bin/env node

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { parseTar, verifyRelease } = require('./release-verify');

const ROOT = path.resolve(__dirname, '..');
const OWNERSHIP_MANIFEST = '.citadel-release.json';
const BACKUP_RECEIPT = '.citadel-backup.json';

function arg(name, fallback = null) {
  const inline = process.argv.find((value) => value.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`Invalid ${label}: ${error.message}`);
  }
}

function readVersion(directory) {
  try {
    return readJson(path.join(directory, 'package.json'), 'package.json').version;
  } catch {
    return 'unknown';
  }
}

function canonicalPath(input) {
  const resolved = fs.existsSync(input) ? fs.realpathSync.native(input) : path.resolve(input);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function safeTarget(input) {
  const target = path.resolve(input);
  const parsed = path.parse(target);
  if (target === parsed.root || canonicalPath(target) === canonicalPath(os.homedir())) {
    throw new Error(`Refusing unsafe update target: ${target}`);
  }
  const packagePath = path.join(target, 'package.json');
  if (!fs.existsSync(packagePath)) throw new Error(`Update target has no package.json: ${target}`);
  const pkg = readJson(packagePath, 'target package.json');
  if (pkg.name !== 'citadel') throw new Error(`Update target is not a Citadel installation: ${target}`);
  return target;
}

function safeRelative(input) {
  const relative = String(input || '').replace(/\\/g, '/');
  if (!relative || relative.startsWith('/') || /^[A-Za-z]:/.test(relative)) {
    throw new Error(`Unsafe ownership path: ${input}`);
  }
  const parts = relative.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Unsafe ownership path: ${input}`);
  }
  return parts.join('/');
}

function ownedPath(root, relative) {
  const normalized = safeRelative(relative);
  const absoluteRoot = path.resolve(root);
  const absolute = path.resolve(absoluteRoot, ...normalized.split('/'));
  if (!absolute.startsWith(`${absoluteRoot}${path.sep}`)) throw new Error(`Unsafe ownership path: ${relative}`);
  return absolute;
}

function assertNoSymlinkParents(root, relative) {
  const parts = safeRelative(relative).split('/');
  let cursor = path.resolve(root);
  for (const part of parts) {
    cursor = path.join(cursor, part);
    if (!fs.existsSync(cursor)) continue;
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink()) throw new Error(`Refusing symbolic-link release path: ${relative}`);
  }
}

function readOwnership(directory, options = {}) {
  const manifestPath = path.join(directory, OWNERSHIP_MANIFEST);
  if (!fs.existsSync(manifestPath)) {
    if (options.required !== false) {
      throw new Error(`Citadel ownership manifest is required: ${manifestPath}`);
    }
    return null;
  }
  const manifest = readJson(manifestPath, 'Citadel ownership manifest');
  if (manifest.schema !== 1 || typeof manifest.version !== 'string' || !Array.isArray(manifest.files)) {
    throw new Error(`Invalid Citadel ownership manifest: ${manifestPath}`);
  }
  const records = new Map();
  for (const entry of manifest.files) {
    const relative = safeRelative(entry?.path);
    if (relative === OWNERSHIP_MANIFEST || relative === BACKUP_RECEIPT || records.has(relative)) {
      throw new Error(`Invalid or duplicate ownership path: ${relative}`);
    }
    if (!/^[0-9a-f]{64}$/.test(entry.sha256 || '') || !Number.isInteger(entry.bytes) || entry.bytes < 0) {
      throw new Error(`Invalid ownership record: ${relative}`);
    }
    records.set(relative, entry);
    const absolute = ownedPath(directory, relative);
    assertNoSymlinkParents(directory, relative);
    if (!fs.existsSync(absolute)) {
      if (options.requireFiles) throw new Error(`Owned release file is missing: ${relative}`);
      continue;
    }
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile()) throw new Error(`Owned release path is not a regular file: ${relative}`);
    const data = fs.readFileSync(absolute);
    if (data.length !== entry.bytes || sha256(data) !== entry.sha256) {
      throw new Error(`Owned release path changed since installation: ${relative}`);
    }
  }
  return { manifest, manifestPath, records };
}

function copyFile(source, target, mode = null) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  if (mode !== null && process.platform !== 'win32') fs.chmodSync(target, mode & 0o777);
}

function copyOwnership(sourceRoot, targetRoot, ownership) {
  fs.mkdirSync(targetRoot, { recursive: true });
  for (const [relative, entry] of ownership.records) {
    copyFile(ownedPath(sourceRoot, relative), ownedPath(targetRoot, relative), entry.mode);
  }
  copyFile(path.join(sourceRoot, OWNERSHIP_MANIFEST), path.join(targetRoot, OWNERSHIP_MANIFEST));
}

function removeIfEmpty(directory, stop) {
  let cursor = directory;
  while (cursor.startsWith(`${stop}${path.sep}`) && cursor !== stop) {
    if (!fs.existsSync(cursor) || fs.readdirSync(cursor).length > 0) return;
    fs.rmdirSync(cursor);
    cursor = path.dirname(cursor);
  }
}

function preflightTransition(target, current, incoming) {
  for (const relative of incoming.records.keys()) {
    assertNoSymlinkParents(target, relative);
    const destination = ownedPath(target, relative);
    if (fs.existsSync(destination) && !current.records.has(relative)) {
      throw new Error(`Unowned path conflict blocks lifecycle mutation: ${relative}`);
    }
  }
}

function replaceOwned(target, sourceRoot, current, incoming) {
  preflightTransition(target, current, incoming);
  const stale = [...current.records.keys()].filter((relative) => !incoming.records.has(relative));
  for (const relative of stale.sort((left, right) => right.length - left.length)) {
    const destination = ownedPath(target, relative);
    if (fs.existsSync(destination)) {
      const stat = fs.lstatSync(destination);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Refusing to remove non-file owned path: ${relative}`);
      fs.unlinkSync(destination);
      removeIfEmpty(path.dirname(destination), path.resolve(target));
    }
  }
  for (const [relative, entry] of incoming.records) {
    copyFile(ownedPath(sourceRoot, relative), ownedPath(target, relative), entry.mode);
  }
  copyFile(path.join(sourceRoot, OWNERSHIP_MANIFEST), path.join(target, OWNERSHIP_MANIFEST));
}

function restoreOwned(target, snapshotRoot, previous, attempted) {
  const paths = new Set([...previous.records.keys(), ...attempted.records.keys()]);
  for (const relative of [...paths].sort((left, right) => right.length - left.length)) {
    const destination = ownedPath(target, relative);
    if (fs.existsSync(destination) && fs.lstatSync(destination).isFile()) {
      fs.unlinkSync(destination);
      removeIfEmpty(path.dirname(destination), path.resolve(target));
    }
  }
  copyOwnership(snapshotRoot, target, previous);
}

function extractArchive(archivePath, destination) {
  const files = parseTar(zlib.gunzipSync(fs.readFileSync(archivePath)));
  const roots = [...new Set([...files.keys()].map((name) => name.split('/')[0]))];
  if (roots.length !== 1) throw new Error('Update archive must contain one root directory');
  for (const [name, data] of files) {
    const relative = name.slice(roots[0].length + 1);
    if (!relative) continue;
    const output = ownedPath(destination, relative);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, data);
  }
}

function withExtractedArchive(archivePath, callback) {
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'citadel-update-stage-'));
  try {
    extractArchive(archivePath, stage);
    const ownership = readOwnership(stage, { requireFiles: true });
    return callback(stage, ownership);
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

function snapshotDigest(directory, ownership) {
  const entries = [[OWNERSHIP_MANIFEST, fs.readFileSync(path.join(directory, OWNERSHIP_MANIFEST))]];
  for (const relative of ownership.records.keys()) entries.push([relative, fs.readFileSync(ownedPath(directory, relative))]);
  entries.sort(([left], [right]) => left.localeCompare(right));
  const hash = crypto.createHash('sha256');
  for (const [relative, data] of entries) {
    hash.update(relative, 'utf8');
    hash.update(Buffer.from([0]));
    hash.update(String(data.length), 'utf8');
    hash.update(Buffer.from([0]));
    hash.update(sha256(data), 'ascii');
    hash.update(Buffer.from([0]));
  }
  return hash.digest('hex');
}

function writeBackup(target, backupPath, current, replacement) {
  if (fs.existsSync(backupPath)) throw new Error(`Backup already exists: ${backupPath}`);
  copyOwnership(target, backupPath, current);
  const receipt = {
    schema: 1,
    kind: 'citadel-release-backup',
    created_at: new Date().toISOString(),
    backup_path: canonicalPath(backupPath),
    target_binding: canonicalPath(target),
    source: {
      version: current.manifest.version,
      ref: current.manifest.ref || null,
      commit: current.manifest.commit || null,
    },
    replacement: {
      version: replacement.version,
      ref: replacement.ref || null,
      commit: replacement.commit || null,
    },
    content_sha256: snapshotDigest(backupPath, current),
  };
  fs.writeFileSync(path.join(backupPath, BACKUP_RECEIPT), `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}

function readBackup(backupPath, target) {
  const backup = path.resolve(backupPath);
  const receiptPath = path.join(backup, BACKUP_RECEIPT);
  if (!fs.existsSync(receiptPath)) throw new Error(`Rollback requires a Citadel backup receipt: ${receiptPath}`);
  const receipt = readJson(receiptPath, 'Citadel backup receipt');
  if (receipt.schema !== 1 || receipt.kind !== 'citadel-release-backup') {
    throw new Error(`Invalid Citadel backup receipt: ${receiptPath}`);
  }
  if (receipt.backup_path !== canonicalPath(backup)) throw new Error('Rollback backup path binding does not match receipt');
  if (receipt.target_binding !== canonicalPath(target)) throw new Error('Rollback target binding does not match receipt');
  let ownership;
  try {
    ownership = readOwnership(backup, { requireFiles: true });
  } catch (error) {
    throw new Error(`Rollback backup content digest mismatch: ${error.message}`);
  }
  const digest = snapshotDigest(backup, ownership);
  if (digest !== receipt.content_sha256) throw new Error('Rollback backup content digest mismatch');
  if (receipt.source?.version !== ownership.manifest.version
      || receipt.source?.commit !== (ownership.manifest.commit || null)) {
    throw new Error('Rollback backup source identity does not match ownership manifest');
  }
  return { backup, ownership, receipt };
}

function backupNameFor(target, current, replacement) {
  const sourceCommit = String(current.manifest.commit || 'unknown').slice(0, 12);
  const replacementCommit = String(replacement.commit || 'unknown').slice(0, 12);
  return `${path.basename(target)}-${current.manifest.version}-${sourceCommit}-before-${replacement.version}-${replacementCommit}`;
}

function updatePlan({ target, archivePath, rollbackPath }) {
  const current = readOwnership(target, { requireFiles: false });
  const currentVersion = readVersion(target);
  if (current.manifest.version !== currentVersion) {
    throw new Error(`Target package version ${currentVersion} does not match ownership manifest ${current.manifest.version}`);
  }
  if (rollbackPath) {
    const validated = readBackup(rollbackPath, target);
    preflightTransition(target, current, validated.ownership);
    return {
      action: 'rollback',
      target,
      currentVersion,
      currentCommit: current.manifest.commit || null,
      rollbackTarget: validated.backup,
      rollbackVersion: validated.ownership.manifest.version,
      rollbackCommit: validated.ownership.manifest.commit || null,
      backupDigest: validated.receipt.content_sha256,
      applyRequired: true,
    };
  }
  if (!archivePath) throw new Error('Pass --archive <release.tar.gz> for an update, or --rollback <backup-path>');
  const verified = verifyRelease(path.resolve(archivePath));
  return withExtractedArchive(verified.archivePath, (stage, incoming) => {
    preflightTransition(target, current, incoming);
    const backupRoot = path.join(path.dirname(target), '.citadel-backups');
    const backupPath = path.join(backupRoot, backupNameFor(target, current, incoming.manifest));
    return {
      action: 'update',
      target,
      currentVersion,
      currentCommit: current.manifest.commit || null,
      targetVersion: verified.version,
      targetCommit: verified.commit,
      archive: verified.archivePath,
      archiveSha256: verified.sha256,
      backupPath,
      rollbackCommand: `node scripts/update.js --rollback "${backupPath}" --target "${target}" --apply`,
      applyRequired: true,
    };
  });
}

function applyUpdate(plan) {
  const target = safeTarget(plan.target);
  const current = readOwnership(target, { requireFiles: false });
  const verified = verifyRelease(path.resolve(plan.archive));
  if (verified.sha256 !== plan.archiveSha256 || verified.version !== plan.targetVersion || verified.commit !== plan.targetCommit) {
    throw new Error('Update artifact changed after planning');
  }
  return withExtractedArchive(verified.archivePath, (stage, incoming) => {
    preflightTransition(target, current, incoming);
    const receipt = writeBackup(target, plan.backupPath, current, incoming.manifest);
    try {
      replaceOwned(target, stage, current, incoming);
    } catch (error) {
      restoreOwned(target, plan.backupPath, current, incoming);
      throw error;
    }
    return { backupReceipt: path.join(plan.backupPath, BACKUP_RECEIPT), backupDigest: receipt.content_sha256 };
  });
}

function applyRollback(plan) {
  const target = safeTarget(plan.target);
  const current = readOwnership(target, { requireFiles: false });
  const validated = readBackup(plan.rollbackTarget, target);
  if (validated.receipt.content_sha256 !== plan.backupDigest) throw new Error('Rollback backup changed after planning');
  preflightTransition(target, current, validated.ownership);
  const recovery = fs.mkdtempSync(path.join(os.tmpdir(), 'citadel-rollback-recovery-'));
  try {
    copyOwnership(target, recovery, current);
    try {
      replaceOwned(target, validated.backup, current, validated.ownership);
    } catch (error) {
      restoreOwned(target, recovery, current, validated.ownership);
      throw error;
    }
  } finally {
    fs.rmSync(recovery, { recursive: true, force: true });
  }
  return { backupDigest: validated.receipt.content_sha256 };
}

function applyPlan(plan) {
  return plan.action === 'rollback' ? applyRollback(plan) : applyUpdate(plan);
}

function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`Usage:
  node scripts/update.js --archive <release.tar.gz> [--target PATH] [--apply]
  node scripts/update.js --rollback <Citadel-backup-path> --target PATH [--apply]

The default is a read-only plan. Apply mutates only unchanged paths recorded in
the target's embedded ${OWNERSHIP_MANIFEST}. Unowned files are preserved.`);
    return;
  }
  const target = safeTarget(arg('--target', ROOT));
  const plan = updatePlan({ target, archivePath: arg('--archive'), rollbackPath: arg('--rollback') });
  const apply = process.argv.includes('--apply');
  const result = apply ? applyPlan(plan) : {};
  console.log(JSON.stringify({ ...plan, ...result, applied: apply }, null, 2));
}

module.exports = {
  BACKUP_RECEIPT,
  OWNERSHIP_MANIFEST,
  applyPlan,
  extractArchive,
  readBackup,
  readOwnership,
  safeTarget,
  snapshotDigest,
  updatePlan,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`update failed: ${error.message}`);
    process.exit(1);
  }
}

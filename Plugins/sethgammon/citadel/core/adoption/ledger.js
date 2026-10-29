'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { assertValid, validateReceipt } = require('./contracts');
const { sha256Digest } = require('../operations/canonical');
const { realDirectory } = require('../distribution/fs-safety');

function defaultControlRoot() {
  return process.env.CITADEL_CONTROL_ROOT
    ? path.resolve(process.env.CITADEL_CONTROL_ROOT)
    : path.join(os.homedir(), '.citadel-control');
}

function targetKey(target) {
  const canonicalTarget = realDirectory(target, 'Private ledger target');
  return sha256Digest({ target: canonicalTarget }).slice('sha256:'.length, 'sha256:'.length + 32);
}

function ensureDirectory(directory) {
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(directory);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Private ledger path is not a plain directory: ${directory}`);
  try { fs.chmodSync(directory, 0o700); } catch (_) { /* Windows ACLs are outside chmod semantics. */ }
}

function atomicWrite(file, content, replace) {
  ensureDirectory(path.dirname(file));
  if (!replace && fs.existsSync(file)) {
    if (fs.readFileSync(file).equals(content)) return;
    throw new Error(`Private ledger immutable record already exists with different content: ${file}`);
  }
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, content);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, file);
    try { fs.chmodSync(file, 0o600); } catch (_) { /* Best effort on Windows. */ }
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function ledgerPaths(target, options = {}) {
  const targetRoot = realDirectory(target, 'Private ledger target');
  const controlRoot = path.resolve(options.controlRoot || defaultControlRoot());
  const relative = path.relative(targetRoot, controlRoot);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    throw new Error('Private control ledger must be outside the adopted project');
  }
  const directory = path.join(controlRoot, 'adoption-ledger', targetKey(targetRoot));
  return {
    controlRoot,
    targetRoot,
    directory,
    active: path.join(directory, 'active.json'),
    receipts: path.join(directory, 'receipts'),
  };
}

function mirrorReceipt(target, receipt, options = {}) {
  assertValid(receipt, validateReceipt, 'ledger adoption receipt');
  const paths = ledgerPaths(target, options);
  ensureDirectory(paths.receipts);
  const content = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  atomicWrite(path.join(paths.receipts, `${receipt.receipt_id}.json`), content, false);
  atomicWrite(paths.active, content, true);
  return { status: 'mirrored', path: paths.active, receipt_digest: receipt.receipt_digest };
}

function readLedgerReceipt(target, options = {}) {
  const paths = ledgerPaths(target, options);
  if (!fs.existsSync(paths.active)) return null;
  const stat = fs.lstatSync(paths.active);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('Private ledger active receipt is not a plain file');
  const receipt = JSON.parse(fs.readFileSync(paths.active, 'utf8').replace(/^\uFEFF/, ''));
  assertValid(receipt, validateReceipt, 'private ledger receipt');
  if (realDirectory(receipt.target.root, 'Private ledger receipt target') !== paths.targetRoot) {
    throw new Error('Private ledger receipt target does not match requested project');
  }
  return receipt;
}

function readLedgerReceiptById(target, receiptId, options = {}) {
  if (!/^receipt-[a-f0-9]{24}$/.test(receiptId || '')) throw new Error('Invalid receipt id');
  const paths = ledgerPaths(target, options);
  const file = path.join(paths.receipts, `${receiptId}.json`);
  if (!fs.existsSync(file)) return null;
  const receipt = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  assertValid(receipt, validateReceipt, 'private ledger receipt');
  if (realDirectory(receipt.target.root, 'Private ledger receipt target') !== paths.targetRoot) {
    throw new Error('Private ledger receipt target does not match requested project');
  }
  return receipt;
}

function retireLedger(target, expectedDigest, options = {}) {
  const paths = ledgerPaths(target, options);
  if (!fs.existsSync(paths.active)) return { status: 'missing' };
  const receipt = readLedgerReceipt(target, options);
  if (expectedDigest && receipt.receipt_digest !== expectedDigest) {
    return { status: 'conflict', observed: receipt.receipt_digest };
  }
  fs.unlinkSync(paths.active);
  return { status: 'retired', receipt_digest: receipt.receipt_digest };
}

module.exports = Object.freeze({
  defaultControlRoot, ledgerPaths, mirrorReceipt, readLedgerReceipt,
  readLedgerReceiptById, retireLedger, targetKey,
});

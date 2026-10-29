'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  canonicalClone,
  canonicalSerialize,
  deepFreeze,
  digestWithout,
  finalizeDigest,
  sha256Digest,
} = require('./canonical');
const {
  DIGEST_PATTERN,
  ID_PATTERN,
  validateControlDecision,
} = require('./contracts');
const { SUBJECT_KINDS } = require('./constants');

const RECEIPT_VERSION = 1;
const RECEIPT_FIELDS = Object.freeze([
  'receipt_version',
  'receipt_id',
  'subject',
  'subject_digest',
  'subject_generation',
  'requested_disposition',
  'decision',
  'journal_sequence',
  'journal_entry_hash',
  'issued_at',
  'receipt_digest',
]);
const SUBJECT_FIELDS = Object.freeze(['kind', 'id']);

class GovernanceReceiptError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GovernanceReceiptError';
    this.code = code;
  }
}

function plain(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function exact(value, fields) {
  return plain(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
}

function canonicalTimestamp(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function validateAuthoritySubject(subject) {
  const errors = [];
  if (!exact(subject, SUBJECT_FIELDS)) {
    return ['subject fields must exactly match: kind, id'];
  }
  if (!SUBJECT_KINDS.includes(subject.kind)) errors.push('subject.kind is invalid');
  if (typeof subject.id !== 'string' || subject.id.length > 128 || !ID_PATTERN.test(subject.id)) {
    errors.push('subject.id must be an opaque lowercase identifier');
  }
  return errors;
}

function sameSubject(left, right) {
  return Boolean(left) && Boolean(right)
    && left.kind === right.kind
    && left.id === right.id;
}

function receiptId(base) {
  const digest = sha256Digest({
    decision_digest: base.decision.decision_digest,
    journal_entry_hash: base.journal_entry_hash,
    journal_sequence: base.journal_sequence,
    requested_disposition: base.requested_disposition,
    subject: base.subject,
  });
  return `receipt-${digest.slice('sha256:'.length, 'sha256:'.length + 24)}`;
}

function validateDecisionReceipt(receipt) {
  const errors = [];
  if (!exact(receipt, RECEIPT_FIELDS)) {
    return ['DecisionReceipt fields do not match exact contract'];
  }
  if (receipt.receipt_version !== RECEIPT_VERSION) {
    errors.push(`receipt_version must be ${RECEIPT_VERSION}`);
  }
  if (typeof receipt.receipt_id !== 'string' || !ID_PATTERN.test(receipt.receipt_id)) {
    errors.push('receipt_id must be an opaque lowercase identifier');
  }
  errors.push(...validateAuthoritySubject(receipt.subject));
  if (!DIGEST_PATTERN.test(receipt.subject_digest || '')) {
    errors.push('subject_digest must be a sha256 digest');
  }
  if (!Number.isInteger(receipt.subject_generation) || receipt.subject_generation < 1) {
    errors.push('subject_generation must be a positive integer');
  }
  if (!['advance', 'merge'].includes(receipt.requested_disposition)) {
    errors.push('requested_disposition must be advance or merge');
  }
  const decisionErrors = validateControlDecision(receipt.decision);
  errors.push(...decisionErrors.map((error) => `decision: ${error}`));
  if (!sameSubject(receipt.subject, receipt.decision?.subject)) {
    errors.push('receipt subject does not match decision subject');
  }
  if (receipt.subject_digest !== receipt.decision?.subject_digest) {
    errors.push('receipt subject_digest does not match decision');
  }
  if (receipt.subject_generation !== receipt.decision?.subject_generation) {
    errors.push('receipt subject_generation does not match decision');
  }
  if (!Number.isInteger(receipt.journal_sequence) || receipt.journal_sequence < 1) {
    errors.push('journal_sequence must be a positive integer');
  }
  if (!DIGEST_PATTERN.test(receipt.journal_entry_hash || '')) {
    errors.push('journal_entry_hash must be a sha256 digest');
  }
  if (!canonicalTimestamp(receipt.issued_at)) {
    errors.push('issued_at must be a canonical ISO timestamp');
  }
  if (!DIGEST_PATTERN.test(receipt.receipt_digest || '')
    || digestWithout(receipt, 'receipt_digest') !== receipt.receipt_digest) {
    errors.push('receipt_digest does not match canonical receipt content');
  }
  if (receipt.receipt_id !== receiptId(receipt)) {
    errors.push('receipt_id does not match receipt content');
  }
  return errors;
}

function createDecisionReceipt(input) {
  const base = canonicalClone({
    receipt_version: RECEIPT_VERSION,
    subject: input.subject,
    subject_digest: input.subjectDigest,
    subject_generation: input.subjectGeneration,
    requested_disposition: input.requestedDisposition,
    decision: input.decision,
    journal_sequence: input.journalEntry.sequence,
    journal_entry_hash: input.journalEntry.entry_hash,
    issued_at: input.issuedAt,
  });
  const receipt = finalizeDigest({
    ...base,
    receipt_id: receiptId(base),
  }, 'receipt_digest');
  const errors = validateDecisionReceipt(receipt);
  if (errors.length) throw new GovernanceReceiptError('RECEIPT_INVALID', errors.join('; '));
  return receipt;
}

function governanceStorePaths(projectRoot) {
  if (typeof projectRoot !== 'string' || !projectRoot.trim()) {
    throw new TypeError('projectRoot must be a non-empty path');
  }
  const root = path.resolve(projectRoot);
  const directory = path.join(root, '.planning', 'governance');
  return Object.freeze({
    directory,
    decisions: path.join(directory, 'decisions'),
    journal: path.join(directory, 'journal.jsonl'),
  });
}

function receiptFileName(subject) {
  const errors = validateAuthoritySubject(subject);
  if (errors.length) throw new TypeError(errors.join('; '));
  const suffix = sha256Digest(subject).slice('sha256:'.length, 'sha256:'.length + 24);
  return `${subject.kind}--${suffix}.json`;
}

function decisionReceiptPath(projectRoot, subject) {
  const paths = governanceStorePaths(projectRoot);
  return path.join(paths.decisions, receiptFileName(subject));
}

function atomicWriteDecisionReceipt(projectRoot, receipt) {
  const errors = validateDecisionReceipt(receipt);
  if (errors.length) throw new GovernanceReceiptError('RECEIPT_INVALID', errors.join('; '));
  const target = decisionReceiptPath(projectRoot, receipt.subject);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`;
  let fd;
  try {
    fd = fs.openSync(temporary, 'wx');
    fs.writeSync(fd, `${canonicalSerialize(receipt)}\n`, null, 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(temporary, target);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    fs.rmSync(temporary, { force: true });
  }
  return target;
}

function readDecisionReceipt(projectRoot, subject) {
  const target = decisionReceiptPath(projectRoot, subject);
  if (!fs.existsSync(target)) return null;
  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    throw new GovernanceReceiptError('RECEIPT_UNREADABLE', error.message);
  }
  const errors = validateDecisionReceipt(receipt);
  if (errors.length) throw new GovernanceReceiptError('RECEIPT_INVALID', errors.join('; '));
  return deepFreeze(canonicalClone(receipt));
}

module.exports = Object.freeze({
  GovernanceReceiptError,
  RECEIPT_FIELDS,
  RECEIPT_VERSION,
  atomicWriteDecisionReceipt,
  createDecisionReceipt,
  decisionReceiptPath,
  governanceStorePaths,
  readDecisionReceipt,
  receiptFileName,
  sameSubject,
  validateAuthoritySubject,
  validateDecisionReceipt,
});

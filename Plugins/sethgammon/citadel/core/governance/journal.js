'use strict';

const fs = require('fs');
const path = require('path');
const {
  canonicalClone,
  canonicalSerialize,
  deepFreeze,
  sha256Digest,
} = require('./canonical');
const { JOURNAL_VERSION, RECORD_TYPES } = require('./constants');
const {
  assertValidGovernanceContract,
  governanceRecordType,
  validateGovernanceContract,
} = require('./contracts');

const ENTRY_FIELDS = Object.freeze([
  'journal_version',
  'sequence',
  'record_type',
  'recorded_at',
  'payload',
  'payload_digest',
  'previous_hash',
  'entry_hash',
]);
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;

class GovernanceJournalError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GovernanceJournalError';
    this.code = code;
  }
}

function exactEntry(entry) {
  return entry && typeof entry === 'object' && !Array.isArray(entry)
    && Object.getPrototypeOf(entry) === Object.prototype
    && JSON.stringify(Object.keys(entry).sort()) === JSON.stringify([...ENTRY_FIELDS].sort());
}

function canonicalTimestamp(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function entryHash(entry) {
  const base = canonicalClone(entry);
  delete base.entry_hash;
  return sha256Digest(base);
}

function createJournalEntry(previous, payload, recordedAt) {
  assertValidGovernanceContract(payload);
  if (!canonicalTimestamp(recordedAt)) {
    throw new GovernanceJournalError('INVALID_TIMESTAMP', 'recordedAt must be a canonical ISO timestamp');
  }
  if (previous) {
    const errors = validateJournalEntry(previous, undefined);
    if (errors.length) {
      throw new GovernanceJournalError('INVALID_PREVIOUS_ENTRY', errors.join('; '));
    }
    if (Date.parse(recordedAt) < Date.parse(previous.recorded_at)) {
      throw new GovernanceJournalError('TIMESTAMP_REGRESSION', 'journal timestamps must be monotonic');
    }
  }
  const frozenPayload = deepFreeze(canonicalClone(payload));
  const base = {
    journal_version: JOURNAL_VERSION,
    sequence: previous ? previous.sequence + 1 : 1,
    record_type: governanceRecordType(frozenPayload),
    recorded_at: recordedAt,
    payload: frozenPayload,
    payload_digest: sha256Digest(frozenPayload),
    previous_hash: previous ? previous.entry_hash : null,
  };
  return deepFreeze({ ...base, entry_hash: sha256Digest(base) });
}

function validateJournalEntry(entry, previous) {
  const errors = [];
  if (!exactEntry(entry)) return ['journal entry fields do not match exact contract'];
  if (entry.journal_version !== JOURNAL_VERSION) errors.push(`journal_version must be ${JOURNAL_VERSION}`);
  if (!Number.isInteger(entry.sequence) || entry.sequence < 1) errors.push('sequence must be a positive integer');
  if (!RECORD_TYPES.includes(entry.record_type)) errors.push('record_type is invalid');
  if (!canonicalTimestamp(entry.recorded_at)) errors.push('recorded_at must be a canonical ISO timestamp');
  const contractErrors = validateGovernanceContract(entry.payload);
  errors.push(...contractErrors.map((error) => `payload: ${error}`));
  if (governanceRecordType(entry.payload) !== entry.record_type) errors.push('record_type does not match payload');
  if (!DIGEST_PATTERN.test(entry.payload_digest || '')
    || entry.payload_digest !== sha256Digest(entry.payload)) {
    errors.push('payload_digest does not match payload');
  }
  if (previous === null) {
    if (entry.sequence !== 1) errors.push('first entry sequence must be 1');
    if (entry.previous_hash !== null) errors.push('first entry previous_hash must be null');
  } else if (previous) {
    if (entry.sequence !== previous.sequence + 1) errors.push('sequence is not contiguous');
    if (entry.previous_hash !== previous.entry_hash) errors.push('previous_hash does not match prior entry');
    if (Date.parse(entry.recorded_at) < Date.parse(previous.recorded_at)) {
      errors.push('journal timestamps must be monotonic');
    }
  }
  if (!DIGEST_PATTERN.test(entry.entry_hash || '') || entry.entry_hash !== entryHash(entry)) {
    errors.push('entry_hash does not match canonical entry content');
  }
  return errors;
}

function verifyJournal(entries) {
  if (!Array.isArray(entries)) {
    throw new GovernanceJournalError('INVALID_JOURNAL', 'journal must be an array');
  }
  const observationIds = new Set();
  const decisionIds = new Set();
  entries.forEach((entry, index) => {
    const errors = validateJournalEntry(entry, index === 0 ? null : entries[index - 1]);
    if (errors.length) {
      throw new GovernanceJournalError('JOURNAL_CORRUPT', `entry ${index + 1}: ${errors.join('; ')}`);
    }
    if (entry.record_type === 'observation') {
      const id = entry.payload.observation_id;
      if (observationIds.has(id)) {
        throw new GovernanceJournalError('DUPLICATE_RECORD', `duplicate observation_id: ${id}`);
      }
      observationIds.add(id);
    }
    if (entry.record_type === 'decision') {
      const id = entry.payload.decision_id;
      if (decisionIds.has(id)) {
        throw new GovernanceJournalError('DUPLICATE_RECORD', `duplicate decision_id: ${id}`);
      }
      decisionIds.add(id);
    }
  });
  return true;
}

function appendJournal(entries, payload, recordedAt) {
  verifyJournal(entries);
  const next = createJournalEntry(entries.length ? entries[entries.length - 1] : null, payload, recordedAt);
  const output = [...entries, next];
  verifyJournal(output);
  return deepFreeze(output);
}

function createMemoryJournal(initialEntries = []) {
  let entries = deepFreeze(canonicalClone(initialEntries));
  verifyJournal(entries);
  return Object.freeze({
    append(payload, recordedAt) {
      entries = appendJournal(entries, payload, recordedAt);
      return entries[entries.length - 1];
    },
    snapshot() {
      return deepFreeze(canonicalClone(entries));
    },
    verify() {
      return verifyJournal(entries);
    },
  });
}

function readJournalFile(filePath) {
  if (!fs.existsSync(filePath)) return deepFreeze([]);
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new GovernanceJournalError('JOURNAL_UNREADABLE', error.message);
  }
  if (!text) return deepFreeze([]);
  const lines = text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n');
  if (lines.some((line) => !line.trim())) {
    throw new GovernanceJournalError('JOURNAL_CORRUPT', 'journal contains an empty entry');
  }
  let entries;
  try {
    entries = lines.map((line) => JSON.parse(line));
  } catch (error) {
    throw new GovernanceJournalError('JOURNAL_CORRUPT', `invalid journal JSON: ${error.message}`);
  }
  verifyJournal(entries);
  return deepFreeze(entries.map((entry) => deepFreeze(entry)));
}

function withFileLock(filePath, action) {
  const lockPath = `${filePath}.lock`;
  let lock;
  try {
    lock = fs.openSync(lockPath, 'wx');
  } catch (error) {
    throw new GovernanceJournalError('JOURNAL_BUSY', `journal lock unavailable: ${error.message}`);
  }
  try {
    return action();
  } finally {
    fs.closeSync(lock);
    fs.rmSync(lockPath, { force: true });
  }
}

function appendJournalFile(filePath, payload, recordedAt) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  return withFileLock(filePath, () => {
    const entries = readJournalFile(filePath);
    const next = createJournalEntry(entries.length ? entries[entries.length - 1] : null, payload, recordedAt);
    const fd = fs.openSync(filePath, 'a');
    try {
      fs.writeSync(fd, `${canonicalSerialize(next)}\n`, null, 'utf8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    verifyJournal(readJournalFile(filePath));
    return next;
  });
}

module.exports = Object.freeze({
  GovernanceJournalError,
  appendJournal,
  appendJournalFile,
  createJournalEntry,
  createMemoryJournal,
  readJournalFile,
  validateJournalEntry,
  verifyJournal,
});

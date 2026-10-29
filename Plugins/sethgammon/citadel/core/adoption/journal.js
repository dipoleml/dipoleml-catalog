'use strict';

const fs = require('fs');
const path = require('path');
const {
  CONTRACT_VERSION, assertValid, journalEntryDigest, validateJournalEntry,
} = require('./contracts');
const { atomicCreate } = require('./footprint');
const { sha256Digest } = require('../operations/canonical');

function journalFiles(root, relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  if (!fs.existsSync(directory)) return [];
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Mutation journal must be a plain directory');
  return fs.readdirSync(directory)
    .filter((name) => /^\d{6}\.json$/.test(name))
    .sort()
    .map((name) => path.join(directory, name));
}

function readJournal(root, relativeDirectory) {
  const entries = [];
  for (const file of journalFiles(root, relativeDirectory)) {
    const entry = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    assertValid(entry, validateJournalEntry, 'mutation journal entry');
    const expectedSequence = entries.length + 1;
    const previous = entries.length ? entries[entries.length - 1].entry_digest : null;
    if (entry.sequence !== expectedSequence || entry.previous_digest !== previous) {
      throw new Error(`Mutation journal chain is invalid at sequence ${entry.sequence}`);
    }
    entries.push(entry);
  }
  return entries;
}

function appendJournal(root, relativeDirectory, input, options = {}) {
  const prior = readJournal(root, relativeDirectory);
  const entry = {
    contract_version: CONTRACT_VERSION,
    kind: 'citadel_mutation_journal_entry',
    sequence: prior.length + 1,
    operation_id: input.operationId,
    phase: input.phase,
    effect_id: input.effectId || null,
    state: input.state,
    payload_digest: sha256Digest(input.payload ?? null),
    evidence_digest: input.evidence == null ? null : sha256Digest(input.evidence),
    reason_code: input.reasonCode || null,
    recorded_at: (options.now || (() => new Date().toISOString()))(),
    previous_digest: prior.length ? prior[prior.length - 1].entry_digest : null,
    entry_digest: null,
  };
  entry.entry_digest = journalEntryDigest(entry);
  assertValid(entry, validateJournalEntry, 'mutation journal entry');
  const relative = `${relativeDirectory}/${String(entry.sequence).padStart(6, '0')}.json`;
  atomicCreate(root, relative, Buffer.from(`${JSON.stringify(entry, null, 2)}\n`));
  return entry;
}

function journalHead(root, relativeDirectory) {
  const entries = readJournal(root, relativeDirectory);
  return entries.length ? entries[entries.length - 1].entry_digest : null;
}

module.exports = Object.freeze({ appendJournal, journalFiles, journalHead, readJournal });

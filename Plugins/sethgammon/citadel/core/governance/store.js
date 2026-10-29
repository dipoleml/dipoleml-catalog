'use strict';

const fs = require('fs');
const path = require('path');
const { deepFreeze } = require('./canonical');
const {
  createEvidenceObservation,
  validateEvidenceObservation,
  validateGatePolicy,
} = require('./contracts');
const { evaluateGate } = require('./evaluator');
const {
  appendJournalFile,
  readJournalFile,
} = require('./journal');
const {
  atomicWriteDecisionReceipt,
  createDecisionReceipt,
  governanceStorePaths,
  sameSubject,
} = require('./receipts');

const FAILURE_REASONS = Object.freeze({
  timeout: 'VALIDATOR_TIMEOUT',
  malformed: 'OUTPUT_UNPARSEABLE',
  missing: 'MISSING_EVIDENCE',
});

class GovernanceStoreError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GovernanceStoreError';
    this.code = code;
  }
}

function createFailureObservation(input) {
  const reason = FAILURE_REASONS[input.failureKind];
  if (!reason) throw new TypeError('failureKind must be timeout, malformed, or missing');
  return createEvidenceObservation({
    contract_version: 1,
    observation_id: input.observationId,
    subject: input.subject,
    subject_digest: input.subjectDigest,
    subject_generation: input.subjectGeneration,
    attempt_id: input.attemptId,
    producer: input.producer,
    producer_contract_digest: input.producerContractDigest,
    truth_status: 'unknown',
    coverage: {
      required: 1,
      observed: 0,
      passed: 0,
      complete: false,
    },
    reason_code: reason,
    artifact_digests: [],
    observed_at: input.observedAt,
    expires_at: input.expiresAt ?? null,
  });
}

function withStoreLock(directory, action) {
  fs.mkdirSync(directory, { recursive: true });
  const lockPath = path.join(directory, 'store.lock');
  let lock;
  try {
    lock = fs.openSync(lockPath, 'wx');
  } catch (error) {
    throw new GovernanceStoreError('STORE_BUSY', `governance store lock unavailable: ${error.message}`);
  }
  try {
    return action();
  } finally {
    fs.closeSync(lock);
    fs.rmSync(lockPath, { force: true });
  }
}

function recordTimestamp(entries, decidedAt) {
  const tail = entries.length ? entries[entries.length - 1].recorded_at : null;
  return tail && Date.parse(tail) > Date.parse(decidedAt) ? tail : decidedAt;
}

function findRecord(entries, recordType, idField, id) {
  return entries.find((entry) => entry.record_type === recordType
    && entry.payload[idField] === id);
}

function appendUnique(paths, entries, payload, recordedAt, recordType, idField) {
  const existing = findRecord(entries, recordType, idField, payload[idField]);
  if (existing) {
    const digestField = `${recordType === 'observation' ? 'observation' : 'decision'}_digest`;
    if (existing.payload[digestField] !== payload[digestField]) {
      throw new GovernanceStoreError(
        'RECORD_CONFLICT',
        `${idField} ${payload[idField]} already exists with different content`,
      );
    }
    return Object.freeze({ entries, entry: existing });
  }
  const entry = appendJournalFile(paths.journal, payload, recordTimestamp(entries, recordedAt));
  return Object.freeze({
    entries: readJournalFile(paths.journal),
    entry,
  });
}

function appendPolicy(paths, entries, policy, recordedAt) {
  const sameId = entries.find((entry) => entry.record_type === 'policy'
    && entry.payload.policy_id === policy.policy_id);
  if (sameId && sameId.payload.policy_digest !== policy.policy_digest) {
    throw new GovernanceStoreError(
      'POLICY_CONFLICT',
      `policy_id ${policy.policy_id} already exists with different content`,
    );
  }
  const existing = entries.find((entry) => entry.record_type === 'policy'
    && entry.payload.policy_digest === policy.policy_digest);
  if (existing) return entries;
  appendJournalFile(paths.journal, policy, recordTimestamp(entries, recordedAt));
  return readJournalFile(paths.journal);
}

function accumulatedObservations(entries, observations, subject) {
  const stored = entries
    .filter((entry) => entry.record_type === 'observation'
      && sameSubject(entry.payload.subject, subject))
    .map((entry) => entry.payload);
  const byId = new Map(stored.map((entry) => [entry.observation_id, entry]));
  for (const observation of observations) {
    const global = findRecord(
      entries,
      'observation',
      'observation_id',
      observation.observation_id,
    );
    if (global && global.payload.observation_digest !== observation.observation_digest) {
      throw new GovernanceStoreError(
        'RECORD_CONFLICT',
        `observation_id ${observation.observation_id} already exists with different content`,
      );
    }
    const existing = byId.get(observation.observation_id);
    if (existing && existing.observation_digest !== observation.observation_digest) {
      throw new GovernanceStoreError(
        'RECORD_CONFLICT',
        `observation_id ${observation.observation_id} already exists with different content`,
      );
    }
    if (!existing) byId.set(observation.observation_id, observation);
  }
  return [...byId.values()];
}

function evaluateAndRecord(input) {
  const paths = governanceStorePaths(input.projectRoot);
  return withStoreLock(paths.directory, () => {
    const policyErrors = validateGatePolicy(input.policy);
    if (policyErrors.length) throw new TypeError(`Invalid GatePolicy: ${policyErrors.join('; ')}`);
    if (!Array.isArray(input.observations)) throw new TypeError('observations must be an array');
    input.observations.forEach((observation, index) => {
      const errors = validateEvidenceObservation(observation);
      if (errors.length) throw new TypeError(`Invalid observation[${index}]: ${errors.join('; ')}`);
    });
    let entries = readJournalFile(paths.journal);
    const observations = accumulatedObservations(entries, input.observations, input.subject);
    const decision = evaluateGate({ ...input, observations });
    entries = appendPolicy(paths, entries, input.policy, input.decidedAt);
    for (const observation of input.observations) {
      const result = appendUnique(
        paths,
        entries,
        observation,
        input.decidedAt,
        'observation',
        'observation_id',
      );
      entries = result.entries;
    }
    const decisionResult = appendUnique(
      paths,
      entries,
      decision,
      input.decidedAt,
      'decision',
      'decision_id',
    );
    const receipt = createDecisionReceipt({
      subject: input.subject,
      subjectDigest: input.subjectDigest,
      subjectGeneration: input.subjectGeneration,
      requestedDisposition: input.requestedDisposition,
      decision,
      journalEntry: decisionResult.entry,
      issuedAt: input.decidedAt,
    });
    atomicWriteDecisionReceipt(input.projectRoot, receipt);
    return deepFreeze({
      decision,
      receipt,
      journal_entry: decisionResult.entry,
    });
  });
}

module.exports = Object.freeze({
  FAILURE_REASONS,
  GovernanceStoreError,
  createFailureObservation,
  evaluateAndRecord,
});

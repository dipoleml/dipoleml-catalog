'use strict';

const {
  CHECKPOINT_REQUIREMENTS,
  CONTRACT_FIELDS,
  CONTRACT_VERSION,
  DISPOSITIONS,
  PRODUCER_KINDS,
  SUBJECT_KINDS,
  TRUTH_STATUSES,
} = require('./constants');
const { digestWithout, finalizeDigest } = require('./canonical');
const { validateReason } = require('./reasons');

const ID_PATTERN = /^[a-z][a-z0-9]*(?:[-_.:][a-z0-9]+)*$/;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const SUBJECT_FIELDS = Object.freeze(['kind', 'id']);
const PRODUCER_FIELDS = Object.freeze(['kind', 'id']);
const COVERAGE_FIELDS = Object.freeze(['required', 'observed', 'passed', 'complete']);
const RETRY_FIELDS = Object.freeze([
  'max_attempts', 'initial_delay_ms', 'backoff_multiplier', 'max_delay_ms',
]);
const DEADLINE_FIELDS = Object.freeze(['attempt_timeout_ms', 'overall_deadline_ms']);
const HUMAN_GATE_FIELDS = Object.freeze(['required', 'observation_id']);
const REQUIRED_OBSERVATION_FIELDS = Object.freeze([
  'observation_id', 'producer_kind', 'producer_contract_digest',
]);

function plain(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function exact(value, fields, label, errors) {
  if (!plain(value)) {
    errors.push(`${label} must be a plain object`);
    return false;
  }
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...fields].sort())) {
    errors.push(`${label} fields must exactly match: ${fields.join(', ')}`);
  }
  return true;
}

function checkId(value, label, errors) {
  if (typeof value !== 'string' || value.length > 128 || !ID_PATTERN.test(value)) {
    errors.push(`${label} must be an opaque lowercase identifier`);
  }
}

function checkDigest(value, label, errors) {
  if (typeof value !== 'string' || !DIGEST_PATTERN.test(value)) {
    errors.push(`${label} must be a sha256 digest`);
  }
}

function checkTimestamp(value, label, errors, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))
    || new Date(value).toISOString() !== value) {
    errors.push(`${label} must be a canonical ISO timestamp${nullable ? ' or null' : ''}`);
  }
}

function checkInteger(value, label, errors, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    errors.push(`${label} must be an integer from ${minimum} to ${maximum}`);
  }
}

function checkUniqueArray(value, label, errors, checkEntry, minimum = 0, maximum = 256) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    errors.push(`${label} must contain ${minimum} to ${maximum} entries`);
    return;
  }
  const unique = new Set();
  value.forEach((entry, index) => {
    checkEntry(entry, `${label}[${index}]`, errors);
    if (unique.has(entry)) errors.push(`${label} cannot contain duplicates`);
    unique.add(entry);
  });
}

function validateSubject(subject, expectedKind, errors) {
  if (!exact(subject, SUBJECT_FIELDS, 'subject', errors)) return;
  if (!SUBJECT_KINDS.includes(subject.kind)) errors.push('subject.kind is invalid');
  if (expectedKind && subject.kind !== expectedKind) errors.push('subject.kind does not match policy subject_kind');
  checkId(subject.id, 'subject.id', errors);
}

function validateCoverage(coverage, errors) {
  if (!exact(coverage, COVERAGE_FIELDS, 'coverage', errors)) return;
  checkInteger(coverage.required, 'coverage.required', errors, 1, 4096);
  checkInteger(coverage.observed, 'coverage.observed', errors, 0, 4096);
  checkInteger(coverage.passed, 'coverage.passed', errors, 0, 4096);
  if (coverage.observed > coverage.required) errors.push('coverage.observed cannot exceed required');
  if (coverage.passed > coverage.observed) errors.push('coverage.passed cannot exceed observed');
  if (typeof coverage.complete !== 'boolean') errors.push('coverage.complete must be boolean');
  if (typeof coverage.complete === 'boolean'
    && coverage.complete !== (coverage.observed === coverage.required)) {
    errors.push('coverage.complete must equal observed === required');
  }
}

function validateSelfDigest(value, field, errors) {
  checkDigest(value[field], field, errors);
  if (DIGEST_PATTERN.test(value[field] || '') && digestWithout(value, field) !== value[field]) {
    errors.push(`${field} does not match canonical contract content`);
  }
}

function validateEvidenceObservation(value) {
  const errors = [];
  if (!exact(value, CONTRACT_FIELDS.observation, 'EvidenceObservation', errors)) return errors;
  if (value.contract_version !== CONTRACT_VERSION) errors.push(`contract_version must be ${CONTRACT_VERSION}`);
  checkId(value.observation_id, 'observation_id', errors);
  validateSubject(value.subject, null, errors);
  checkDigest(value.subject_digest, 'subject_digest', errors);
  checkInteger(value.subject_generation, 'subject_generation', errors, 1, Number.MAX_SAFE_INTEGER);
  checkId(value.attempt_id, 'attempt_id', errors);
  if (exact(value.producer, PRODUCER_FIELDS, 'producer', errors)) {
    if (!PRODUCER_KINDS.includes(value.producer.kind)) errors.push('producer.kind is invalid');
    checkId(value.producer.id, 'producer.id', errors);
  }
  checkDigest(value.producer_contract_digest, 'producer_contract_digest', errors);
  if (!TRUTH_STATUSES.includes(value.truth_status)) errors.push('truth_status is invalid');
  validateCoverage(value.coverage, errors);
  errors.push(...validateReason(value.reason_code, value.truth_status));
  checkUniqueArray(value.artifact_digests, 'artifact_digests', errors, checkDigest);
  checkTimestamp(value.observed_at, 'observed_at', errors);
  checkTimestamp(value.expires_at, 'expires_at', errors, true);
  if (value.expires_at && value.observed_at
    && Date.parse(value.expires_at) <= Date.parse(value.observed_at)) {
    errors.push('expires_at must be later than observed_at');
  }
  if (value.truth_status === 'passed') {
    if (!value.coverage?.complete || value.coverage?.passed !== value.coverage?.required) {
      errors.push('passed observations require complete passed coverage');
    }
    if (!value.artifact_digests?.length) errors.push('passed observations require artifact_digests');
  }
  validateSelfDigest(value, 'observation_digest', errors);
  return errors;
}

function validateRetryPolicy(policy, errors) {
  if (!exact(policy, RETRY_FIELDS, 'retry_policy', errors)) return;
  checkInteger(policy.max_attempts, 'retry_policy.max_attempts', errors, 1, 100);
  checkInteger(policy.initial_delay_ms, 'retry_policy.initial_delay_ms', errors, 0, 86400000);
  if (typeof policy.backoff_multiplier !== 'number' || !Number.isFinite(policy.backoff_multiplier)
    || policy.backoff_multiplier < 1 || policy.backoff_multiplier > 100) {
    errors.push('retry_policy.backoff_multiplier must be a finite number from 1 to 100');
  }
  checkInteger(policy.max_delay_ms, 'retry_policy.max_delay_ms', errors, 0, 86400000);
  if (policy.max_delay_ms < policy.initial_delay_ms) {
    errors.push('retry_policy.max_delay_ms cannot be less than initial_delay_ms');
  }
}

function validateDeadlinePolicy(policy, errors) {
  if (!exact(policy, DEADLINE_FIELDS, 'deadline_policy', errors)) return;
  checkInteger(policy.attempt_timeout_ms, 'deadline_policy.attempt_timeout_ms', errors, 1, 86400000);
  checkInteger(policy.overall_deadline_ms, 'deadline_policy.overall_deadline_ms', errors, 1, 604800000);
  if (policy.attempt_timeout_ms > policy.overall_deadline_ms) {
    errors.push('deadline_policy.attempt_timeout_ms cannot exceed overall_deadline_ms');
  }
}

function validateRequiredObservations(value, errors) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 64) {
    errors.push('required_observations must contain 1 to 64 entries');
    return;
  }
  const ids = new Set();
  value.forEach((requirement, index) => {
    const label = `required_observations[${index}]`;
    if (!exact(requirement, REQUIRED_OBSERVATION_FIELDS, label, errors)) return;
    checkId(requirement.observation_id, `${label}.observation_id`, errors);
    if (!PRODUCER_KINDS.includes(requirement.producer_kind)) {
      errors.push(`${label}.producer_kind is invalid`);
    }
    checkDigest(requirement.producer_contract_digest, `${label}.producer_contract_digest`, errors);
    if (ids.has(requirement.observation_id)) errors.push('required_observations cannot contain duplicate ids');
    ids.add(requirement.observation_id);
  });
}

function validateGatePolicy(value) {
  const errors = [];
  if (!exact(value, CONTRACT_FIELDS.policy, 'GatePolicy', errors)) return errors;
  if (value.contract_version !== CONTRACT_VERSION) errors.push(`contract_version must be ${CONTRACT_VERSION}`);
  checkId(value.policy_id, 'policy_id', errors);
  if (!SUBJECT_KINDS.includes(value.subject_kind)) errors.push('subject_kind is invalid');
  validateRequiredObservations(value.required_observations, errors);
  validateRetryPolicy(value.retry_policy, errors);
  validateDeadlinePolicy(value.deadline_policy, errors);
  if (!CHECKPOINT_REQUIREMENTS.includes(value.checkpoint_requirement)) {
    errors.push('checkpoint_requirement is invalid');
  }
  if (value.checkpoint_requirement === 'required'
    && !value.required_observations?.some((entry) => entry.observation_id === 'checkpoint')) {
    errors.push('required checkpoint must appear in required_observations');
  }
  if (exact(value.human_gate, HUMAN_GATE_FIELDS, 'human_gate', errors)) {
    if (typeof value.human_gate.required !== 'boolean') errors.push('human_gate.required must be boolean');
    if (value.human_gate.required) {
      checkId(value.human_gate.observation_id, 'human_gate.observation_id', errors);
      const requirement = value.required_observations
        ?.find((entry) => entry.observation_id === value.human_gate.observation_id);
      if (!requirement) {
        errors.push('required human gate must appear in required_observations');
      } else if (requirement.producer_kind !== 'human') {
        errors.push('required human gate observation must use a human producer');
      }
    } else if (value.human_gate.observation_id !== null) {
      errors.push('human_gate.observation_id must be null when not required');
    }
  }
  checkUniqueArray(value.allowed_dispositions, 'allowed_dispositions', errors, (entry, label, output) => {
    if (!DISPOSITIONS.includes(entry)) output.push(`${label} is invalid`);
  }, 1, DISPOSITIONS.length);
  if (Array.isArray(value.allowed_dispositions)
    && !value.allowed_dispositions.some((entry) => ['hold', 'escalate', 'terminate'].includes(entry))) {
    errors.push('allowed_dispositions must include a non-acceptance fallback');
  }
  validateSelfDigest(value, 'policy_digest', errors);
  return errors;
}

function validateControlDecision(value) {
  const errors = [];
  if (!exact(value, CONTRACT_FIELDS.decision, 'ControlDecision', errors)) return errors;
  if (value.contract_version !== CONTRACT_VERSION) errors.push(`contract_version must be ${CONTRACT_VERSION}`);
  checkId(value.decision_id, 'decision_id', errors);
  validateSubject(value.subject, null, errors);
  checkDigest(value.subject_digest, 'subject_digest', errors);
  checkInteger(value.subject_generation, 'subject_generation', errors, 1, Number.MAX_SAFE_INTEGER);
  checkDigest(value.policy_digest, 'policy_digest', errors);
  checkUniqueArray(value.observation_digests, 'observation_digests', errors, checkDigest);
  if (!TRUTH_STATUSES.includes(value.truth_status)) errors.push('truth_status is invalid');
  validateCoverage(value.coverage, errors);
  if (!DISPOSITIONS.includes(value.disposition)) errors.push('disposition is invalid');
  errors.push(...validateReason(value.reason_code, value.truth_status));
  if (typeof value.current !== 'boolean') errors.push('current must be boolean');
  checkTimestamp(value.decided_at, 'decided_at', errors);
  if (['advance', 'merge'].includes(value.disposition)
    && (value.truth_status !== 'passed' || !value.coverage?.complete
      || value.coverage?.passed !== value.coverage?.required || value.current !== true)) {
    errors.push('advance and merge require passed, complete, current evidence');
  }
  if (value.truth_status === 'passed'
    && (!value.coverage?.complete || value.coverage?.passed !== value.coverage?.required)) {
    errors.push('passed decisions require complete passed coverage');
  }
  if (value.truth_status === 'passed' && value.current !== true) {
    errors.push('passed decisions must be current');
  }
  if (value.truth_status === 'passed'
    && Array.isArray(value.observation_digests)
    && value.observation_digests.length < (value.coverage?.required || 1)) {
    errors.push('passed decisions require observation digests for required coverage');
  }
  validateSelfDigest(value, 'decision_digest', errors);
  return errors;
}

function assertValid(value, validator, label) {
  const errors = validator(value);
  if (errors.length) throw new TypeError(`Invalid ${label}: ${errors.join('; ')}`);
  return value;
}

function createEvidenceObservation(input) {
  return assertValid(finalizeDigest(input, 'observation_digest'), validateEvidenceObservation, 'EvidenceObservation');
}

function createGatePolicy(input) {
  return assertValid(finalizeDigest(input, 'policy_digest'), validateGatePolicy, 'GatePolicy');
}

function createControlDecision(input) {
  return assertValid(finalizeDigest(input, 'decision_digest'), validateControlDecision, 'ControlDecision');
}

function governanceRecordType(value) {
  if (plain(value) && Object.hasOwn(value, 'observation_id')) return 'observation';
  if (plain(value) && Object.hasOwn(value, 'policy_id')) return 'policy';
  if (plain(value) && Object.hasOwn(value, 'decision_id')) return 'decision';
  return null;
}

function validateGovernanceContract(value) {
  const type = governanceRecordType(value);
  if (type === 'observation') return validateEvidenceObservation(value);
  if (type === 'policy') return validateGatePolicy(value);
  if (type === 'decision') return validateControlDecision(value);
  return ['unknown governance contract'];
}

function assertValidGovernanceContract(value) {
  return assertValid(value, validateGovernanceContract, 'governance contract');
}

module.exports = Object.freeze({
  DIGEST_PATTERN,
  ID_PATTERN,
  assertValidGovernanceContract,
  createControlDecision,
  createEvidenceObservation,
  createGatePolicy,
  governanceRecordType,
  validateControlDecision,
  validateEvidenceObservation,
  validateGatePolicy,
  validateGovernanceContract,
});

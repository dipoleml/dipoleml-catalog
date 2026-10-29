'use strict';

const { canonicalSerialize, sha256Digest } = require('./canonical');
const {
  createControlDecision,
  validateEvidenceObservation,
  validateGatePolicy,
} = require('./contracts');
const { reasonDefinition } = require('./reasons');

function sameSubject(left, right) {
  return Boolean(left) && Boolean(right)
    && left.kind === right.kind
    && left.id === right.id;
}

function canonicalTimestamp(value, label) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))
    || new Date(value).toISOString() !== value) {
    throw new TypeError(`${label} must be a canonical ISO timestamp`);
  }
  return value;
}

function assertInputs(policy, observations, options) {
  const policyErrors = validateGatePolicy(policy);
  if (policyErrors.length) throw new TypeError(`Invalid GatePolicy: ${policyErrors.join('; ')}`);
  if (!Array.isArray(observations)) throw new TypeError('observations must be an array');
  observations.forEach((observation, index) => {
    const errors = validateEvidenceObservation(observation);
    if (errors.length) throw new TypeError(`Invalid observation[${index}]: ${errors.join('; ')}`);
    if (!sameSubject(observation.subject, options.subject)) {
      throw new TypeError(`observation[${index}] subject does not match evaluated subject`);
    }
  });
  if (!options.subject || options.subject.kind !== policy.subject_kind) {
    throw new TypeError('evaluated subject.kind must match policy subject_kind');
  }
  canonicalTimestamp(options.decidedAt, 'decidedAt');
  if (options.startedAt !== undefined && options.startedAt !== null) {
    canonicalTimestamp(options.startedAt, 'startedAt');
    if (Date.parse(options.startedAt) > Date.parse(options.decidedAt)) {
      throw new TypeError('startedAt cannot be later than decidedAt');
    }
  }
  if (!['advance', 'merge'].includes(options.requestedDisposition)) {
    throw new TypeError('requestedDisposition must be advance or merge');
  }
}

function byObservedAt(left, right) {
  const time = Date.parse(left.observed_at) - Date.parse(right.observed_at);
  return time || left.observation_id.localeCompare(right.observation_id);
}

function isCurrent(observation, options) {
  if (observation.subject_digest !== options.subjectDigest
    || observation.subject_generation !== options.subjectGeneration) return false;
  return observation.expires_at === null
    || Date.parse(observation.expires_at) > Date.parse(options.decidedAt);
}

function collectRequirements(policy, observations, options) {
  return policy.required_observations.map((required) => {
    const candidates = observations
      .filter((entry) => entry.producer.id === required.observation_id)
      .sort(byObservedAt);
    const attempts = candidates.filter((entry) => entry.producer.kind === required.producer_kind
      && entry.producer_contract_digest === required.producer_contract_digest);
    const current = attempts.filter((entry) => isCurrent(entry, options));
    return Object.freeze({
      id: required.observation_id,
      candidates: Object.freeze(candidates),
      attempts: Object.freeze(attempts),
      selected: current.length ? current[current.length - 1] : null,
      stale: attempts.length > 0 && current.length === 0,
      mismatched: candidates.length > 0 && attempts.length === 0,
    });
  });
}

function firstRequirement(requirements, status) {
  return requirements.find((entry) => entry.selected?.truth_status === status) || null;
}

function missingReason(policy, missing) {
  if (policy.human_gate.required
    && missing.some((entry) => entry.id === policy.human_gate.observation_id)) {
    return Object.freeze({ truth: 'blocked', reason: 'HUMAN_INPUT_REQUIRED' });
  }
  if (policy.checkpoint_requirement === 'required'
    && missing.some((entry) => entry.id === 'checkpoint')) {
    return Object.freeze({ truth: 'blocked', reason: 'CHECKPOINT_REQUIRED' });
  }
  return Object.freeze({ truth: 'unknown', reason: 'MISSING_EVIDENCE' });
}

function aggregateTruth(policy, requirements, coverage) {
  const failed = firstRequirement(requirements, 'failed');
  if (failed) return Object.freeze({ truth: 'failed', reason: failed.selected.reason_code, source: failed });
  const blocked = firstRequirement(requirements, 'blocked');
  if (blocked) return Object.freeze({ truth: 'blocked', reason: blocked.selected.reason_code, source: blocked });
  const unknown = firstRequirement(requirements, 'unknown');
  if (unknown) return Object.freeze({ truth: 'unknown', reason: unknown.selected.reason_code, source: unknown });
  const mismatched = requirements.find((entry) => entry.mismatched);
  if (mismatched) {
    return Object.freeze({ truth: 'unknown', reason: 'PRODUCER_MISMATCH', source: mismatched });
  }
  const stale = requirements.find((entry) => entry.stale);
  if (stale) return Object.freeze({ truth: 'unknown', reason: 'STALE_EVIDENCE', source: stale });
  const missing = requirements.filter((entry) => !entry.selected);
  if (missing.length) {
    const result = missingReason(policy, missing);
    return Object.freeze({ ...result, source: missing[0] });
  }
  if (!coverage.complete || coverage.passed !== coverage.required) {
    const incomplete = requirements.find((entry) => !entry.selected.coverage.complete
      || entry.selected.coverage.passed !== entry.selected.coverage.required);
    return Object.freeze({ truth: 'unknown', reason: 'MISSING_EVIDENCE', source: incomplete });
  }
  return Object.freeze({ truth: 'passed', reason: 'VERIFIED', source: null });
}

function aggregateCoverage(requirements) {
  let required = 0;
  let observed = 0;
  let passed = 0;
  for (const requirement of requirements) {
    const latest = requirement.selected
      || (requirement.attempts.length ? requirement.attempts[requirement.attempts.length - 1] : null);
    required += latest ? latest.coverage.required : 1;
    if (!requirement.selected) continue;
    observed += requirement.selected.coverage.observed;
    passed += requirement.selected.coverage.passed;
  }
  return Object.freeze({
    required,
    observed,
    passed,
    complete: observed === required,
  });
}

function deadlineExceeded(policy, options) {
  if (!options.startedAt) return false;
  return Date.parse(options.decidedAt) - Date.parse(options.startedAt)
    >= policy.deadline_policy.overall_deadline_ms;
}

function allowed(policy, preferences) {
  for (const disposition of preferences) {
    if (policy.allowed_dispositions.includes(disposition)) return disposition;
  }
  throw new TypeError(`GatePolicy permits none of the required dispositions: ${preferences.join(', ')}`);
}

function dispositionFor(policy, result, attemptsUsed, options) {
  if (result.truth === 'passed') {
    return allowed(policy, [options.requestedDisposition]);
  }
  const definition = reasonDefinition(result.reason);
  const exhausted = attemptsUsed >= policy.retry_policy.max_attempts
    || deadlineExceeded(policy, options);
  const preferred = exhausted
    ? definition.exhausted_disposition
    : definition.active_disposition;
  if (preferred === 'retry') {
    return allowed(policy, ['retry', 'escalate', 'hold', 'terminate']);
  }
  if (preferred === 'hold') {
    return allowed(policy, exhausted
      ? ['escalate', 'hold', 'terminate']
      : ['hold', 'escalate', 'terminate']);
  }
  if (preferred === 'terminate') return allowed(policy, ['terminate', 'escalate', 'hold']);
  return allowed(policy, ['escalate', 'hold', 'terminate']);
}

function decisionId(input) {
  return `decision-${sha256Digest(input).slice('sha256:'.length, 'sha256:'.length + 24)}`;
}

function evaluateGate(input) {
  const options = {
    subject: input.subject,
    subjectDigest: input.subjectDigest,
    subjectGeneration: input.subjectGeneration,
    decidedAt: input.decidedAt,
    startedAt: input.startedAt ?? null,
    requestedDisposition: input.requestedDisposition || 'advance',
  };
  assertInputs(input.policy, input.observations, options);
  const requirements = collectRequirements(input.policy, input.observations, options);
  const coverage = aggregateCoverage(requirements);
  const result = aggregateTruth(input.policy, requirements, coverage);
  const attemptsUsed = result.source
    ? Math.max(result.source.attempts.length, result.source.candidates.length)
    : 0;
  const disposition = dispositionFor(input.policy, result, attemptsUsed, options);
  const relevant = input.observations
    .filter((entry) => input.policy.required_observations
      .some((required) => required.observation_id === entry.producer.id))
    .map((entry) => entry.observation_digest)
    .sort();
  const current = !requirements.some((entry) => entry.stale);
  const base = {
    contract_version: 1,
    subject: options.subject,
    subject_digest: options.subjectDigest,
    subject_generation: options.subjectGeneration,
    policy_digest: input.policy.policy_digest,
    observation_digests: relevant,
    truth_status: result.truth,
    coverage,
    disposition,
    reason_code: result.reason,
    current,
    decided_at: options.decidedAt,
  };
  return createControlDecision({
    ...base,
    decision_id: decisionId(base),
  });
}

function retryDelayMs(policy, attemptNumber) {
  const errors = validateGatePolicy(policy);
  if (errors.length) throw new TypeError(`Invalid GatePolicy: ${errors.join('; ')}`);
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) {
    throw new TypeError('attemptNumber must be a positive integer');
  }
  const delay = policy.retry_policy.initial_delay_ms
    * (policy.retry_policy.backoff_multiplier ** Math.max(0, attemptNumber - 1));
  return Math.min(policy.retry_policy.max_delay_ms, Math.round(delay));
}

module.exports = Object.freeze({
  evaluateGate,
  retryDelayMs,
  sameSubject,
});

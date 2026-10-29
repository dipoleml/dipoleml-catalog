'use strict';

const operations = require('../operations');
const {
  CONTROL_PLANE_CONTRACT_VERSION,
  canonicalTimestamp,
  exactFields,
  isPlainObject,
  validDigest,
  validId,
} = require('./contracts');

const VERIFIER_POLICIES = Object.freeze(['deterministic', 'single', 'arbiter', 'human']);
const POLICY_FIELDS = Object.freeze([
  'control_plane_contract_version', 'kind', 'proof_policy_id', 'operation_id',
  'objective_digest', 'requirements', 'missing_status',
  'receipt_signature_required', 'created_at',
]);
const REQUIREMENT_FIELDS = Object.freeze([
  'requirement_id', 'step_id', 'evidence_types', 'verifier_policy',
  'verifier_contract_digest', 'required_status',
]);
const BINDING_FIELDS = Object.freeze(['evidence_id', 'verifier_contract_digest']);
const EVALUATION_FIELDS = Object.freeze([
  'control_plane_contract_version', 'kind', 'proof_policy_digest',
  'operation_digest', 'status', 'coverage', 'requirements',
]);
const RESULT_FIELDS = Object.freeze([
  'requirement_id', 'status', 'evidence_digests', 'reason_code',
]);

function validateRequirement(value, operation, label) {
  const errors = [];
  if (!exactFields(value, REQUIREMENT_FIELDS)) return [`${label} fields are invalid`];
  if (!validId(value.requirement_id)) errors.push(`${label}.requirement_id is invalid`);
  if (!validId(value.step_id) || (operation && !operation.step_ids.includes(value.step_id))) {
    errors.push(`${label}.step_id is invalid`);
  }
  if (!Array.isArray(value.evidence_types) || value.evidence_types.length < 1
    || value.evidence_types.length > operations.EVIDENCE_TYPES.length
    || new Set(value.evidence_types).size !== value.evidence_types.length
    || value.evidence_types.some((type) => !operations.EVIDENCE_TYPES.includes(type))) {
    errors.push(`${label}.evidence_types is invalid`);
  }
  if (!VERIFIER_POLICIES.includes(value.verifier_policy)) errors.push(`${label}.verifier_policy is invalid`);
  if (!validDigest(value.verifier_contract_digest)) errors.push(`${label}.verifier_contract_digest is invalid`);
  if (value.required_status !== 'passed') errors.push(`${label}.required_status must be passed`);
  return errors;
}

function validateProofPolicy(value, operation = null) {
  const errors = [];
  if (!exactFields(value, POLICY_FIELDS)) return ['proof policy fields are invalid'];
  if (value.control_plane_contract_version !== CONTROL_PLANE_CONTRACT_VERSION) errors.push('unsupported proof policy version');
  if (value.kind !== 'proof_policy') errors.push('proof policy kind is invalid');
  if (!validId(value.proof_policy_id)) errors.push('proof_policy_id is invalid');
  if (!validId(value.operation_id)) errors.push('proof policy operation_id is invalid');
  if (!validDigest(value.objective_digest)) errors.push('proof policy objective_digest is invalid');
  if (operation) {
    if (value.operation_id !== operation.operation_id) errors.push('proof policy operation_id does not match operation');
    if (value.objective_digest !== operation.objective_digest) errors.push('proof policy objective_digest does not match operation');
  }
  if (!Array.isArray(value.requirements) || value.requirements.length < 1 || value.requirements.length > 512) {
    errors.push('proof policy requirements must contain 1 to 512 entries');
  } else {
    const ids = new Set();
    value.requirements.forEach((item, index) => {
      errors.push(...validateRequirement(item, operation, `requirements[${index}]`));
      if (ids.has(item?.requirement_id)) errors.push('proof policy requirement IDs must be unique');
      ids.add(item?.requirement_id);
    });
    if (operation) {
      for (const stepId of operation.step_ids) {
        if (!value.requirements.some((item) => item.step_id === stepId)) {
          errors.push(`proof policy does not cover step: ${stepId}`);
        }
      }
    }
  }
  if (value.missing_status !== 'unknown') errors.push('proof policy missing_status must be unknown');
  if (value.receipt_signature_required !== true) errors.push('proof policy requires a signed proof bundle');
  if (!canonicalTimestamp(value.created_at)) errors.push('proof policy created_at must be canonical');
  return errors;
}

function validateEvidenceBinding(value) {
  if (!exactFields(value, BINDING_FIELDS)) return ['evidence binding fields are invalid'];
  const errors = [];
  if (!validId(value.evidence_id)) errors.push('evidence binding evidence_id is invalid');
  if (!validDigest(value.verifier_contract_digest)) errors.push('evidence binding verifier digest is invalid');
  return errors;
}

function matchingEvidence(requirement, operation, attempts, evidence, bindings) {
  const attemptIds = new Set(attempts.filter((attempt) =>
    attempt.step_id === requirement.step_id).map((attempt) => attempt.attempt_id));
  const subject = operations.requiredStepSubject(operation, requirement.step_id);
  const bindingByEvidence = new Map(bindings.map((binding) => [binding.evidence_id, binding]));
  return evidence.filter((item) => {
    const binding = bindingByEvidence.get(item.evidence_id);
    return attemptIds.has(item.step_attempt_id)
      && item.subject_digest === subject
      && requirement.evidence_types.includes(item.evidence_type)
      && binding?.verifier_contract_digest === requirement.verifier_contract_digest;
  });
}

function requirementResult(requirement, matches) {
  const evidenceDigests = matches.map((item) => operations.sha256Digest(item)).sort();
  let status = 'unknown';
  let reasonCode = 'REQUIRED_PROOF_MISSING';
  if (matches.some((item) => item.status === 'passed')) {
    status = 'passed';
    reasonCode = 'REQUIRED_PROOF_PASSED';
  } else if (matches.some((item) => item.status === 'failed')) {
    status = 'failed';
    reasonCode = 'REQUIRED_PROOF_FAILED';
  } else if (matches.some((item) => item.status === 'blocked')) {
    status = 'blocked';
    reasonCode = 'REQUIRED_PROOF_BLOCKED';
  } else if (matches.length) {
    reasonCode = 'REQUIRED_PROOF_UNKNOWN';
  }
  return Object.freeze({
    requirement_id: requirement.requirement_id,
    status,
    evidence_digests: Object.freeze(evidenceDigests),
    reason_code: reasonCode,
  });
}

function evaluateProofPolicy(options) {
  const {
    operation, run, attempts = [], evidence = [], bindings = [], proofPolicy,
  } = options;
  const errors = [
    ...operations.validateOperationSpec(operation),
    ...operations.validateOperationRun(run),
    ...validateProofPolicy(proofPolicy, operation),
  ];
  attempts.forEach((attempt) => errors.push(...operations.validateStepAttempt(attempt)));
  evidence.forEach((item) => errors.push(...operations.validateEvidenceEnvelope(item)));
  bindings.forEach((binding) => errors.push(...validateEvidenceBinding(binding)));
  if (errors.length) throw new TypeError(`Invalid proof evaluation input: ${errors.join('; ')}`);
  if (run.operation_id !== operation.operation_id || run.spec_digest !== operations.sha256Digest(operation)) {
    throw new TypeError('run does not bind operation');
  }
  const runAttemptIds = new Set(run.step_attempt_ids);
  if (attempts.some((attempt) => attempt.run_id !== run.run_id || !runAttemptIds.has(attempt.attempt_id))) {
    throw new TypeError('attempt does not belong to run');
  }
  const attemptIds = new Set(attempts.map((attempt) => attempt.attempt_id));
  if (evidence.some((item) => item.run_id !== run.run_id || !attemptIds.has(item.step_attempt_id))) {
    throw new TypeError('evidence does not belong to an included attempt');
  }
  const evidenceIds = new Set(evidence.map((item) => item.evidence_id));
  if (bindings.length !== evidence.length || new Set(bindings.map((item) => item.evidence_id)).size !== bindings.length
    || bindings.some((binding) => !evidenceIds.has(binding.evidence_id))) {
    throw new TypeError('evidence bindings must exactly cover evidence');
  }
  const results = proofPolicy.requirements.map((requirement) =>
    requirementResult(requirement, matchingEvidence(requirement, operation, attempts, evidence, bindings)));
  const coverage = results.every((item) => item.evidence_digests.length > 0) ? 'complete' : 'incomplete';
  let status = 'unknown';
  if (results.every((item) => item.status === 'passed')) status = 'passed';
  else if (results.some((item) => item.status === 'failed')) status = 'failed';
  else if (results.some((item) => item.status === 'blocked')) status = 'blocked';
  const evaluation = {
    control_plane_contract_version: CONTROL_PLANE_CONTRACT_VERSION,
    kind: 'proof_policy_evaluation',
    proof_policy_digest: operations.sha256Digest(proofPolicy),
    operation_digest: operations.sha256Digest(operation),
    status,
    coverage,
    requirements: Object.freeze(results),
  };
  if (!exactFields(evaluation, EVALUATION_FIELDS)
    || evaluation.requirements.some((item) => !exactFields(item, RESULT_FIELDS))) {
    throw new TypeError('proof evaluation fields are invalid');
  }
  return Object.freeze(evaluation);
}

module.exports = Object.freeze({
  BINDING_FIELDS,
  EVALUATION_FIELDS,
  POLICY_FIELDS,
  REQUIREMENT_FIELDS,
  RESULT_FIELDS,
  VERIFIER_POLICIES,
  evaluateProofPolicy,
  validateEvidenceBinding,
  validateProofPolicy,
});

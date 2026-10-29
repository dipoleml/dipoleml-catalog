'use strict';

const crypto = require('crypto');
const operations = require('../operations');
const app = require('../../packages/contracts/app');
const {
  CONTROL_PLANE_CONTRACT_VERSION,
  exactFields,
  validDigest,
  validId,
  validatePublicValue,
} = require('./contracts');
const {
  validateAuthorityEnvelope,
  verifyAuthorityEnvelope,
} = require('./authority');
const {
  evaluateProofPolicy,
  validateEvidenceBinding,
  validateProofPolicy,
} = require('./proof-policy');

const BASE_FIELDS = Object.freeze([
  'control_plane_contract_version', 'kind', 'operation_spec', 'proof_policy',
  'accepted_intents', 'authority_grant_envelopes', 'operation_run',
  'step_attempts', 'evidence_envelopes', 'evidence_bindings', 'handoffs',
  'execution_plan_digest', 'proof_evaluation', 'execution_receipt_envelope',
]);
const BUNDLE_FIELDS = Object.freeze([...BASE_FIELDS, 'bundle_digest', 'signature']);
const SIGNATURE_FIELDS = Object.freeze(['algorithm', 'key_id', 'signature_base64']);

function signatureErrors(signature) {
  const errors = [];
  if (!exactFields(signature, SIGNATURE_FIELDS)) return ['proof bundle signature fields are invalid'];
  if (signature.algorithm !== 'ed25519') errors.push('proof bundle signature algorithm is invalid');
  if (!validId(signature.key_id)) errors.push('proof bundle signature key_id is invalid');
  if (typeof signature.signature_base64 !== 'string'
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(signature.signature_base64)) {
    errors.push('proof bundle signature is invalid');
  }
  return errors;
}

function normalizedRunForPolicy(run, evaluation) {
  if (run.status !== 'passed' || evaluation.status === 'passed') return run;
  return Object.freeze({ ...run, status: 'unknown' });
}

function createProofBundle(options) {
  const initialEvaluation = evaluateProofPolicy({
    operation: options.operation,
    run: options.run,
    attempts: options.attempts,
    evidence: options.evidence,
    bindings: options.bindings,
    proofPolicy: options.proofPolicy,
  });
  const run = normalizedRunForPolicy(options.run, initialEvaluation);
  const evaluation = run === options.run ? initialEvaluation : evaluateProofPolicy({
    operation: options.operation,
    run,
    attempts: options.attempts,
    evidence: options.evidence,
    bindings: options.bindings,
    proofPolicy: options.proofPolicy,
  });
  const receipt = operations.createExecutionReceipt({
    operation: options.operation,
    run,
    evidence: options.evidence,
    issuedAt: options.issuedAt,
    issuerId: options.issuerId,
  });
  const base = {
    control_plane_contract_version: CONTROL_PLANE_CONTRACT_VERSION,
    kind: 'external_control_plane_proof_bundle',
    operation_spec: options.operation,
    proof_policy: options.proofPolicy,
    accepted_intents: Object.freeze([...options.intents]),
    authority_grant_envelopes: Object.freeze([...options.authorityEnvelopes]),
    operation_run: run,
    step_attempts: Object.freeze([...options.attempts]),
    evidence_envelopes: Object.freeze([...options.evidence]),
    evidence_bindings: Object.freeze([...options.bindings]),
    handoffs: Object.freeze([...(options.handoffs || [])]),
    execution_plan_digest: options.executionPlanDigest,
    proof_evaluation: evaluation,
    execution_receipt_envelope: operations.unsignedReceiptEnvelope(receipt),
  };
  const bundleDigest = operations.sha256Digest(base);
  const key = options.privateKey?.type === 'private'
    ? options.privateKey : crypto.createPrivateKey(options.privateKey);
  if (key.asymmetricKeyType !== 'ed25519') throw new TypeError('proof signing requires Ed25519');
  if (!validId(options.keyId)) throw new TypeError('proof keyId is invalid');
  const bundle = {
    ...base,
    bundle_digest: bundleDigest,
    signature: Object.freeze({
      algorithm: 'ed25519',
      key_id: options.keyId,
      signature_base64: crypto.sign(
        null, Buffer.from(operations.canonicalSerialize(base), 'utf8'), key,
      ).toString('base64'),
    }),
  };
  const errors = validateProofBundle(bundle);
  if (errors.length) throw new TypeError(`Invalid proof bundle: ${errors.join('; ')}`);
  return Object.freeze(bundle);
}

function validateProofBundle(bundle) {
  const errors = [];
  if (!exactFields(bundle, BUNDLE_FIELDS)) return ['proof bundle fields are invalid'];
  if (bundle.control_plane_contract_version !== CONTROL_PLANE_CONTRACT_VERSION) errors.push('unsupported proof bundle version');
  if (bundle.kind !== 'external_control_plane_proof_bundle') errors.push('proof bundle kind is invalid');
  errors.push(...operations.validateOperationSpec(bundle.operation_spec));
  errors.push(...validateProofPolicy(bundle.proof_policy, bundle.operation_spec));
  if (!Array.isArray(bundle.accepted_intents)) errors.push('accepted_intents must be an array');
  else bundle.accepted_intents.forEach((intent) => errors.push(...operations.validateIntent(intent)));
  if (!Array.isArray(bundle.authority_grant_envelopes)) errors.push('authority grants must be an array');
  else bundle.authority_grant_envelopes.forEach((envelope) => errors.push(...validateAuthorityEnvelope(envelope)));
  errors.push(...operations.validateOperationRun(bundle.operation_run));
  if (!Array.isArray(bundle.step_attempts)) errors.push('step_attempts must be an array');
  else bundle.step_attempts.forEach((attempt) => errors.push(...operations.validateStepAttempt(attempt)));
  if (!Array.isArray(bundle.evidence_envelopes)) errors.push('evidence_envelopes must be an array');
  else bundle.evidence_envelopes.forEach((item) => errors.push(...operations.validateEvidenceEnvelope(item)));
  if (!Array.isArray(bundle.evidence_bindings)) errors.push('evidence_bindings must be an array');
  else bundle.evidence_bindings.forEach((binding) => errors.push(...validateEvidenceBinding(binding)));
  if (!Array.isArray(bundle.handoffs)) errors.push('handoffs must be an array');
  else bundle.handoffs.forEach((handoff) => errors.push(...app.validateHandoff(handoff)));
  if (!validDigest(bundle.execution_plan_digest)) errors.push('execution_plan_digest is invalid');
  if (!validDigest(bundle.bundle_digest)) errors.push('bundle_digest is invalid');
  errors.push(...signatureErrors(bundle.signature));
  errors.push(...operations.validateReceiptEnvelope(bundle.execution_receipt_envelope));
  const base = {};
  for (const field of BASE_FIELDS) base[field] = bundle[field];
  if (bundle.bundle_digest !== operations.sha256Digest(base)) errors.push('bundle_digest does not match bundle');
  errors.push(...validatePublicValue(bundle, 'proof_bundle'));
  return errors;
}

function crossLinkErrors(bundle, authorityOptions) {
  const errors = [];
  const operationDigest = operations.sha256Digest(bundle.operation_spec);
  const policyDigest = operations.sha256Digest(bundle.proof_policy);
  if (!bundle.operation_spec.policy_digests.includes(policyDigest)) errors.push('operation does not bind proof policy');
  const run = bundle.operation_run;
  if (run.operation_id !== bundle.operation_spec.operation_id || run.spec_digest !== operationDigest) {
    errors.push('run does not bind operation');
  }
  const intentIds = bundle.accepted_intents.map((intent) => intent.intent_id);
  if (JSON.stringify(intentIds) !== JSON.stringify(run.intent_ids)) errors.push('accepted intent lineage does not match run');
  const grants = bundle.authority_grant_envelopes;
  for (const intent of bundle.accepted_intents) {
    const matching = grants.find((envelope) => envelope.grant.operation_digest === operationDigest
      && envelope.grant.actor_id === intent.actor_id
      && envelope.grant.scope_digest === intent.scope_digest
      && envelope.grant.permitted_actions.includes(intent.action));
    if (!matching) errors.push(`intent has no matching authority: ${intent.intent_id}`);
  }
  for (const envelope of grants) {
    const verification = verifyAuthorityEnvelope(envelope, authorityOptions);
    if (verification.status !== 'verified') errors.push(verification.reason_code);
  }
  let evaluation;
  try {
    evaluation = evaluateProofPolicy({
      operation: bundle.operation_spec,
      run,
      attempts: bundle.step_attempts,
      evidence: bundle.evidence_envelopes,
      bindings: bundle.evidence_bindings,
      proofPolicy: bundle.proof_policy,
    });
  } catch (error) {
    errors.push(error.message);
  }
  if (evaluation
    && operations.canonicalSerialize(evaluation) !== operations.canonicalSerialize(bundle.proof_evaluation)) {
    errors.push('proof evaluation is not reproducible');
  }
  const receipt = bundle.execution_receipt_envelope.receipt;
  if (receipt.operation_digest !== operationDigest || receipt.run_digest !== operations.sha256Digest(run)) {
    errors.push('execution receipt does not bind bundle operation and run');
  }
  if (receipt.status !== bundle.proof_evaluation.status) {
    errors.push('receipt status does not match proof evaluation');
  }
  return errors;
}

function verifyProofBundle(bundle, options = {}) {
  const errors = validateProofBundle(bundle);
  if (errors.length) {
    return Object.freeze({
      status: 'invalid', reason_code: 'PROOF_BUNDLE_INVALID',
      key_id: null, receipt_status: bundle?.execution_receipt_envelope?.receipt?.status || 'unknown',
      proof_status: bundle?.proof_evaluation?.status || 'unknown',
    });
  }
  const keyId = bundle.signature.key_id;
  const publicKey = options.trustedKeys instanceof Map
    ? options.trustedKeys.get(keyId) : options.trustedKeys?.[keyId];
  if (!publicKey) {
    return Object.freeze({
      status: 'unknown', reason_code: 'PROOF_SIGNER_NOT_TRUSTED', key_id: keyId,
      receipt_status: bundle.execution_receipt_envelope.receipt.status,
      proof_status: bundle.proof_evaluation.status,
    });
  }
  try {
    const key = publicKey.type === 'public' ? publicKey : crypto.createPublicKey(publicKey);
    const base = {};
    for (const field of BASE_FIELDS) base[field] = bundle[field];
    if (key.asymmetricKeyType !== 'ed25519' || !crypto.verify(
      null,
      Buffer.from(operations.canonicalSerialize(base), 'utf8'),
      key,
      Buffer.from(bundle.signature.signature_base64, 'base64'),
    )) {
      return Object.freeze({
        status: 'invalid', reason_code: 'PROOF_SIGNATURE_INVALID', key_id: keyId,
        receipt_status: bundle.execution_receipt_envelope.receipt.status,
        proof_status: bundle.proof_evaluation.status,
      });
    }
  } catch (_error) {
    return Object.freeze({
      status: 'invalid', reason_code: 'PROOF_SIGNATURE_ERROR', key_id: keyId,
      receipt_status: bundle.execution_receipt_envelope.receipt.status,
      proof_status: bundle.proof_evaluation.status,
    });
  }
  const links = crossLinkErrors(bundle, options.authority || {});
  return Object.freeze({
    status: links.length ? 'invalid' : 'verified',
    reason_code: links.length ? 'PROOF_LINKAGE_INVALID' : 'PROOF_BUNDLE_VERIFIED',
    key_id: keyId,
    receipt_status: bundle.execution_receipt_envelope.receipt.status,
    proof_status: bundle.proof_evaluation.status,
  });
}

module.exports = Object.freeze({
  BASE_FIELDS,
  BUNDLE_FIELDS,
  SIGNATURE_FIELDS,
  createProofBundle,
  validateProofBundle,
  verifyProofBundle,
});

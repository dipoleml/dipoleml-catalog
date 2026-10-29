'use strict';

const operations = require('../operations');

const CONTROL_PLANE_CONTRACT_VERSION = '0.1';
const CONTROL_PLANE_API_VERSION = 1;
const MAX_PUBLIC_PAYLOAD_BYTES = 64 * 1024;
const MAX_PUBLIC_PAYLOAD_DEPTH = 8;
const DOMAIN_OUTCOMES = Object.freeze([
  'accepted', 'rejected', 'conflict', 'blocked', 'unknown',
]);
const METHODS = Object.freeze({
  handshake: 'query',
  'operations.submit': 'command',
  'operations.get': 'query',
  'intents.submit': 'command',
  'events.replay': 'query',
  'proof.get': 'query',
});
const REQUEST_FIELDS = Object.freeze([
  'control_plane_api_version', 'request_id', 'kind', 'method', 'payload',
  'sent_at', 'traceparent', 'idempotency_key', 'expected_revision',
]);
const RESPONSE_FIELDS = Object.freeze([
  'control_plane_api_version', 'request_id', 'outcome', 'reason_code',
  'current_revision', 'result', 'completed_at',
]);
const SUBMISSION_FIELDS = Object.freeze([
  'control_plane_contract_version', 'kind', 'submission_id', 'adapter_id',
  'operation_spec', 'proof_policy', 'scope_digest', 'authority_policy_digest',
  'authority_grant_envelope', 'submitted_at',
]);
const COMMAND_FIELDS = Object.freeze([
  'control_plane_contract_version', 'kind', 'command_id', 'intent',
  'authority_grant_envelope', 'reason_code', 'reason_digest',
]);
const PROHIBITED_KEYS = Object.freeze(new Set([
  'path', 'filepath', 'workspacepath', 'directory', 'cwd', 'root', 'command',
  'shell', 'argv', 'env', 'environment', 'secret', 'token', 'apikey',
  'password', 'prompt', 'sourcecode', 'terminaloutput', 'privatekey',
  'publickey', 'repository', 'repositoryname', 'url',
]));
const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function exactFields(value, fields) {
  return isPlainObject(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
}

function canonicalTimestamp(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function validId(value) {
  return typeof value === 'string' && value.length <= 128 && operations.ID_PATTERN.test(value);
}

function validDigest(value) {
  return typeof value === 'string' && operations.DIGEST_PATTERN.test(value);
}

function normalizedKey(key) {
  return key.toLowerCase().replace(/[-_]/g, '');
}

function inspectPublicValue(value, errors, label = 'payload', depth = 0, seen = new Set()) {
  if (depth > MAX_PUBLIC_PAYLOAD_DEPTH) {
    errors.push(`${label} exceeds maximum depth`);
    return;
  }
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'string') {
    if (value.includes('\0')) errors.push(`${label} contains a null byte`);
    if (/(?:https?|file):\/\//i.test(value)) errors.push(`${label} contains a prohibited URL`);
    return;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) errors.push(`${label} contains a non-finite number`);
    return;
  }
  if (typeof value !== 'object') {
    errors.push(`${label} contains a non-JSON value`);
    return;
  }
  if (seen.has(value)) {
    errors.push(`${label} contains a cycle`);
    return;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectPublicValue(item, errors, `${label}[${index}]`, depth + 1, seen));
  } else if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (PROHIBITED_KEYS.has(normalizedKey(key))) errors.push(`${label}.${key} is prohibited`);
      inspectPublicValue(item, errors, `${label}.${key}`, depth + 1, seen);
    }
  } else {
    errors.push(`${label} must contain only plain objects and arrays`);
  }
  seen.delete(value);
}

function validatePublicValue(value, label = 'payload') {
  const errors = [];
  inspectPublicValue(value, errors, label);
  try {
    if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_PUBLIC_PAYLOAD_BYTES) {
      errors.push(`${label} exceeds ${MAX_PUBLIC_PAYLOAD_BYTES} bytes`);
    }
  } catch (_error) {
    errors.push(`${label} is not serializable`);
  }
  return errors;
}

function validateTraceparent(value) {
  if (value === null) return [];
  const match = typeof value === 'string' ? value.match(TRACEPARENT) : null;
  if (!match || /^0+$/.test(match[1]) || /^0+$/.test(match[2])) return ['traceparent is invalid'];
  return [];
}

function validateRequestEnvelope(value) {
  const errors = [];
  if (!exactFields(value, REQUEST_FIELDS)) return ['request fields are invalid'];
  if (value.control_plane_api_version !== CONTROL_PLANE_API_VERSION) errors.push('unsupported control-plane API version');
  if (!validId(value.request_id)) errors.push('request_id is invalid');
  if (!Object.hasOwn(METHODS, value.method)) errors.push('method is unsupported');
  const expectedKind = METHODS[value.method];
  if (value.kind !== expectedKind) errors.push('request kind does not match method');
  if (!isPlainObject(value.payload)) errors.push('payload must be a plain object');
  else errors.push(...validatePublicValue(value.payload));
  if (!canonicalTimestamp(value.sent_at)) errors.push('sent_at must be canonical');
  errors.push(...validateTraceparent(value.traceparent));
  if (expectedKind === 'command') {
    if (!validId(value.idempotency_key)) errors.push('command idempotency_key is invalid');
  } else if (value.idempotency_key !== null) errors.push('query idempotency_key must be null');
  const requiresRevision = value.method === 'intents.submit';
  if (requiresRevision && (!Number.isSafeInteger(value.expected_revision) || value.expected_revision < 0)) {
    errors.push('expected_revision is required for intent mutation');
  }
  if (!requiresRevision && value.expected_revision !== null) errors.push('expected_revision must be null for this method');
  return errors;
}

function validateResponseEnvelope(value) {
  const errors = [];
  if (!exactFields(value, RESPONSE_FIELDS)) return ['response fields are invalid'];
  if (value.control_plane_api_version !== CONTROL_PLANE_API_VERSION) errors.push('response API version is invalid');
  if (!validId(value.request_id)) errors.push('response request_id is invalid');
  if (!DOMAIN_OUTCOMES.includes(value.outcome)) errors.push('response outcome is invalid');
  if (typeof value.reason_code !== 'string' || !/^[A-Z][A-Z0-9_]{0,63}$/.test(value.reason_code)) {
    errors.push('response reason_code is invalid');
  }
  if (value.current_revision !== null
    && (!Number.isSafeInteger(value.current_revision) || value.current_revision < 0)) {
    errors.push('response current_revision is invalid');
  }
  if (!isPlainObject(value.result)) errors.push('response result must be a plain object');
  else errors.push(...validatePublicValue(value.result, 'result'));
  if (!canonicalTimestamp(value.completed_at)) errors.push('completed_at must be canonical');
  return errors;
}

function validateSubmission(value, validateProofPolicy, validateAuthorityEnvelope) {
  const errors = [];
  if (!exactFields(value, SUBMISSION_FIELDS)) return ['submission fields are invalid'];
  if (value.control_plane_contract_version !== CONTROL_PLANE_CONTRACT_VERSION) errors.push('unsupported submission version');
  if (value.kind !== 'external_operation_submission') errors.push('submission kind is invalid');
  for (const field of ['submission_id', 'adapter_id']) if (!validId(value[field])) errors.push(`${field} is invalid`);
  errors.push(...operations.validateOperationSpec(value.operation_spec));
  errors.push(...validateProofPolicy(value.proof_policy, value.operation_spec));
  if (!validDigest(value.scope_digest)) errors.push('scope_digest is invalid');
  if (!validDigest(value.authority_policy_digest)) errors.push('authority_policy_digest is invalid');
  errors.push(...validateAuthorityEnvelope(value.authority_grant_envelope));
  if (!canonicalTimestamp(value.submitted_at)) errors.push('submitted_at must be canonical');
  if (isPlainObject(value.operation_spec) && isPlainObject(value.proof_policy)) {
    const policyDigest = operations.sha256Digest(value.proof_policy);
    if (!value.operation_spec.policy_digests?.includes(policyDigest)) {
      errors.push('operation_spec does not bind proof_policy');
    }
    if (!value.operation_spec.policy_digests?.includes(value.authority_policy_digest)) {
      errors.push('operation_spec does not bind authority_policy_digest');
    }
  }
  return errors;
}

function validateIntentCommand(value, validateAuthorityEnvelope) {
  const errors = [];
  if (!exactFields(value, COMMAND_FIELDS)) return ['intent command fields are invalid'];
  if (value.control_plane_contract_version !== CONTROL_PLANE_CONTRACT_VERSION) errors.push('unsupported command version');
  if (value.kind !== 'external_intent_command') errors.push('intent command kind is invalid');
  if (!validId(value.command_id)) errors.push('command_id is invalid');
  errors.push(...operations.validateIntent(value.intent));
  errors.push(...validateAuthorityEnvelope(value.authority_grant_envelope));
  if (typeof value.reason_code !== 'string' || !/^[A-Z][A-Z0-9_]{0,63}$/.test(value.reason_code)) {
    errors.push('reason_code is invalid');
  }
  if (value.reason_digest !== null && !validDigest(value.reason_digest)) errors.push('reason_digest is invalid');
  return errors;
}

module.exports = Object.freeze({
  COMMAND_FIELDS,
  CONTROL_PLANE_API_VERSION,
  CONTROL_PLANE_CONTRACT_VERSION,
  DOMAIN_OUTCOMES,
  MAX_PUBLIC_PAYLOAD_BYTES,
  MAX_PUBLIC_PAYLOAD_DEPTH,
  METHODS,
  REQUEST_FIELDS,
  RESPONSE_FIELDS,
  SUBMISSION_FIELDS,
  canonicalTimestamp,
  exactFields,
  isPlainObject,
  validDigest,
  validId,
  validateIntentCommand,
  validatePublicValue,
  validateRequestEnvelope,
  validateResponseEnvelope,
  validateSubmission,
});

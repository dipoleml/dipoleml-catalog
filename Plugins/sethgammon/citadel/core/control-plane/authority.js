'use strict';

const crypto = require('crypto');
const operations = require('../operations');
const {
  CONTROL_PLANE_CONTRACT_VERSION,
  canonicalTimestamp,
  exactFields,
  validDigest,
  validId,
} = require('./contracts');

const GRANT_FIELDS = Object.freeze([
  'control_plane_contract_version', 'kind', 'grant_id', 'issuer_id', 'actor_id',
  'operation_digest', 'scope_digest', 'permitted_actions', 'issued_at',
  'expires_at', 'nonce',
]);
const ENVELOPE_FIELDS = Object.freeze([
  'control_plane_contract_version', 'kind', 'grant', 'grant_digest', 'signature',
]);
const SIGNATURE_FIELDS = Object.freeze(['algorithm', 'key_id', 'signature_base64']);

function validateAuthorityGrant(value) {
  const errors = [];
  if (!exactFields(value, GRANT_FIELDS)) return ['authority grant fields are invalid'];
  if (value.control_plane_contract_version !== CONTROL_PLANE_CONTRACT_VERSION) errors.push('unsupported authority grant version');
  if (value.kind !== 'authority_grant') errors.push('authority grant kind is invalid');
  for (const field of ['grant_id', 'issuer_id', 'actor_id', 'nonce']) {
    if (!validId(value[field])) errors.push(`${field} is invalid`);
  }
  for (const field of ['operation_digest', 'scope_digest']) {
    if (!validDigest(value[field])) errors.push(`${field} is invalid`);
  }
  if (!Array.isArray(value.permitted_actions) || value.permitted_actions.length < 1
    || value.permitted_actions.length > operations.INTENT_ACTIONS.length
    || new Set(value.permitted_actions).size !== value.permitted_actions.length
    || value.permitted_actions.some((action) => !operations.INTENT_ACTIONS.includes(action))) {
    errors.push('permitted_actions is invalid');
  }
  if (!canonicalTimestamp(value.issued_at)) errors.push('issued_at must be canonical');
  if (!canonicalTimestamp(value.expires_at)) errors.push('expires_at must be canonical');
  if (canonicalTimestamp(value.issued_at) && canonicalTimestamp(value.expires_at)
    && Date.parse(value.expires_at) <= Date.parse(value.issued_at)) errors.push('authority grant expiry is invalid');
  return errors;
}

function validateAuthorityEnvelope(value) {
  const errors = [];
  if (!exactFields(value, ENVELOPE_FIELDS)) return ['authority envelope fields are invalid'];
  if (value.control_plane_contract_version !== CONTROL_PLANE_CONTRACT_VERSION) errors.push('unsupported authority envelope version');
  if (value.kind !== 'authority_grant_envelope') errors.push('authority envelope kind is invalid');
  errors.push(...validateAuthorityGrant(value.grant));
  if (!validDigest(value.grant_digest) || value.grant_digest !== operations.sha256Digest(value.grant)) {
    errors.push('grant_digest does not match grant');
  }
  if (!exactFields(value.signature, SIGNATURE_FIELDS)) errors.push('authority signature fields are invalid');
  else {
    if (value.signature.algorithm !== 'ed25519') errors.push('authority signature algorithm is invalid');
    if (!validId(value.signature.key_id)) errors.push('authority signature key_id is invalid');
    if (typeof value.signature.signature_base64 !== 'string'
      || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.signature.signature_base64)) {
      errors.push('authority signature is invalid');
    }
  }
  return errors;
}

function createAuthorityEnvelope(grant, privateKey, keyId) {
  const errors = validateAuthorityGrant(grant);
  if (errors.length) throw new TypeError(errors.join('; '));
  if (!validId(keyId)) throw new TypeError('keyId is invalid');
  const key = privateKey?.type === 'private' ? privateKey : crypto.createPrivateKey(privateKey);
  if (key.asymmetricKeyType !== 'ed25519') throw new TypeError('authority signing requires Ed25519');
  const grantDigest = operations.sha256Digest(grant);
  return Object.freeze({
    control_plane_contract_version: CONTROL_PLANE_CONTRACT_VERSION,
    kind: 'authority_grant_envelope',
    grant: Object.freeze(grant),
    grant_digest: grantDigest,
    signature: Object.freeze({
      algorithm: 'ed25519',
      key_id: keyId,
      signature_base64: crypto.sign(
        null, Buffer.from(operations.canonicalSerialize(grant), 'utf8'), key,
      ).toString('base64'),
    }),
  });
}

function verifyAuthorityEnvelope(envelope, options = {}) {
  const errors = validateAuthorityEnvelope(envelope);
  if (errors.length) return Object.freeze({ status: 'invalid', reason_code: 'AUTHORITY_INVALID', key_id: null });
  const keyId = envelope.signature.key_id;
  const publicKey = options.trustedKeys instanceof Map
    ? options.trustedKeys.get(keyId) : options.trustedKeys?.[keyId];
  if (!publicKey) return Object.freeze({ status: 'unknown', reason_code: 'AUTHORITY_SIGNER_NOT_TRUSTED', key_id: keyId });
  try {
    const key = publicKey.type === 'public' ? publicKey : crypto.createPublicKey(publicKey);
    if (key.asymmetricKeyType !== 'ed25519') {
      return Object.freeze({ status: 'invalid', reason_code: 'AUTHORITY_KEY_INVALID', key_id: keyId });
    }
    const valid = crypto.verify(
      null,
      Buffer.from(operations.canonicalSerialize(envelope.grant), 'utf8'),
      key,
      Buffer.from(envelope.signature.signature_base64, 'base64'),
    );
    if (!valid) return Object.freeze({ status: 'invalid', reason_code: 'AUTHORITY_SIGNATURE_INVALID', key_id: keyId });
  } catch (_error) {
    return Object.freeze({ status: 'invalid', reason_code: 'AUTHORITY_VERIFICATION_ERROR', key_id: keyId });
  }
  if (options.revokedGrantIds?.has(envelope.grant.grant_id)) {
    return Object.freeze({ status: 'invalid', reason_code: 'AUTHORITY_REVOKED', key_id: keyId });
  }
  const now = Date.parse(options.now || new Date().toISOString());
  if (now < Date.parse(envelope.grant.issued_at)) {
    return Object.freeze({ status: 'invalid', reason_code: 'AUTHORITY_NOT_YET_VALID', key_id: keyId });
  }
  if (now >= Date.parse(envelope.grant.expires_at)) {
    return Object.freeze({ status: 'invalid', reason_code: 'AUTHORITY_EXPIRED', key_id: keyId });
  }
  return Object.freeze({ status: 'verified', reason_code: 'AUTHORITY_VERIFIED', key_id: keyId });
}

module.exports = Object.freeze({
  ENVELOPE_FIELDS,
  GRANT_FIELDS,
  SIGNATURE_FIELDS,
  createAuthorityEnvelope,
  validateAuthorityEnvelope,
  validateAuthorityGrant,
  verifyAuthorityEnvelope,
});

'use strict';

const {
  digest,
  exactFields,
} = require('./contracts');

const ROTATION_FIELDS = Object.freeze([
  'schema',
  'kind',
  'rotated_at',
  'reason_code',
  'previous_public_key_digest',
  'current_public_key_digest',
  'matrix_runs_before_rotation',
  'selection_record_digest',
  'selection_unchanged',
]);
const DIGEST = /^sha256:[0-9a-f]{64}$/;

function validateAttestationRotation(value, freeze, source = 'attestation key rotation') {
  if (!exactFields(value, ROTATION_FIELDS)
    || value.schema !== 1
    || value.kind !== 'citadel_optimizer_attestation_key_rotation') {
    throw new Error(`${source} identity or fields are invalid`);
  }
  if (typeof value.rotated_at !== 'string'
    || !Number.isFinite(Date.parse(value.rotated_at))
    || value.reason_code !== 'ORIGINAL_PRIVATE_KEY_UNAVAILABLE_BEFORE_MATRIX'
    || !DIGEST.test(value.previous_public_key_digest)
    || !DIGEST.test(value.current_public_key_digest)
    || value.previous_public_key_digest === value.current_public_key_digest) {
    throw new Error(`${source} provenance is invalid`);
  }
  if (freeze.attestation_public_key === null
    || value.current_public_key_digest !== digest(freeze.attestation_public_key)
    || value.matrix_runs_before_rotation !== 0
    || value.selection_unchanged !== true
    || freeze.external_scenario === null
    || value.selection_record_digest !== freeze.external_scenario.selection_record_digest) {
    throw new Error(`${source} does not bind the pre-matrix freeze`);
  }
  return value;
}

module.exports = Object.freeze({
  ROTATION_FIELDS,
  validateAttestationRotation,
});

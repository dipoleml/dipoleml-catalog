'use strict';

const crypto = require('crypto');
const {
  canonical,
  digest,
  exactFields,
  validateRun,
} = require('./contracts');

const REPRODUCTION_FIELDS = Object.freeze([
  'schema',
  'kind',
  'scenario_id',
  'reproduced_by',
  'reproduction_source',
  'public_key',
  'run',
]);

function verifyRunAttestation(run, publicKey) {
  try {
    validateRun(run);
    const key = crypto.createPublicKey(publicKey);
    const unsigned = { ...run, attestation: null };
    return run.evidence_kind === 'actual-run'
      && key.asymmetricKeyType === 'ed25519'
      && crypto.verify(
        null,
        Buffer.from(canonical(unsigned)),
        key,
        Buffer.from(run.attestation.signature_base64, 'base64'),
      );
  } catch {
    return false;
  }
}

function validateExternalReproduction(value, freeze, source = 'external reproduction') {
  if (!exactFields(value, REPRODUCTION_FIELDS)
    || value.schema !== 1
    || value.kind !== 'citadel_optimizer_external_reproduction') {
    throw new Error(`${source} identity or fields are invalid`);
  }
  if (!freeze.external_scenario || value.scenario_id !== freeze.external_scenario.scenario_id) {
    throw new Error(`${source} does not match the outside-selected scenario`);
  }
  if (typeof value.reproduced_by !== 'string' || !value.reproduced_by.trim()) {
    throw new Error(`${source}.reproduced_by is invalid`);
  }
  if (typeof value.reproduction_source !== 'string' || !/^https:\/\//.test(value.reproduction_source)) {
    throw new Error(`${source}.reproduction_source is invalid`);
  }
  try {
    if (crypto.createPublicKey(value.public_key).asymmetricKeyType !== 'ed25519') {
      throw new Error('wrong key type');
    }
  } catch {
    throw new Error(`${source}.public_key must be Ed25519 PEM`);
  }
  if (freeze.attestation_public_key
    && value.public_key.trim() === freeze.attestation_public_key.trim()) {
    throw new Error(`${source}.public_key must differ from the local matrix signer`);
  }
  validateRun(value.run, `${source}.run`);
  if (value.run.evidence_kind !== 'actual-run'
    || value.run.scenario_id !== value.scenario_id
    || !verifyRunAttestation(value.run, value.public_key)) {
    throw new Error(`${source} run attestation is invalid`);
  }
  return value;
}

function externalReproductionDigest(value, freeze) {
  return digest(validateExternalReproduction(value, freeze));
}

module.exports = Object.freeze({
  REPRODUCTION_FIELDS,
  externalReproductionDigest,
  validateExternalReproduction,
});

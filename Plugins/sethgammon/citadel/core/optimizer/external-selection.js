'use strict';

const crypto = require('crypto');
const {
  canonical,
  digest,
  exactFields,
  scenarioSetIdentity,
} = require('./contracts');

const DRAND = Object.freeze({
  provider: 'league-of-entropy-drand',
  chain_hash: '8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce',
  public_key: '868f005eb8e6e4ca0a47c8a77ceaa5309a47978a7c71bc5cce96366b5d7a569937c529eeda66c7293784a9402801af31',
  round: 6333716,
  round_time: '2026-07-30T20:15:00.000Z',
  source_urls: Object.freeze([
    'https://api.drand.sh/public/6333716',
    'https://api2.drand.sh/public/6333716',
    'https://drand.cloudflare.com/public/6333716',
  ]),
  min_identical_sources: 3,
  selection_rule: 'sha256(request_id_lf_randomness)_uint256_be_mod_holdout_count',
});

const REQUEST_FIELDS = Object.freeze([
  'schema',
  'kind',
  'request_id',
  'scenario_set_id',
  'frozen_at',
  'holdout_scenario_ids',
  'beacon',
]);
const BEACON_REQUEST_FIELDS = Object.freeze([
  'provider',
  'chain_hash',
  'public_key',
  'round',
  'round_time',
  'source_urls',
  'min_identical_sources',
  'selection_rule',
]);
const BEACON_FIELDS = Object.freeze([
  'round',
  'randomness',
  'signature',
  'previous_signature',
]);
const RECORD_FIELDS = Object.freeze([
  'schema',
  'kind',
  'request_id',
  'scenario_set_id',
  'observed_at',
  'beacon',
  'source_urls',
  'verified_relay_count',
  'selection_index',
  'scenario_id',
  'selection_digest',
]);

const HEX_32 = /^[0-9a-f]{64}$/;
const HEX_96 = /^[0-9a-f]{192}$/;

function requestPayload(freeze) {
  return {
    schema: 2,
    kind: 'citadel_optimizer_public_random_selection_request',
    request_id: null,
    scenario_set_id: freeze.scenario_set_id,
    frozen_at: freeze.frozen_at,
    holdout_scenario_ids: [...freeze.holdout_scenario_ids],
    beacon: {
      ...DRAND,
      source_urls: [...DRAND.source_urls],
    },
  };
}

function buildExternalSelectionRequest(freeze, scenarios) {
  if (freeze.scenario_set_id !== scenarioSetIdentity(scenarios)) {
    throw new Error('Public-random selection request requires the frozen scenario set');
  }
  const payload = requestPayload(freeze);
  return validateExternalSelectionRequest({
    ...payload,
    request_id: digest(payload),
  }, freeze, scenarios);
}

function validateExternalSelectionRequest(value, freeze, scenarios) {
  if (!exactFields(value, REQUEST_FIELDS)
    || value.schema !== 2
    || value.kind !== 'citadel_optimizer_public_random_selection_request') {
    throw new Error('Public-random selection request identity or fields are invalid');
  }
  if (value.scenario_set_id !== scenarioSetIdentity(scenarios)
    || value.scenario_set_id !== freeze.scenario_set_id
    || value.frozen_at !== freeze.frozen_at
    || canonical(value.holdout_scenario_ids) !== canonical(freeze.holdout_scenario_ids)) {
    throw new Error('Public-random selection request does not bind the freeze');
  }
  if (!exactFields(value.beacon, BEACON_REQUEST_FIELDS)
    || canonical(value.beacon) !== canonical({
      ...DRAND,
      source_urls: [...DRAND.source_urls],
    })) {
    throw new Error('Public-random selection beacon commitment is invalid');
  }
  const unsigned = { ...value, request_id: null };
  if (value.request_id !== digest(unsigned)) {
    throw new Error('Public-random selection request ID does not bind the request');
  }
  return value;
}

function normalizeBeacon(value, source = 'drand beacon') {
  if (!exactFields(value, BEACON_FIELDS)
    || !Number.isSafeInteger(value.round)
    || value.round < 1
    || typeof value.randomness !== 'string'
    || typeof value.signature !== 'string'
    || typeof value.previous_signature !== 'string') {
    throw new Error(`${source} fields are invalid`);
  }
  const normalized = {
    round: value.round,
    randomness: value.randomness.toLowerCase(),
    signature: value.signature.toLowerCase(),
    previous_signature: value.previous_signature.toLowerCase(),
  };
  if (!HEX_32.test(normalized.randomness)
    || !HEX_96.test(normalized.signature)
    || !HEX_96.test(normalized.previous_signature)) {
    throw new Error(`${source} encoding is invalid`);
  }
  const randomness = crypto.createHash('sha256')
    .update(Buffer.from(normalized.signature, 'hex'))
    .digest('hex');
  if (randomness !== normalized.randomness) {
    throw new Error(`${source} randomness does not match sha256(signature)`);
  }
  return normalized;
}

function selectionEntropy(request, randomness) {
  return crypto.createHash('sha256')
    .update(`${request.request_id}\n${randomness}`)
    .digest('hex');
}

function buildBeaconSelectionRecord(
  request,
  freeze,
  scenarios,
  relayResponses,
  observedAt,
) {
  validateExternalSelectionRequest(request, freeze, scenarios);
  if (!Array.isArray(relayResponses)
    || relayResponses.length !== request.beacon.source_urls.length) {
    throw new Error('Public-random selection requires every committed relay');
  }
  if (typeof observedAt !== 'string'
    || Number.isNaN(Date.parse(observedAt))
    || Date.parse(observedAt) < Date.parse(request.beacon.round_time)) {
    throw new Error('Public-random selection cannot be observed before the committed round');
  }
  const normalized = relayResponses.map((entry, index) => {
    if (!exactFields(entry, ['source_url', 'beacon'])
      || entry.source_url !== request.beacon.source_urls[index]) {
      throw new Error('Public-random relay order or source does not match the commitment');
    }
    return normalizeBeacon(entry.beacon, entry.source_url);
  });
  if (normalized.length < request.beacon.min_identical_sources
    || normalized.some((beacon) => canonical(beacon) !== canonical(normalized[0]))) {
    throw new Error('Public-random relays do not agree on the committed beacon');
  }
  const beacon = normalized[0];
  if (beacon.round !== request.beacon.round) {
    throw new Error('Public-random response does not match the committed round');
  }
  const entropy = selectionEntropy(request, beacon.randomness);
  const selectionIndex = Number(
    BigInt(`0x${entropy}`) % BigInt(request.holdout_scenario_ids.length),
  );
  const unsigned = {
    schema: 1,
    kind: 'citadel_optimizer_public_random_selection',
    request_id: request.request_id,
    scenario_set_id: request.scenario_set_id,
    observed_at: observedAt,
    beacon,
    source_urls: [...request.beacon.source_urls],
    verified_relay_count: normalized.length,
    selection_index: selectionIndex,
    scenario_id: request.holdout_scenario_ids[selectionIndex],
    selection_digest: null,
  };
  return validateBeaconSelectionRecord({
    ...unsigned,
    selection_digest: digest(unsigned),
  }, request, freeze, scenarios);
}

function validateBeaconSelectionRecord(value, request, freeze, scenarios) {
  validateExternalSelectionRequest(request, freeze, scenarios);
  if (!exactFields(value, RECORD_FIELDS)
    || value.schema !== 1
    || value.kind !== 'citadel_optimizer_public_random_selection'
    || value.request_id !== request.request_id
    || value.scenario_set_id !== request.scenario_set_id
    || canonical(value.source_urls) !== canonical(request.beacon.source_urls)
    || value.verified_relay_count < request.beacon.min_identical_sources) {
    throw new Error('Public-random selection record identity or provenance is invalid');
  }
  const beacon = normalizeBeacon(value.beacon);
  if (beacon.round !== request.beacon.round
    || typeof value.observed_at !== 'string'
    || Number.isNaN(Date.parse(value.observed_at))
    || Date.parse(value.observed_at) < Date.parse(request.beacon.round_time)) {
    throw new Error('Public-random selection record timing or round is invalid');
  }
  const entropy = selectionEntropy(request, beacon.randomness);
  const index = Number(
    BigInt(`0x${entropy}`) % BigInt(request.holdout_scenario_ids.length),
  );
  if (value.selection_index !== index
    || value.scenario_id !== request.holdout_scenario_ids[index]) {
    throw new Error('Public-random selection record choice is invalid');
  }
  const unsigned = { ...value, selection_digest: null };
  if (value.selection_digest !== digest(unsigned)) {
    throw new Error('Public-random selection digest does not bind the record');
  }
  return value;
}

function frozenSelectionFromRecord(value, request, freeze, scenarios) {
  const record = validateBeaconSelectionRecord(value, request, freeze, scenarios);
  return {
    scenario_id: record.scenario_id,
    selection_method: 'drand-public-beacon',
    selection_record_digest: record.selection_digest,
    selected_at: request.beacon.round_time.slice(0, 10),
    selection_source: request.beacon.source_urls[0],
  };
}

module.exports = Object.freeze({
  DRAND,
  buildBeaconSelectionRecord,
  buildExternalSelectionRequest,
  frozenSelectionFromRecord,
  validateBeaconSelectionRecord,
  validateExternalSelectionRequest,
});

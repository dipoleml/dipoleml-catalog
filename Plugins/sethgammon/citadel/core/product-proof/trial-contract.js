'use strict';

const crypto = require('crypto');

const SCHEMA = 2;
const ID = /^[a-z][a-z0-9-]{2,96}$/;
const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:+/-]{0,127}$/;
const PROHIBITED_KEY = /(?:^|_)(?:prompt|repo|repository|repository_name|path|file_path|command|body|source|source_code|diff|username|user_identity|email|token|secret|credential|environment|output)(?:_|$)/i;

const PROTOCOL_FIELDS = Object.freeze([
  'schema', 'kind', 'protocol_id', 'evidence_kind', 'created_day',
  'participant_count', 'metric_set_id', 'scenario_pairs', 'strata', 'gates',
  'randomization_digest', 'assignment_commitment', 'signing_public_key',
]);
const PAIR_FIELDS = Object.freeze(['pair_id', 'scenario_a', 'scenario_b', 'category']);
const STRATUM_FIELDS = Object.freeze(['runtime_family', 'model_id', 'os_family']);
const GATE_FIELDS = Object.freeze([
  'telemetry_join_min', 'accepted_completion_margin', 'recovery_gain_min',
  'intervention_reduction_min', 'time_overhead_max', 'verification_accuracy_min',
  'false_pass_max', 'd7_retention_min', 'minimum_public_cell',
]);
const ASSIGNMENT_FIELDS = Object.freeze([
  'schema', 'kind', 'protocol_id', 'assignment_id', 'participant_id',
  'pair_id', 'scenario_id', 'mode', 'order', 'runtime_family', 'model_id',
  'os_family',
]);
const STAGE_FIELDS = Object.freeze([
  'schema', 'kind', 'protocol_id', 'assignment_id', 'stage', 'status',
  'duration_ms', 'failure_code', 'day_since_install',
]);
const SCORE_FIELDS = Object.freeze([
  'schema', 'kind', 'protocol_id', 'assignment_id', 'completed',
  'claimed_verdict', 'oracle_verdict', 'owner_accepted', 'resume_correct',
  'corrective_interventions', 'required_approvals', 'clarifications',
  'rework_cycles', 'regressions',
]);
const ARTIFACT_FIELDS = Object.freeze([
  'schema', 'kind', 'protocol_id', 'assignment_id', 'expected_task_artifacts',
  'receipt_owned_artifacts', 'receipt_owned_bytes', 'unexpected_tracked',
  'unexpected_untracked', 'unexpected_untracked_bytes', 'cleanup_verdict',
]);
const EXIT_FIELDS = Object.freeze([
  'schema', 'kind', 'protocol_id', 'assignment_id', 'plan_reviewed',
  'archive_verdict', 'user_state_verdict', 'hooks_removed_verdict',
  'footprint_verdict', 'restore_verdict',
]);
const RETENTION_FIELDS = Object.freeze([
  'schema', 'kind', 'protocol_id', 'participant_id', 'install_succeeded',
  'observation_day', 'meaningful_task_completed',
  'canonical_verification_passed',
]);
const RECEIPT_FIELDS = Object.freeze([
  'schema', 'kind', 'protocol_id', 'assignment_id', 'issued_at', 'signer',
  'records', 'signature',
]);
const SIGNATURE_FIELDS = Object.freeze(['algorithm', 'value_base64']);

const EVIDENCE_KINDS = Object.freeze(['instrument-proof', 'pilot', 'controlled']);
const MODES = Object.freeze(['bare', 'harnessed']);
const RUNTIMES = Object.freeze(['claude-code', 'codex', 'other']);
const OS_FAMILIES = Object.freeze(['windows', 'macos', 'linux', 'other']);
const STAGES = Object.freeze([
  'assigned', 'install', 'setup', 'task', 'handoff',
  'canonical_verification', 'owner_review', 'resume', 'complete',
]);
const STATUSES = Object.freeze(['started', 'succeeded', 'failed', 'unknown']);
const FAILURE_CODES = Object.freeze([
  'install_failed', 'setup_failed', 'task_failed', 'verification_failed',
  'owner_rejected', 'resume_failed', 'timeout', 'abandoned',
  'telemetry_missing', 'unknown_error',
]);
const VERDICTS = Object.freeze(['passed', 'failed', 'unknown']);
const OUTCOME_VERDICTS = Object.freeze(['passed', 'failed', 'unknown', 'not-run']);
const RECORD_KINDS = Object.freeze([
  'trial_stage_v2', 'trial_score_v2', 'trial_artifacts_v2',
  'trial_exit_v2', 'retention_observation_v2',
]);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(canonical(value)).digest('hex');
}

function exactFields(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (canonical(actual) !== canonical(wanted)) {
    throw new Error(`${label} fields must exactly match schema ${SCHEMA}`);
  }
  assertNoProhibitedFields(value, label);
}

function assertNoProhibitedFields(value, label = 'record') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoProhibitedFields(item, `${label}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (PROHIBITED_KEY.test(key)) throw new Error(`${label} contains prohibited field: ${key}`);
    assertNoProhibitedFields(item, `${label}.${key}`);
  }
}

function id(value, label) {
  if (typeof value !== 'string' || !ID.test(value)) throw new Error(`${label} is invalid`);
}

function integer(value, label, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer from ${minimum} to ${maximum}`);
  }
}

function finiteRate(value, label, minimum = 0, maximum = 1) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be from ${minimum} to ${maximum}`);
  }
}

function booleanOrNull(value, label) {
  if (value !== null && typeof value !== 'boolean') throw new Error(`${label} must be boolean or null`);
}

function validateProtocol(value) {
  exactFields(value, PROTOCOL_FIELDS, 'protocol');
  if (value.schema !== SCHEMA || value.kind !== 'product_proof_protocol_v2') {
    throw new Error('protocol schema/kind is invalid');
  }
  id(value.protocol_id, 'protocol_id');
  if (!EVIDENCE_KINDS.includes(value.evidence_kind)) throw new Error('evidence_kind is invalid');
  if (typeof value.created_day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.created_day)) {
    throw new Error('created_day must be YYYY-MM-DD');
  }
  integer(value.participant_count, 'participant_count', 2, 10000);
  id(value.metric_set_id, 'metric_set_id');
  if (!Array.isArray(value.scenario_pairs) || value.scenario_pairs.length < 1 || value.scenario_pairs.length > 64) {
    throw new Error('scenario_pairs must contain 1-64 pairs');
  }
  const pairIds = new Set();
  const scenarioIds = new Set();
  value.scenario_pairs.forEach((pair, index) => {
    exactFields(pair, PAIR_FIELDS, `scenario_pairs[${index}]`);
    for (const field of PAIR_FIELDS) id(pair[field], `scenario_pairs[${index}].${field}`);
    if (pair.scenario_a === pair.scenario_b) throw new Error('scenario pair must contain distinct scenarios');
    if (pairIds.has(pair.pair_id)) throw new Error(`duplicate pair_id: ${pair.pair_id}`);
    if (scenarioIds.has(pair.scenario_a) || scenarioIds.has(pair.scenario_b)) {
      throw new Error('a scenario may appear in only one matched pair');
    }
    pairIds.add(pair.pair_id);
    scenarioIds.add(pair.scenario_a);
    scenarioIds.add(pair.scenario_b);
  });
  if (!Array.isArray(value.strata) || value.strata.length < 1 || value.strata.length > 64) {
    throw new Error('strata must contain 1-64 entries');
  }
  value.strata.forEach((stratum, index) => {
    exactFields(stratum, STRATUM_FIELDS, `strata[${index}]`);
    if (!RUNTIMES.includes(stratum.runtime_family)) throw new Error('runtime_family is invalid');
    if (!OS_FAMILIES.includes(stratum.os_family)) throw new Error('os_family is invalid');
    if (typeof stratum.model_id !== 'string' || !MODEL_ID.test(stratum.model_id)) throw new Error('model_id is invalid');
  });
  exactFields(value.gates, GATE_FIELDS, 'protocol.gates');
  finiteRate(value.gates.telemetry_join_min, 'telemetry_join_min');
  finiteRate(value.gates.accepted_completion_margin, 'accepted_completion_margin', -1, 1);
  finiteRate(value.gates.recovery_gain_min, 'recovery_gain_min');
  finiteRate(value.gates.intervention_reduction_min, 'intervention_reduction_min');
  finiteRate(value.gates.time_overhead_max, 'time_overhead_max');
  finiteRate(value.gates.verification_accuracy_min, 'verification_accuracy_min');
  integer(value.gates.false_pass_max, 'false_pass_max', 0, 10000);
  finiteRate(value.gates.d7_retention_min, 'd7_retention_min');
  integer(value.gates.minimum_public_cell, 'minimum_public_cell', 5, 10000);
  for (const field of ['randomization_digest', 'assignment_commitment']) {
    if (typeof value[field] !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(value[field])) {
      throw new Error(`${field} must be a sha256 identity`);
    }
  }
  if (value.signing_public_key !== null) {
    if (typeof value.signing_public_key !== 'string'
      || !/^-----BEGIN PUBLIC KEY-----[\s\S]+-----END PUBLIC KEY-----\n?$/.test(value.signing_public_key)) {
      throw new Error('signing_public_key must be a PEM public key or null');
    }
    try {
      if (crypto.createPublicKey(value.signing_public_key).asymmetricKeyType !== 'ed25519') {
        throw new Error('wrong key type');
      }
    } catch {
      throw new Error('signing_public_key must be Ed25519');
    }
  }
  return value;
}

function validateAssignment(value, protocol = null) {
  exactFields(value, ASSIGNMENT_FIELDS, 'assignment');
  if (value.schema !== SCHEMA || value.kind !== 'trial_assignment_v2') throw new Error('assignment schema/kind is invalid');
  for (const field of ['protocol_id', 'assignment_id', 'participant_id', 'pair_id', 'scenario_id']) id(value[field], field);
  if (!MODES.includes(value.mode)) throw new Error('assignment mode is invalid');
  integer(value.order, 'assignment.order', 1, 2);
  if (!RUNTIMES.includes(value.runtime_family)) throw new Error('assignment runtime_family is invalid');
  if (!OS_FAMILIES.includes(value.os_family)) throw new Error('assignment os_family is invalid');
  if (typeof value.model_id !== 'string' || !MODEL_ID.test(value.model_id)) throw new Error('assignment model_id is invalid');
  if (protocol) {
    validateProtocol(protocol);
    if (value.protocol_id !== protocol.protocol_id) throw new Error('assignment protocol_id mismatch');
    const pair = protocol.scenario_pairs.find((item) => item.pair_id === value.pair_id);
    if (!pair || ![pair.scenario_a, pair.scenario_b].includes(value.scenario_id)) {
      throw new Error('assignment scenario does not belong to its pair');
    }
    if (!protocol.strata.some((item) => canonical(item) === canonical({
      runtime_family: value.runtime_family,
      model_id: value.model_id,
      os_family: value.os_family,
    }))) throw new Error('assignment stratum is not frozen in the protocol');
  }
  return value;
}

function baseRecord(value, fields, kind, label) {
  exactFields(value, fields, label);
  if (value.schema !== SCHEMA || value.kind !== kind) throw new Error(`${label} schema/kind is invalid`);
  id(value.protocol_id, `${label}.protocol_id`);
  return value;
}

function validateStage(value) {
  baseRecord(value, STAGE_FIELDS, 'trial_stage_v2', 'stage');
  id(value.assignment_id, 'stage.assignment_id');
  if (!STAGES.includes(value.stage)) throw new Error('stage is invalid');
  if (!STATUSES.includes(value.status)) throw new Error('stage status is invalid');
  if (value.duration_ms !== null) integer(value.duration_ms, 'stage.duration_ms', 0, 604800000);
  integer(value.day_since_install, 'stage.day_since_install', 0, 3650);
  if (value.status === 'failed' && !FAILURE_CODES.includes(value.failure_code)) {
    throw new Error('failed stage requires a closed failure_code');
  }
  if (value.status !== 'failed' && value.failure_code !== null) {
    throw new Error('failure_code must be null unless stage failed');
  }
  return value;
}

function validateScore(value) {
  baseRecord(value, SCORE_FIELDS, 'trial_score_v2', 'score');
  id(value.assignment_id, 'score.assignment_id');
  if (typeof value.completed !== 'boolean') throw new Error('score.completed must be boolean');
  if (!VERDICTS.includes(value.claimed_verdict) || !VERDICTS.includes(value.oracle_verdict)) {
    throw new Error('score verdict is invalid');
  }
  if (typeof value.owner_accepted !== 'boolean') throw new Error('score.owner_accepted must be boolean');
  booleanOrNull(value.resume_correct, 'score.resume_correct');
  for (const field of [
    'corrective_interventions', 'required_approvals', 'clarifications',
    'rework_cycles', 'regressions',
  ]) integer(value[field], `score.${field}`, 0, 10000);
  return value;
}

function validateArtifacts(value) {
  baseRecord(value, ARTIFACT_FIELDS, 'trial_artifacts_v2', 'artifacts');
  id(value.assignment_id, 'artifacts.assignment_id');
  for (const field of [
    'expected_task_artifacts', 'receipt_owned_artifacts', 'receipt_owned_bytes',
    'unexpected_tracked', 'unexpected_untracked', 'unexpected_untracked_bytes',
  ]) integer(value[field], `artifacts.${field}`, 0, Number.MAX_SAFE_INTEGER);
  if (!OUTCOME_VERDICTS.includes(value.cleanup_verdict)) throw new Error('cleanup_verdict is invalid');
  return value;
}

function validateExit(value) {
  baseRecord(value, EXIT_FIELDS, 'trial_exit_v2', 'exit');
  id(value.assignment_id, 'exit.assignment_id');
  if (typeof value.plan_reviewed !== 'boolean') throw new Error('exit.plan_reviewed must be boolean');
  for (const field of [
    'archive_verdict', 'user_state_verdict', 'hooks_removed_verdict',
    'footprint_verdict', 'restore_verdict',
  ]) {
    if (!OUTCOME_VERDICTS.includes(value[field])) throw new Error(`exit.${field} is invalid`);
  }
  return value;
}

function validateRetention(value) {
  baseRecord(value, RETENTION_FIELDS, 'retention_observation_v2', 'retention');
  id(value.participant_id, 'retention.participant_id');
  for (const field of ['install_succeeded', 'meaningful_task_completed', 'canonical_verification_passed']) {
    if (typeof value[field] !== 'boolean') throw new Error(`retention.${field} must be boolean`);
  }
  integer(value.observation_day, 'retention.observation_day', 0, 3650);
  if (value.canonical_verification_passed && !value.meaningful_task_completed) {
    throw new Error('canonical retention verification requires meaningful task completion');
  }
  return value;
}

function validateRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('record must be an object');
  if (!RECORD_KINDS.includes(value.kind)) throw new Error(`unsupported trial record kind: ${value.kind}`);
  if (value.kind === 'trial_stage_v2') return validateStage(value);
  if (value.kind === 'trial_score_v2') return validateScore(value);
  if (value.kind === 'trial_artifacts_v2') return validateArtifacts(value);
  if (value.kind === 'trial_exit_v2') return validateExit(value);
  return validateRetention(value);
}

function unsignedReceipt(receipt) {
  return { ...receipt, signature: null };
}

function validateReceipt(value, options = {}) {
  exactFields(value, RECEIPT_FIELDS, 'receipt');
  if (value.schema !== SCHEMA || value.kind !== 'product_proof_receipt_v2') throw new Error('receipt schema/kind is invalid');
  id(value.protocol_id, 'receipt.protocol_id');
  id(value.assignment_id, 'receipt.assignment_id');
  id(value.signer, 'receipt.signer');
  if (typeof value.issued_at !== 'string' || new Date(value.issued_at).toISOString() !== value.issued_at) {
    throw new Error('receipt.issued_at must be ISO 8601');
  }
  if (!Array.isArray(value.records) || value.records.length < 1) throw new Error('receipt.records must be non-empty');
  value.records.forEach((record) => {
    validateRecord(record);
    if (record.protocol_id !== value.protocol_id) throw new Error('receipt record protocol mismatch');
    if ('assignment_id' in record && record.assignment_id !== value.assignment_id) {
      throw new Error('receipt record assignment mismatch');
    }
  });
  if (!value.signature || typeof value.signature !== 'object') throw new Error('receipt.signature is required');
  exactFields(value.signature, SIGNATURE_FIELDS, 'receipt.signature');
  if (value.signature.algorithm !== 'ed25519'
    || typeof value.signature.value_base64 !== 'string'
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.signature.value_base64)) {
    throw new Error('receipt signature is invalid');
  }
  if (options.protocol && value.protocol_id !== validateProtocol(options.protocol).protocol_id) {
    throw new Error('receipt protocol mismatch');
  }
  return value;
}

module.exports = Object.freeze({
  ARTIFACT_FIELDS,
  ASSIGNMENT_FIELDS,
  EVIDENCE_KINDS,
  EXIT_FIELDS,
  GATE_FIELDS,
  MODES,
  OS_FAMILIES,
  PAIR_FIELDS,
  PROHIBITED_KEY,
  PROTOCOL_FIELDS,
  RECEIPT_FIELDS,
  RECORD_KINDS,
  RETENTION_FIELDS,
  RUNTIMES,
  SCHEMA,
  SCORE_FIELDS,
  STAGE_FIELDS,
  STRATUM_FIELDS,
  VERDICTS,
  assertNoProhibitedFields,
  canonical,
  digest,
  exactFields,
  unsignedReceipt,
  validateArtifacts,
  validateAssignment,
  validateExit,
  validateProtocol,
  validateReceipt,
  validateRecord,
  validateRetention,
  validateScore,
  validateStage,
});

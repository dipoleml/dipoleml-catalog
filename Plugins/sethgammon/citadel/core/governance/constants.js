'use strict';

const CONTRACT_VERSION = 1;
const JOURNAL_VERSION = 1;

const TRUTH_STATUSES = Object.freeze(['passed', 'failed', 'blocked', 'unknown']);
const DISPOSITIONS = Object.freeze([
  'continue-independent',
  'retry',
  'hold',
  'escalate',
  'advance',
  'merge',
  'terminate',
]);
const SUBJECT_KINDS = Object.freeze([
  'operation',
  'campaign',
  'campaign-phase',
  'fleet-task',
  'merge-candidate',
  'checkpoint',
  'human-gate',
  'package',
  'other',
]);
const PRODUCER_KINDS = Object.freeze([
  'deterministic',
  'mechanical-validator',
  'holistic-arbiter',
  'human',
  'adapter',
]);
const CHECKPOINT_REQUIREMENTS = Object.freeze(['none', 'advisory', 'required']);
const RECORD_TYPES = Object.freeze(['observation', 'policy', 'decision']);
const RETRY_CLASSES = Object.freeze([
  'none',
  'transient',
  'repairable',
  'waitable',
  'human',
  'unsafe',
  'permanent',
]);

const CONTRACT_FIELDS = Object.freeze({
  observation: Object.freeze([
    'contract_version',
    'observation_id',
    'subject',
    'subject_digest',
    'subject_generation',
    'attempt_id',
    'producer',
    'producer_contract_digest',
    'truth_status',
    'coverage',
    'reason_code',
    'artifact_digests',
    'observed_at',
    'expires_at',
    'observation_digest',
  ]),
  policy: Object.freeze([
    'contract_version',
    'policy_id',
    'subject_kind',
    'required_observations',
    'retry_policy',
    'deadline_policy',
    'checkpoint_requirement',
    'human_gate',
    'allowed_dispositions',
    'policy_digest',
  ]),
  decision: Object.freeze([
    'contract_version',
    'decision_id',
    'subject',
    'subject_digest',
    'subject_generation',
    'policy_digest',
    'observation_digests',
    'truth_status',
    'coverage',
    'disposition',
    'reason_code',
    'current',
    'decided_at',
    'decision_digest',
  ]),
});

module.exports = Object.freeze({
  CHECKPOINT_REQUIREMENTS,
  CONTRACT_FIELDS,
  CONTRACT_VERSION,
  DISPOSITIONS,
  JOURNAL_VERSION,
  PRODUCER_KINDS,
  RECORD_TYPES,
  RETRY_CLASSES,
  SUBJECT_KINDS,
  TRUTH_STATUSES,
});

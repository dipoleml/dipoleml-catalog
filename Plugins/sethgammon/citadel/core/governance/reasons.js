'use strict';

const { RETRY_CLASSES, TRUTH_STATUSES } = require('./constants');

const DEFINITIONS = Object.freeze({
  VERIFIED: Object.freeze({
    truth: Object.freeze(['passed']),
    retry_class: 'none',
    active_disposition: null,
    exhausted_disposition: null,
  }),
  TEST_FAILED: Object.freeze({
    truth: Object.freeze(['failed']),
    retry_class: 'repairable',
    active_disposition: 'retry',
    exhausted_disposition: 'escalate',
  }),
  VERIFICATION_FAILED: Object.freeze({
    truth: Object.freeze(['failed']),
    retry_class: 'repairable',
    active_disposition: 'retry',
    exhausted_disposition: 'escalate',
  }),
  VALIDATOR_TIMEOUT: Object.freeze({
    truth: Object.freeze(['unknown']),
    retry_class: 'transient',
    active_disposition: 'retry',
    exhausted_disposition: 'escalate',
  }),
  OUTPUT_UNPARSEABLE: Object.freeze({
    truth: Object.freeze(['unknown']),
    retry_class: 'transient',
    active_disposition: 'retry',
    exhausted_disposition: 'escalate',
  }),
  MISSING_EVIDENCE: Object.freeze({
    truth: Object.freeze(['unknown']),
    retry_class: 'repairable',
    active_disposition: 'retry',
    exhausted_disposition: 'escalate',
  }),
  STALE_EVIDENCE: Object.freeze({
    truth: Object.freeze(['unknown']),
    retry_class: 'transient',
    active_disposition: 'retry',
    exhausted_disposition: 'escalate',
  }),
  PROVIDER_UNAVAILABLE: Object.freeze({
    truth: Object.freeze(['unknown']),
    retry_class: 'transient',
    active_disposition: 'retry',
    exhausted_disposition: 'escalate',
  }),
  PRODUCER_MISMATCH: Object.freeze({
    truth: Object.freeze(['unknown']),
    retry_class: 'unsafe',
    active_disposition: 'escalate',
    exhausted_disposition: 'escalate',
  }),
  NONREPEATABLE_EFFECT_AMBIGUOUS: Object.freeze({
    truth: Object.freeze(['unknown']),
    retry_class: 'unsafe',
    active_disposition: 'escalate',
    exhausted_disposition: 'escalate',
  }),
  HUMAN_INPUT_REQUIRED: Object.freeze({
    truth: Object.freeze(['blocked']),
    retry_class: 'human',
    active_disposition: 'escalate',
    exhausted_disposition: 'escalate',
  }),
  CHECKPOINT_REQUIRED: Object.freeze({
    truth: Object.freeze(['blocked']),
    retry_class: 'waitable',
    active_disposition: 'hold',
    exhausted_disposition: 'escalate',
  }),
  DEPENDENCY_BLOCKED: Object.freeze({
    truth: Object.freeze(['blocked']),
    retry_class: 'waitable',
    active_disposition: 'hold',
    exhausted_disposition: 'escalate',
  }),
  POLICY_DENIED: Object.freeze({
    truth: Object.freeze(['blocked']),
    retry_class: 'permanent',
    active_disposition: 'terminate',
    exhausted_disposition: 'terminate',
  }),
});

function reasonDefinition(reasonCode) {
  return DEFINITIONS[reasonCode] || null;
}

function validateReason(reasonCode, truthStatus) {
  const definition = reasonDefinition(reasonCode);
  if (!definition) return [`unknown reason_code: ${reasonCode || '(missing)'}`];
  if (!TRUTH_STATUSES.includes(truthStatus)) return [`unknown truth_status: ${truthStatus || '(missing)'}`];
  if (!definition.truth.includes(truthStatus)) {
    return [`reason_code ${reasonCode} is not valid for truth_status ${truthStatus}`];
  }
  if (!RETRY_CLASSES.includes(definition.retry_class)) {
    return [`reason_code ${reasonCode} has invalid retry_class`];
  }
  return [];
}

module.exports = Object.freeze({
  REASON_CODES: Object.freeze(Object.keys(DEFINITIONS)),
  REASON_DEFINITIONS: DEFINITIONS,
  reasonDefinition,
  validateReason,
});

'use strict';

const {
  canonical,
  digest,
  exactFields,
} = require('./contracts');

const PLAN_FIELDS = Object.freeze([
  'schema',
  'kind',
  'scenario_set_id',
  'executor_set_id',
  'metric_set_id',
  'policies',
  'repetitions',
  'total_runs',
  'access_basis',
  'quota_budget',
  'approval_status',
  'quota_acknowledged',
  'approved_by',
  'approved_at',
]);
const QUOTA_FIELDS = Object.freeze([
  'max_cli_runs',
  'max_model_calls',
  'max_model_runtime_minutes',
]);

function expectedQuota(freeze, scenarios) {
  let maxModelCalls = 0;
  let maxModelRuntimeMinutes = 0;
  for (const scenario of scenarios) {
    for (const policy of freeze.policies) {
      const calls = policy === 'adaptive' ? scenario.max_attempts : 1;
      maxModelCalls += calls * freeze.repetitions;
      maxModelRuntimeMinutes += calls * scenario.timeout_minutes * freeze.repetitions;
    }
  }
  return Object.freeze({
    max_cli_runs: scenarios.length * freeze.policies.length * freeze.repetitions,
    max_model_calls: maxModelCalls,
    max_model_runtime_minutes: maxModelRuntimeMinutes,
  });
}

function validateMatrixAuthorization(value, freeze, scenarios, source = 'matrix authorization') {
  if (!exactFields(value, PLAN_FIELDS)
    || value.schema !== 1
    || value.kind !== 'citadel_optimizer_matrix_authorization') {
    throw new Error(`${source} identity or fields are invalid`);
  }
  if (value.scenario_set_id !== freeze.scenario_set_id
    || value.executor_set_id !== freeze.executor_set_id
    || value.metric_set_id !== freeze.metric_set_id
    || canonical(value.policies) !== canonical(freeze.policies)
    || value.repetitions !== freeze.repetitions) {
    throw new Error(`${source} does not bind the frozen matrix`);
  }
  const quota = expectedQuota(freeze, scenarios);
  if (value.total_runs !== quota.max_cli_runs
    || value.access_basis !== 'subscription'
    || !exactFields(value.quota_budget, QUOTA_FIELDS)
    || canonical(value.quota_budget) !== canonical(quota)) {
    throw new Error(`${source} quota must match the frozen run, call, and runtime limits`);
  }
  if (!['pending', 'approved'].includes(value.approval_status)) {
    throw new Error(`${source}.approval_status is invalid`);
  }
  if (value.approval_status === 'pending') {
    if (value.quota_acknowledged !== false
      || value.approved_by !== null
      || value.approved_at !== null) {
      throw new Error(`${source} pending approval cannot carry approval`);
    }
  } else if (value.quota_acknowledged !== true
    || typeof value.approved_by !== 'string'
    || !value.approved_by.trim()
    || typeof value.approved_at !== 'string'
    || !Number.isFinite(Date.parse(value.approved_at))) {
    throw new Error(`${source} requires explicit subscription quota acknowledgement and approver`);
  }
  return value;
}

function matrixAuthorizationDigest(value, freeze, scenarios) {
  return digest(validateMatrixAuthorization(value, freeze, scenarios));
}

function assertMatrixAuthorized(value, freeze, scenarios) {
  const authorization = validateMatrixAuthorization(value, freeze, scenarios);
  if (authorization.approval_status !== 'approved'
    || authorization.quota_acknowledged !== true) {
    throw new Error('Optimizer matrix requires explicitly approved subscription quota');
  }
  return authorization;
}

function matrixAuthorizationCoversRuns(value, freeze, scenarios, runs) {
  let authorization;
  try {
    authorization = assertMatrixAuthorized(value, freeze, scenarios);
  } catch {
    return false;
  }
  const approvedAt = Date.parse(authorization.approved_at);
  return runs.length <= authorization.quota_budget.max_cli_runs
    && runs.every((run) => Date.parse(run.started_at) >= approvedAt)
    && runs.reduce((total, run) => total + run.attempts, 0)
      <= authorization.quota_budget.max_model_calls
    && runs.reduce((total, run) => {
      const scenario = scenarios.find((item) => item.id === run.scenario_id);
      return total + (run.attempts * scenario.timeout_minutes);
    }, 0) <= authorization.quota_budget.max_model_runtime_minutes;
}

module.exports = Object.freeze({
  PLAN_FIELDS,
  QUOTA_FIELDS,
  assertMatrixAuthorized,
  expectedQuota,
  matrixAuthorizationCoversRuns,
  matrixAuthorizationDigest,
  validateMatrixAuthorization,
});

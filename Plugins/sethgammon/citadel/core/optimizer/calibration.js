'use strict';

const {
  canonical,
  digest,
  exactFields,
  executorSetIdentity,
  scenarioSetIdentity,
  validateCost,
} = require('./contracts');

const PLAN_FIELDS = Object.freeze([
  'schema',
  'kind',
  'scenario_ids',
  'profile_ids',
  'runs_per_pair',
  'total_runs',
  'no_holdouts',
  'access_basis',
  'quota_budget',
  'approval_status',
  'quota_acknowledged',
  'approved_by',
  'approved_at',
  'record_digest',
]);
const QUOTA_BUDGET_FIELDS = Object.freeze([
  'max_cli_runs',
  'max_model_runtime_minutes',
]);
const RECORD_FIELDS = Object.freeze([
  'schema',
  'kind',
  'authorization_digest',
  'scenario_set_id',
  'executor_set_id',
  'access_basis',
  'quota_budget',
  'started_at',
  'completed_at',
  'status',
  'planned_run_count',
  'completed_run_count',
  'stop_reason',
  'runs',
]);
const RECORD_RUN_FIELDS = Object.freeze([
  'scenario_id',
  'profile_id',
  'selected_profile_id',
  'observed_profile_id',
  'requested_model',
  'observed_model',
  'model_proof_status',
  'receipt_status',
  'cost',
  'task_outcome',
  'task_verified',
  'duration_ms',
  'failure_code',
  'evidence_status',
]);

function validateCalibrationPlan(value, scenarios, executors, source = 'calibration plan') {
  if (!exactFields(value, PLAN_FIELDS)
    || value.schema !== 1
    || value.kind !== 'citadel_optimizer_calibration_plan') {
    throw new Error(`${source} identity or fields are invalid`);
  }
  if (!Array.isArray(value.scenario_ids)
    || value.scenario_ids.length < 1
    || new Set(value.scenario_ids).size !== value.scenario_ids.length) {
    throw new Error(`${source}.scenario_ids is invalid`);
  }
  const scenarioMap = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  if (value.scenario_ids.some((id) => !scenarioMap.has(id))) throw new Error(`${source} references an unknown scenario`);
  if (value.no_holdouts !== true
    || value.scenario_ids.some((id) => scenarioMap.get(id).holdout)) {
    throw new Error(`${source} may not use holdouts`);
  }
  const expectedProfiles = executors.map((executor) => executor.profile_id).sort();
  if (!Array.isArray(value.profile_ids)
    || canonical([...value.profile_ids].sort()) !== canonical(expectedProfiles)) {
    throw new Error(`${source}.profile_ids must include every frozen executor`);
  }
  if (!Number.isInteger(value.runs_per_pair) || value.runs_per_pair !== 1) {
    throw new Error(`${source}.runs_per_pair must be 1`);
  }
  if (value.total_runs !== value.scenario_ids.length * value.profile_ids.length) {
    throw new Error(`${source}.total_runs mismatch`);
  }
  if (value.access_basis !== 'subscription') {
    throw new Error(`${source}.access_basis must be subscription`);
  }
  const maxModelRuntimeMinutes = value.scenario_ids.reduce(
    (total, id) => total + scenarioMap.get(id).timeout_minutes,
    0,
  ) * value.profile_ids.length * value.runs_per_pair;
  if (!exactFields(value.quota_budget, QUOTA_BUDGET_FIELDS)
    || value.quota_budget.max_cli_runs !== value.total_runs
    || value.quota_budget.max_model_runtime_minutes !== maxModelRuntimeMinutes) {
    throw new Error(`${source}.quota_budget must match the frozen run and runtime limits`);
  }
  if (!['pending', 'approved', 'completed'].includes(value.approval_status)) {
    throw new Error(`${source}.approval_status is invalid`);
  }
  if (value.approval_status === 'pending') {
    if (value.quota_acknowledged !== false
      || value.approved_by !== null
      || value.approved_at !== null
      || value.record_digest !== null) {
      throw new Error(`${source} pending approval cannot carry approval or evidence`);
    }
  } else {
    if (value.quota_acknowledged !== true
      || typeof value.approved_by !== 'string' || !value.approved_by.trim()
      || typeof value.approved_at !== 'string' || !Number.isFinite(Date.parse(value.approved_at))) {
      throw new Error(`${source} approved calibration requires subscription quota acknowledgement and approver`);
    }
    if (value.approval_status === 'approved' && value.record_digest !== null) {
      throw new Error(`${source} approved calibration cannot claim a completed record`);
    }
    if (value.approval_status === 'completed'
      && (typeof value.record_digest !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(value.record_digest))) {
      throw new Error(`${source} completed calibration requires a record digest`);
    }
  }
  return value;
}

function calibrationAuthorizationDigest(plan) {
  return digest({
    ...plan,
    approval_status: 'approved',
    record_digest: null,
  });
}

function calibrationCases(plan, scenarios, executors) {
  const scenarioMap = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  const executorMap = new Map(executors.map((executor) => [executor.profile_id, executor]));
  return plan.scenario_ids.flatMap((scenarioId) => (
    plan.profile_ids.map((profileId) => ({
      scenario: scenarioMap.get(scenarioId),
      profile: executorMap.get(profileId),
    }))
  ));
}

function calibrationObservation(run, expectedProfile) {
  const evidencePassed = run.selected_profile_id === expectedProfile.profile_id
    && run.observed_profile_id === expectedProfile.profile_id
    && run.requested_model === expectedProfile.model
    && run.observed_model === expectedProfile.model
    && run.model_proof_status === 'passed'
    && run.receipt_status === 'verified'
    && run.cost.status === 'known';
  return {
    scenario_id: run.scenario_id,
    profile_id: expectedProfile.profile_id,
    selected_profile_id: run.selected_profile_id,
    observed_profile_id: run.observed_profile_id,
    requested_model: run.requested_model,
    observed_model: run.observed_model,
    model_proof_status: run.model_proof_status,
    receipt_status: run.receipt_status,
    cost: run.cost,
    task_outcome: run.outcome,
    task_verified: run.verified,
    duration_ms: run.duration_ms,
    failure_code: run.failure_code,
    evidence_status: evidencePassed ? 'passed' : 'failed',
  };
}

function validateCalibrationRecord(value, plan, scenarios, executors, source = 'calibration record') {
  validateCalibrationPlan(plan, scenarios, executors, 'calibration plan');
  if (!['approved', 'completed'].includes(plan.approval_status)
    || plan.quota_acknowledged !== true) {
    throw new Error(`${source} requires an approved subscription quota`);
  }
  if (!exactFields(value, RECORD_FIELDS)
    || value.schema !== 1
    || value.kind !== 'citadel_optimizer_calibration_record') {
    throw new Error(`${source} identity or fields are invalid`);
  }
  if (value.authorization_digest !== calibrationAuthorizationDigest(plan)
    || value.scenario_set_id !== scenarioSetIdentity(scenarios)
    || value.executor_set_id !== executorSetIdentity(executors)
    || value.access_basis !== plan.access_basis
    || canonical(value.quota_budget) !== canonical(plan.quota_budget)) {
    throw new Error(`${source} does not bind the frozen authorization`);
  }
  if (typeof value.started_at !== 'string' || !Number.isFinite(Date.parse(value.started_at))) {
    throw new Error(`${source}.started_at is invalid`);
  }
  if (!['running', 'passed', 'failed'].includes(value.status)) {
    throw new Error(`${source}.status is invalid`);
  }
  if (value.status === 'running') {
    if (value.completed_at !== null || value.stop_reason !== null) {
      throw new Error(`${source} running state cannot claim completion`);
    }
  } else if (typeof value.completed_at !== 'string' || !Number.isFinite(Date.parse(value.completed_at))) {
    throw new Error(`${source}.completed_at is invalid`);
  }
  if (value.status === 'passed' && value.stop_reason !== null) {
    throw new Error(`${source} passed state cannot carry a stop reason`);
  }
  if (value.status === 'failed'
    && (typeof value.stop_reason !== 'string' || !/^[A-Z][A-Z0-9_]{0,63}$/.test(value.stop_reason))) {
    throw new Error(`${source} failed state requires a stop reason`);
  }
  if (value.planned_run_count !== plan.total_runs
    || !Number.isInteger(value.completed_run_count)
    || value.completed_run_count < 0
    || value.completed_run_count > plan.quota_budget.max_cli_runs
    || !Array.isArray(value.runs)
    || value.runs.length !== value.completed_run_count) {
    throw new Error(`${source} run counts are invalid`);
  }
  const cases = calibrationCases(plan, scenarios, executors);
  value.runs.forEach((run, index) => {
    const expected = cases[index];
    if (!exactFields(run, RECORD_RUN_FIELDS)
      || run.scenario_id !== expected.scenario.id
      || run.profile_id !== expected.profile.profile_id
      || run.selected_profile_id !== expected.profile.profile_id
      || run.observed_profile_id !== expected.profile.profile_id
      || run.requested_model !== expected.profile.model
      || (run.observed_model !== null && (typeof run.observed_model !== 'string' || !run.observed_model))
      || !['passed', 'failed', 'unknown'].includes(run.model_proof_status)
      || !['verified', 'failed', 'unknown'].includes(run.receipt_status)
      || !['passed', 'failed', 'unknown'].includes(run.task_outcome)
      || typeof run.task_verified !== 'boolean'
      || !Number.isInteger(run.duration_ms)
      || run.duration_ms < 0
      || (run.failure_code !== null
        && (typeof run.failure_code !== 'string' || !/^[A-Z][A-Z0-9_]{0,63}$/.test(run.failure_code)))) {
      throw new Error(`${source}.runs[${index}] is invalid`);
    }
    validateCost(run.cost, `${source}.runs[${index}].cost`);
    const evidencePassed = run.selected_profile_id === expected.profile.profile_id
      && run.observed_profile_id === expected.profile.profile_id
      && run.observed_model === expected.profile.model
      && run.model_proof_status === 'passed'
      && run.receipt_status === 'verified'
      && run.cost.status === 'known';
    if (run.evidence_status !== (evidencePassed ? 'passed' : 'failed')) {
      throw new Error(`${source}.runs[${index}].evidence_status is invalid`);
    }
  });
  if (value.status === 'passed'
    && (value.completed_run_count !== plan.total_runs
      || value.runs.some((run) => run.evidence_status !== 'passed'))) {
    throw new Error(`${source} passed state requires every frozen calibration case`);
  }
  if (value.status === 'failed'
    && (!value.runs.length || value.runs[value.runs.length - 1].evidence_status !== 'failed')) {
    throw new Error(`${source} failed state requires a failed terminal observation`);
  }
  return value;
}

module.exports = Object.freeze({
  PLAN_FIELDS,
  QUOTA_BUDGET_FIELDS,
  RECORD_FIELDS,
  RECORD_RUN_FIELDS,
  calibrationAuthorizationDigest,
  calibrationCases,
  calibrationObservation,
  validateCalibrationPlan,
  validateCalibrationRecord,
});

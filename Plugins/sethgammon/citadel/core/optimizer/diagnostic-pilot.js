'use strict';

const {
  canonical,
  digest,
  exactFields,
  executorSetIdentity,
  scenarioSetIdentity,
  validateCost,
  validateVerificationReceipt,
} = require('./contracts');

const PLAN_FIELDS = Object.freeze([
  'schema',
  'kind',
  'purpose',
  'scenario_set_id',
  'scenario_id',
  'profile_ids',
  'policy_id',
  'total_runs',
  'access_basis',
  'quota_budget',
  'approval_status',
  'quota_acknowledged',
  'approved_by',
  'approved_at',
  'record_digest',
]);
const QUOTA_FIELDS = Object.freeze([
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
const RUN_FIELDS = Object.freeze([
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
  'attempts',
  'duration_ms',
  'failure_code',
  'evidence_status',
  'verification_receipts',
]);
const PURPOSE = 'verification_path_diagnostic_not_performance_evidence';

function validateDiagnosticPilotPlan(value, scenarios, executors, source = 'diagnostic pilot plan') {
  if (!exactFields(value, PLAN_FIELDS)
    || value.schema !== 1
    || value.kind !== 'citadel_optimizer_diagnostic_pilot_plan'
    || value.purpose !== PURPOSE) {
    throw new Error(`${source} identity or fields are invalid`);
  }
  if (value.scenario_set_id !== scenarioSetIdentity(scenarios)) {
    throw new Error(`${source}.scenario_set_id is invalid`);
  }
  const scenario = scenarios.find((item) => item.id === value.scenario_id);
  if (!scenario || scenario.holdout) throw new Error(`${source} requires a frozen non-holdout scenario`);
  const expectedProfiles = executors
    .filter((profile) => profile.tier === 'frontier')
    .map((profile) => profile.profile_id)
    .sort();
  if (!Array.isArray(value.profile_ids)
    || canonical([...value.profile_ids].sort()) !== canonical(expectedProfiles)
    || new Set(value.profile_ids.map((id) => (
      executors.find((profile) => profile.profile_id === id)?.runtime
    ))).size !== expectedProfiles.length) {
    throw new Error(`${source}.profile_ids must contain one frontier profile per runtime`);
  }
  if (value.policy_id !== 'prompt-only' || value.total_runs !== value.profile_ids.length) {
    throw new Error(`${source} run shape is invalid`);
  }
  if (value.access_basis !== 'subscription') {
    throw new Error(`${source}.access_basis must be subscription`);
  }
  if (!exactFields(value.quota_budget, QUOTA_FIELDS)
    || value.quota_budget.max_cli_runs !== value.total_runs
    || value.quota_budget.max_model_runtime_minutes !== scenario.timeout_minutes * value.total_runs) {
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
      || typeof value.approved_by !== 'string'
      || !value.approved_by.trim()
      || typeof value.approved_at !== 'string'
      || !Number.isFinite(Date.parse(value.approved_at))) {
      throw new Error(`${source} approved pilot requires subscription quota acknowledgement and approver`);
    }
    if (value.approval_status === 'approved' && value.record_digest !== null) {
      throw new Error(`${source} approved pilot cannot claim a completed record`);
    }
    if (value.approval_status === 'completed'
      && (typeof value.record_digest !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(value.record_digest))) {
      throw new Error(`${source} completed pilot requires a record digest`);
    }
  }
  return value;
}

function diagnosticPilotAuthorizationDigest(plan) {
  return digest({
    ...plan,
    approval_status: 'approved',
    record_digest: null,
  });
}

function diagnosticPilotCases(plan, scenarios, executors) {
  const scenario = scenarios.find((item) => item.id === plan.scenario_id);
  const profileMap = new Map(executors.map((profile) => [profile.profile_id, profile]));
  return plan.profile_ids.map((profileId) => ({
    scenario,
    profile: profileMap.get(profileId),
  }));
}

function diagnosticPilotObservation(run, expectedProfile) {
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
    attempts: run.attempts,
    duration_ms: run.duration_ms,
    failure_code: run.failure_code,
    evidence_status: evidencePassed ? 'passed' : 'failed',
    verification_receipts: run.verification_receipts,
  };
}

function validateDiagnosticPilotRecord(value, plan, scenarios, executors, source = 'diagnostic pilot record') {
  validateDiagnosticPilotPlan(plan, scenarios, executors);
  if (!['approved', 'completed'].includes(plan.approval_status) || !plan.quota_acknowledged) {
    throw new Error(`${source} requires an approved subscription quota`);
  }
  if (!exactFields(value, RECORD_FIELDS)
    || value.schema !== 1
    || value.kind !== 'citadel_optimizer_diagnostic_pilot_record') {
    throw new Error(`${source} identity or fields are invalid`);
  }
  if (value.authorization_digest !== diagnosticPilotAuthorizationDigest(plan)
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
    && !['PILOT_EVIDENCE_FAILED', 'NO_TASK_VERIFIER_PASS'].includes(value.stop_reason)) {
    throw new Error(`${source} failed state requires a recognized stop reason`);
  }
  if (value.planned_run_count !== plan.total_runs
    || !Number.isInteger(value.completed_run_count)
    || value.completed_run_count < 0
    || value.completed_run_count > plan.quota_budget.max_cli_runs
    || !Array.isArray(value.runs)
    || value.runs.length !== value.completed_run_count) {
    throw new Error(`${source} run counts are invalid`);
  }
  if (value.status === 'running' && value.completed_run_count === value.planned_run_count) {
    throw new Error(`${source} complete run count cannot remain running`);
  }
  const cases = diagnosticPilotCases(plan, scenarios, executors);
  value.runs.forEach((run, index) => {
    const expected = cases[index];
    if (!exactFields(run, RUN_FIELDS)
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
      || !Number.isInteger(run.attempts)
      || run.attempts < 1
      || !Number.isInteger(run.duration_ms)
      || run.duration_ms < 0
      || (run.failure_code !== null
        && (typeof run.failure_code !== 'string' || !/^[A-Z][A-Z0-9_]{0,63}$/.test(run.failure_code)))
      || !Array.isArray(run.verification_receipts)
      || run.verification_receipts.length > run.attempts) {
      throw new Error(`${source}.runs[${index}] is invalid`);
    }
    validateCost(run.cost, `${source}.runs[${index}].cost`);
    run.verification_receipts.forEach((receipt, receiptIndex) => {
      validateVerificationReceipt(receipt, `${source}.runs[${index}].verification_receipts[${receiptIndex}]`);
      if (receipt.profile_id !== expected.profile.profile_id
        || receipt.attempt > run.attempts
        || (receiptIndex > 0
          && receipt.attempt <= run.verification_receipts[receiptIndex - 1].attempt)) {
        throw new Error(`${source}.runs[${index}].verification_receipts must bind the profile and follow attempt order`);
      }
    });
    if (['VERIFICATION_FAILED', 'EXPECTED_ARTIFACTS_NOT_CHANGED'].includes(run.failure_code)
      && run.verification_receipts.length === 0) {
      throw new Error(`${source}.runs[${index}] verification failure requires a receipt`);
    }
    if (run.task_verified
      && (run.task_outcome !== 'passed'
        || run.model_proof_status !== 'passed'
        || run.receipt_status !== 'verified'
        || run.verification_receipts.length === 0
        || run.verification_receipts.at(-1).status !== 'passed')) {
      throw new Error(`${source}.runs[${index}] verified task evidence is invalid`);
    }
    const evidencePassed = run.observed_model === expected.profile.model
      && run.model_proof_status === 'passed'
      && run.receipt_status === 'verified'
      && run.cost.status === 'known';
    if (run.evidence_status !== (evidencePassed ? 'passed' : 'failed')) {
      throw new Error(`${source}.runs[${index}].evidence_status is invalid`);
    }
  });
  if (value.status === 'passed'
    && (value.completed_run_count !== plan.total_runs
      || value.runs.some((run) => run.evidence_status !== 'passed')
      || !value.runs.some((run) => run.task_verified))) {
    throw new Error(`${source} passed state requires complete evidence and a task-verifier pass`);
  }
  if (value.status === 'failed' && value.stop_reason === 'PILOT_EVIDENCE_FAILED'
    && (!value.runs.length || value.runs[value.runs.length - 1].evidence_status !== 'failed')) {
    throw new Error(`${source} evidence failure requires a failed terminal observation`);
  }
  if (value.status === 'failed' && value.stop_reason === 'NO_TASK_VERIFIER_PASS'
    && (value.completed_run_count !== plan.total_runs
      || value.runs.some((run) => run.evidence_status !== 'passed' || run.task_verified))) {
    throw new Error(`${source} no-pass failure requires complete identity evidence and zero verifier passes`);
  }
  return value;
}

module.exports = Object.freeze({
  PURPOSE,
  diagnosticPilotAuthorizationDigest,
  diagnosticPilotCases,
  diagnosticPilotObservation,
  validateDiagnosticPilotPlan,
  validateDiagnosticPilotRecord,
});

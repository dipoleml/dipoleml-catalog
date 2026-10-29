'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SCHEMA_VERSION = 1;
const CATEGORIES = Object.freeze([
  'short_control',
  'long_task',
  'context_reset',
  'parallel_work',
  'safety_boundary',
  'cleanup',
]);
const POLICY_IDS = Object.freeze([
  'always-frontier',
  'always-cheap',
  'prompt-only',
  'adaptive',
]);
const TIERS = Object.freeze(['utility', 'workhorse', 'frontier']);
const RUNTIMES = Object.freeze(['claude', 'codex']);
const CAPABILITY_KEYS = Object.freeze([
  'code_edit',
  'repository_reasoning',
  'long_horizon',
  'recovery',
  'parallel_coordination',
  'safety_boundary',
]);
const COST_PROVENANCE = Object.freeze([
  'vendor_reported',
  'price_derived',
  'tool_reported',
  'unknown',
]);
const COST_COMPONENT_KINDS = Object.freeze([
  'model',
  'tool',
  'compute',
  'human',
]);
const METRIC_IDENTITIES = Object.freeze([
  'verified_completion_rate',
  'verified_completions',
  'total_cost_usd',
  'median_cost_usd',
  'effective_cost_per_verified_completion',
  'known_cost_rate',
  'duration_ms',
  'human_interventions',
  'attempts',
  'adversarial_false_passes',
]);
const SAFE_ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const SCENARIO_SET_ID = /^optimizer-scenarios-sha256:[0-9a-f]{64}$/;
const EXECUTOR_SET_ID = /^optimizer-executors-sha256:[0-9a-f]{64}$/;
const METRIC_SET_ID = /^optimizer-metrics-sha256:[0-9a-f]{64}$/;

const SCENARIO_FIELDS = Object.freeze([
  'schema',
  'id',
  'category',
  'repository',
  'pinned_ref',
  'task',
  'setup_command',
  'verification_command',
  'expected_artifacts',
  'allowed_tools',
  'timeout_minutes',
  'probe_budget',
  'max_attempts',
  'max_agents',
  'candidate_executors',
  'holdout',
  'adversarial_case',
]);
const PROBE_BUDGET_FIELDS = Object.freeze([
  'max_files',
  'max_bytes',
  'max_duration_ms',
]);
const EXECUTOR_FIELDS = Object.freeze([
  'schema',
  'profile_id',
  'runtime',
  'provider',
  'model',
  'tier',
  'executor_profile_digest',
  'adapter_digest',
  'capabilities',
  'priors',
]);
const PRIOR_FIELDS = Object.freeze([
  'verified_completion_probability',
  'median_cost_usd',
  'median_duration_ms',
  'human_intervention_rate',
  'sample_size',
  'known_cost_sample_size',
  'source',
]);
const COST_FIELDS = Object.freeze([
  'status',
  'amount_usd',
  'provenance',
  'source',
  'source_ref',
  'pricing_snapshot_digest',
  'components',
]);
const COST_COMPONENT_FIELDS = Object.freeze([
  'kind',
  'amount_usd',
  'source',
]);
const PROBE_FIELDS = Object.freeze([
  'schema',
  'scenario_id',
  'status',
  'observed_at',
  'budget_exhausted',
  'facts',
  'signals',
]);
const PROBE_FACT_FIELDS = Object.freeze([
  'file_count_scanned',
  'bytes_scanned',
  'languages',
  'package_manifests',
  'test_commands',
  'candidate_files',
  'has_ci',
  'has_tests',
]);
const PROBE_SIGNAL_FIELDS = Object.freeze([
  'scope',
  'complexity',
  'verification_strength',
  'recovery_required',
  'parallelizable',
  'safety_sensitive',
  'uncertainty',
]);
const DECISION_FIELDS = Object.freeze([
  'schema',
  'decision_id',
  'policy_id',
  'scenario_id',
  'selected_profile_id',
  'status',
  'probe_status',
  'required_capabilities',
  'predicted_completion_probability',
  'predicted_cost_usd',
  'prediction_source',
  'topology',
  'max_agents',
  'reason_codes',
  'escalation_plan',
]);
const ESCALATION_FIELDS = Object.freeze([
  'trigger',
  'action',
  'target_tier',
]);
const RUN_FIELDS = Object.freeze([
  'schema',
  'evidence_kind',
  'scenario_set_id',
  'metric_set_id',
  'scenario_id',
  'category',
  'holdout',
  'policy_id',
  'repetition',
  'decision_id',
  'selected_profile_id',
  'observed_profile_id',
  'requested_model',
  'observed_model',
  'model_proof_status',
  'started_at',
  'duration_ms',
  'outcome',
  'verified',
  'attempts',
  'human_interventions',
  'topology',
  'cost',
  'artifact_paths',
  'verification_receipts',
  'receipt_status',
  'adversarial_result',
  'failure_code',
  'attestation',
]);
const VERIFICATION_RECEIPT_FIELDS = Object.freeze([
  'attempt',
  'profile_id',
  'status',
  'exit_code',
  'timed_out',
  'output_digest',
  'output_excerpt',
  'output_truncated',
  'patch_exit_code',
  'patch_digest',
  'patch_excerpt',
  'patch_truncated',
  'changed_paths',
]);
const FREEZE_FIELDS = Object.freeze([
  'schema',
  'frozen_at',
  'scenario_count',
  'scenario_set_id',
  'executor_set_id',
  'metric_set_id',
  'policies',
  'repetitions',
  'holdout_scenario_ids',
  'selection_policy',
  'pricing_snapshot_digest',
  'calibration_plan_digest',
  'calibration_record_digest',
  'calibration_forensics_digest',
  'diagnostic_pilot_forensics_digest',
  'external_scenario',
  'external_reproduction_digest',
  'attestation_public_key',
]);
const EXTERNAL_SCENARIO_FIELDS = Object.freeze([
  'scenario_id',
  'selection_method',
  'selection_record_digest',
  'selected_at',
  'selection_source',
]);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(canonical(value)).digest('hex')}`;
}

function exactFields(value, fields) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && canonical(Object.keys(value).sort()) === canonical([...fields].sort());
}

function canonicalTime(value) {
  return typeof value === 'string'
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function nonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function nullableNonNegative(value) {
  return value === null || nonNegative(value);
}

function probability(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function safeRelative(value, label) {
  if (typeof value !== 'string' || !value || path.isAbsolute(value)) {
    throw new Error(`${label} must be a relative path`);
  }
  const normalized = path.normalize(value);
  if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
    throw new Error(`${label} escapes the workspace`);
  }
  return value;
}

function validateArgv(value, label) {
  if (!Array.isArray(value)
    || value.length === 0
    || value.some((part) => typeof part !== 'string' || !part || /[\r\n\0]/.test(part))) {
    throw new Error(`${label} must be a non-empty argv array`);
  }
  return value;
}

function validateProbeBudget(value, source) {
  if (!exactFields(value, PROBE_BUDGET_FIELDS)) throw new Error(`${source} fields are invalid`);
  if (!Number.isInteger(value.max_files) || value.max_files < 1 || value.max_files > 10000) {
    throw new Error(`${source}.max_files is invalid`);
  }
  if (!Number.isInteger(value.max_bytes) || value.max_bytes < 1024 || value.max_bytes > 100 * 1024 * 1024) {
    throw new Error(`${source}.max_bytes is invalid`);
  }
  if (!Number.isInteger(value.max_duration_ms) || value.max_duration_ms < 10 || value.max_duration_ms > 60000) {
    throw new Error(`${source}.max_duration_ms is invalid`);
  }
}

function validateScenario(value, source = 'scenario') {
  if (!exactFields(value, SCENARIO_FIELDS)) throw new Error(`${source} fields must exactly match schema 1`);
  if (value.schema !== SCHEMA_VERSION) throw new Error(`${source}.schema must be 1`);
  if (typeof value.id !== 'string' || !SAFE_ID.test(value.id)) throw new Error(`${source}.id is invalid`);
  if (!CATEGORIES.includes(value.category)) throw new Error(`${source}.category is invalid`);
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(value.repository)) {
    throw new Error(`${source}.repository must be an HTTPS GitHub repository`);
  }
  if (typeof value.pinned_ref !== 'string' || !/^[0-9a-f]{40}$/.test(value.pinned_ref)) {
    throw new Error(`${source}.pinned_ref must be a full commit SHA`);
  }
  if (typeof value.task !== 'string' || value.task.trim().length < 30) throw new Error(`${source}.task is too short`);
  validateArgv(value.setup_command, `${source}.setup_command`);
  validateArgv(value.verification_command, `${source}.verification_command`);
  if (!Array.isArray(value.expected_artifacts)) throw new Error(`${source}.expected_artifacts must be an array`);
  value.expected_artifacts.forEach((item, index) => safeRelative(item, `${source}.expected_artifacts[${index}]`));
  const allowedTools = ['read', 'search', 'edit', 'test', 'git'];
  if (!Array.isArray(value.allowed_tools)
    || value.allowed_tools.length === 0
    || new Set(value.allowed_tools).size !== value.allowed_tools.length
    || value.allowed_tools.some((item) => !allowedTools.includes(item))) {
    throw new Error(`${source}.allowed_tools is invalid`);
  }
  if (!Number.isInteger(value.timeout_minutes) || value.timeout_minutes < 1 || value.timeout_minutes > 180) {
    throw new Error(`${source}.timeout_minutes is invalid`);
  }
  validateProbeBudget(value.probe_budget, `${source}.probe_budget`);
  if (!Number.isInteger(value.max_attempts) || value.max_attempts < 1 || value.max_attempts > 5) {
    throw new Error(`${source}.max_attempts is invalid`);
  }
  if (!Number.isInteger(value.max_agents) || value.max_agents < 1 || value.max_agents > 8) {
    throw new Error(`${source}.max_agents is invalid`);
  }
  if (!Array.isArray(value.candidate_executors)
    || value.candidate_executors.length < 2
    || new Set(value.candidate_executors).size !== value.candidate_executors.length
    || value.candidate_executors.some((item) => typeof item !== 'string' || !SAFE_ID.test(item))) {
    throw new Error(`${source}.candidate_executors is invalid`);
  }
  if (typeof value.holdout !== 'boolean') throw new Error(`${source}.holdout is invalid`);
  if (value.adversarial_case !== null
    && !['tamper', 'incomplete', 'model_substitution', 'crash'].includes(value.adversarial_case)) {
    throw new Error(`${source}.adversarial_case is invalid`);
  }
  return value;
}

function validateCapabilities(value, source) {
  if (!exactFields(value, CAPABILITY_KEYS)) throw new Error(`${source} fields are invalid`);
  for (const key of CAPABILITY_KEYS) {
    if (!probability(value[key])) throw new Error(`${source}.${key} must be from 0 to 1`);
  }
  return value;
}

function validatePriors(value, source) {
  if (!exactFields(value, PRIOR_FIELDS)) throw new Error(`${source} fields are invalid`);
  if (!nullableNonNegative(value.verified_completion_probability)
    || (value.verified_completion_probability !== null && value.verified_completion_probability > 1)) {
    throw new Error(`${source}.verified_completion_probability is invalid`);
  }
  for (const field of ['median_cost_usd', 'median_duration_ms', 'human_intervention_rate']) {
    if (!nullableNonNegative(value[field])) throw new Error(`${source}.${field} is invalid`);
  }
  for (const field of ['sample_size', 'known_cost_sample_size']) {
    if (!Number.isInteger(value[field]) || value[field] < 0) throw new Error(`${source}.${field} is invalid`);
  }
  if (value.known_cost_sample_size > value.sample_size) throw new Error(`${source}.known_cost_sample_size exceeds sample_size`);
  if (!['seed', 'training_evidence'].includes(value.source)) throw new Error(`${source}.source is invalid`);
  if (value.source === 'seed') {
    if (value.sample_size !== 0
      || value.known_cost_sample_size !== 0
      || ['verified_completion_probability', 'median_cost_usd', 'median_duration_ms', 'human_intervention_rate']
        .some((field) => value[field] !== null)) {
      throw new Error(`${source} seed priors must be null and unobserved`);
    }
  } else if (value.sample_size === 0) {
    throw new Error(`${source} training priors require evidence`);
  }
  return value;
}

function validateExecutorProfile(value, source = 'executor') {
  if (!exactFields(value, EXECUTOR_FIELDS)) throw new Error(`${source} fields must exactly match schema 1`);
  if (value.schema !== SCHEMA_VERSION) throw new Error(`${source}.schema must be 1`);
  if (typeof value.profile_id !== 'string' || !SAFE_ID.test(value.profile_id)) throw new Error(`${source}.profile_id is invalid`);
  if (!RUNTIMES.includes(value.runtime)) throw new Error(`${source}.runtime is invalid`);
  if (typeof value.provider !== 'string' || !SAFE_ID.test(value.provider)) throw new Error(`${source}.provider is invalid`);
  if (typeof value.model !== 'string' || !value.model || value.model.length > 128 || /[\r\n\0]/.test(value.model)) {
    throw new Error(`${source}.model is invalid`);
  }
  if (!TIERS.includes(value.tier)) throw new Error(`${source}.tier is invalid`);
  if (value.executor_profile_digest !== null && !DIGEST.test(value.executor_profile_digest)) {
    throw new Error(`${source}.executor_profile_digest is invalid`);
  }
  if (value.adapter_digest !== null && !DIGEST.test(value.adapter_digest)) {
    throw new Error(`${source}.adapter_digest is invalid`);
  }
  validateCapabilities(value.capabilities, `${source}.capabilities`);
  validatePriors(value.priors, `${source}.priors`);
  return value;
}

function validateCostComponent(value, source) {
  if (!exactFields(value, COST_COMPONENT_FIELDS)) throw new Error(`${source} fields are invalid`);
  if (!COST_COMPONENT_KINDS.includes(value.kind)) throw new Error(`${source}.kind is invalid`);
  if (!nonNegative(value.amount_usd)) throw new Error(`${source}.amount_usd is invalid`);
  if (typeof value.source !== 'string' || !value.source || value.source.length > 128) {
    throw new Error(`${source}.source is invalid`);
  }
  return value;
}

function unknownCost(source = 'telemetry_unavailable', sourceRef = 'none') {
  return Object.freeze({
    status: 'unknown',
    amount_usd: null,
    provenance: 'unknown',
    source,
    source_ref: sourceRef,
    pricing_snapshot_digest: null,
    components: [],
  });
}

function validateCost(value, source = 'cost') {
  if (!exactFields(value, COST_FIELDS)) throw new Error(`${source} fields are invalid`);
  if (!['known', 'unknown'].includes(value.status)) throw new Error(`${source}.status is invalid`);
  if (!COST_PROVENANCE.includes(value.provenance)) throw new Error(`${source}.provenance is invalid`);
  if (typeof value.source !== 'string' || !value.source || value.source.length > 128) {
    throw new Error(`${source}.source is invalid`);
  }
  if (typeof value.source_ref !== 'string' || !value.source_ref || value.source_ref.length > 512) {
    throw new Error(`${source}.source_ref is invalid`);
  }
  if (!Array.isArray(value.components)) throw new Error(`${source}.components is invalid`);
  value.components.forEach((component, index) => validateCostComponent(component, `${source}.components[${index}]`));
  if (value.status === 'unknown') {
    if (value.amount_usd !== null
      || value.provenance !== 'unknown'
      || value.pricing_snapshot_digest !== null
      || value.components.length !== 0) {
      throw new Error(`${source} unknown cost cannot carry an amount or components`);
    }
    return value;
  }
  if (!nonNegative(value.amount_usd) || value.provenance === 'unknown') {
    throw new Error(`${source} known cost requires a non-negative amount and provenance`);
  }
  if (value.provenance === 'price_derived') {
    if (!DIGEST.test(value.pricing_snapshot_digest)) {
      throw new Error(`${source} price-derived cost requires a pricing snapshot digest`);
    }
  } else if (value.pricing_snapshot_digest !== null
    && (value.provenance !== 'tool_reported' || !DIGEST.test(value.pricing_snapshot_digest))) {
    throw new Error(`${source} pricing snapshot binding is invalid for this provenance`);
  }
  const componentTotal = value.components.reduce((sum, item) => sum + item.amount_usd, 0);
  if (value.components.length > 0 && Math.abs(componentTotal - value.amount_usd) > 0.000001) {
    throw new Error(`${source} components do not sum to amount_usd`);
  }
  return value;
}

function validateProbe(value, source = 'probe') {
  if (!exactFields(value, PROBE_FIELDS)) throw new Error(`${source} fields must exactly match schema 1`);
  if (value.schema !== SCHEMA_VERSION) throw new Error(`${source}.schema must be 1`);
  if (typeof value.scenario_id !== 'string' || !SAFE_ID.test(value.scenario_id)) throw new Error(`${source}.scenario_id is invalid`);
  if (!['complete', 'partial', 'unknown'].includes(value.status)) throw new Error(`${source}.status is invalid`);
  if (!canonicalTime(value.observed_at)) throw new Error(`${source}.observed_at is invalid`);
  if (typeof value.budget_exhausted !== 'boolean') throw new Error(`${source}.budget_exhausted is invalid`);
  if (!exactFields(value.facts, PROBE_FACT_FIELDS)) throw new Error(`${source}.facts fields are invalid`);
  for (const field of ['file_count_scanned', 'bytes_scanned']) {
    if (!Number.isInteger(value.facts[field]) || value.facts[field] < 0) throw new Error(`${source}.facts.${field} is invalid`);
  }
  for (const field of ['languages', 'package_manifests', 'test_commands', 'candidate_files']) {
    if (!Array.isArray(value.facts[field])
      || value.facts[field].some((item) => typeof item !== 'string' || !item || item.length > 512)) {
      throw new Error(`${source}.facts.${field} is invalid`);
    }
  }
  for (const field of ['has_ci', 'has_tests']) {
    if (typeof value.facts[field] !== 'boolean') throw new Error(`${source}.facts.${field} is invalid`);
  }
  if (!exactFields(value.signals, PROBE_SIGNAL_FIELDS)) throw new Error(`${source}.signals fields are invalid`);
  if (!['localized', 'cross_cutting', 'unknown'].includes(value.signals.scope)) throw new Error(`${source}.signals.scope is invalid`);
  if (!['low', 'medium', 'high', 'unknown'].includes(value.signals.complexity)) throw new Error(`${source}.signals.complexity is invalid`);
  if (!['strong', 'weak', 'unknown'].includes(value.signals.verification_strength)) {
    throw new Error(`${source}.signals.verification_strength is invalid`);
  }
  for (const field of ['recovery_required', 'parallelizable', 'safety_sensitive']) {
    if (typeof value.signals[field] !== 'boolean') throw new Error(`${source}.signals.${field} is invalid`);
  }
  if (!probability(value.signals.uncertainty)) throw new Error(`${source}.signals.uncertainty is invalid`);
  return value;
}

function validateDecision(value, source = 'decision') {
  if (!exactFields(value, DECISION_FIELDS)) throw new Error(`${source} fields must exactly match schema 1`);
  if (value.schema !== SCHEMA_VERSION) throw new Error(`${source}.schema must be 1`);
  if (!DIGEST.test(value.decision_id)) throw new Error(`${source}.decision_id is invalid`);
  if (!POLICY_IDS.includes(value.policy_id)) throw new Error(`${source}.policy_id is invalid`);
  if (typeof value.scenario_id !== 'string' || !SAFE_ID.test(value.scenario_id)) throw new Error(`${source}.scenario_id is invalid`);
  if (value.selected_profile_id !== null
    && (typeof value.selected_profile_id !== 'string' || !SAFE_ID.test(value.selected_profile_id))) {
    throw new Error(`${source}.selected_profile_id is invalid`);
  }
  if (!['planned', 'unknown'].includes(value.status)) throw new Error(`${source}.status is invalid`);
  if (!['not_used', 'complete', 'partial', 'unknown'].includes(value.probe_status)) throw new Error(`${source}.probe_status is invalid`);
  validateCapabilities(value.required_capabilities, `${source}.required_capabilities`);
  if (value.predicted_completion_probability !== null && !probability(value.predicted_completion_probability)) {
    throw new Error(`${source}.predicted_completion_probability is invalid`);
  }
  if (!nullableNonNegative(value.predicted_cost_usd)) throw new Error(`${source}.predicted_cost_usd is invalid`);
  if (!['training_evidence', 'policy_assumption', 'unknown'].includes(value.prediction_source)) {
    throw new Error(`${source}.prediction_source is invalid`);
  }
  if (!['single', 'parallel-2', 'sequential-recovery'].includes(value.topology)) throw new Error(`${source}.topology is invalid`);
  if (!Number.isInteger(value.max_agents) || value.max_agents < 1 || value.max_agents > 8) {
    throw new Error(`${source}.max_agents is invalid`);
  }
  if (!Array.isArray(value.reason_codes)
    || value.reason_codes.length === 0
    || value.reason_codes.some((code) => typeof code !== 'string' || !/^[A-Z][A-Z0-9_]{0,63}$/.test(code))) {
    throw new Error(`${source}.reason_codes is invalid`);
  }
  if (!Array.isArray(value.escalation_plan)) throw new Error(`${source}.escalation_plan is invalid`);
  for (const [index, step] of value.escalation_plan.entries()) {
    if (!exactFields(step, ESCALATION_FIELDS)) throw new Error(`${source}.escalation_plan[${index}] fields are invalid`);
    if (!['no_progress', 'verification_failed', 'budget_exhausted', 'outcome_verified'].includes(step.trigger)) {
      throw new Error(`${source}.escalation_plan[${index}].trigger is invalid`);
    }
    if (!['continue', 'escalate', 'stop', 'split'].includes(step.action)) {
      throw new Error(`${source}.escalation_plan[${index}].action is invalid`);
    }
    if (step.target_tier !== null && !TIERS.includes(step.target_tier)) {
      throw new Error(`${source}.escalation_plan[${index}].target_tier is invalid`);
    }
  }
  if (value.status === 'unknown' && value.selected_profile_id !== null) {
    throw new Error(`${source} unknown decision cannot select a profile`);
  }
  const unsigned = { ...value, decision_id: null };
  if (value.decision_id !== digest(unsigned)) throw new Error(`${source}.decision_id does not bind the decision`);
  return value;
}

function validateAttestation(value, source) {
  if (!exactFields(value, ['algorithm', 'signature_base64'])
    || value.algorithm !== 'ed25519'
    || typeof value.signature_base64 !== 'string'
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.signature_base64)) {
    throw new Error(`${source} is invalid`);
  }
}

function validateVerificationReceipt(value, source = 'verification receipt') {
  if (!exactFields(value, VERIFICATION_RECEIPT_FIELDS)) {
    throw new Error(`${source} fields must exactly match schema 1`);
  }
  if (!Number.isInteger(value.attempt) || value.attempt < 1) {
    throw new Error(`${source}.attempt is invalid`);
  }
  if (typeof value.profile_id !== 'string' || !SAFE_ID.test(value.profile_id)) {
    throw new Error(`${source}.profile_id is invalid`);
  }
  if (!['passed', 'failed'].includes(value.status)) {
    throw new Error(`${source}.status is invalid`);
  }
  if (value.exit_code !== null && !Number.isInteger(value.exit_code)) {
    throw new Error(`${source}.exit_code is invalid`);
  }
  if (typeof value.timed_out !== 'boolean') {
    throw new Error(`${source}.timed_out is invalid`);
  }
  if (value.status === 'passed' && (value.exit_code !== 0 || value.timed_out)) {
    throw new Error(`${source} passed status requires exit code 0 without timeout`);
  }
  if (value.patch_exit_code !== null && !Number.isInteger(value.patch_exit_code)) {
    throw new Error(`${source}.patch_exit_code is invalid`);
  }
  for (const field of ['output_digest', 'patch_digest']) {
    if (!DIGEST.test(value[field])) throw new Error(`${source}.${field} is invalid`);
  }
  for (const field of ['output_excerpt', 'patch_excerpt']) {
    if (typeof value[field] !== 'string' || value[field].length > 8192 || value[field].includes('\0')) {
      throw new Error(`${source}.${field} is invalid`);
    }
  }
  for (const field of ['output_truncated', 'patch_truncated']) {
    if (typeof value[field] !== 'boolean') throw new Error(`${source}.${field} is invalid`);
  }
  if (!Array.isArray(value.changed_paths) || value.changed_paths.length > 256) {
    throw new Error(`${source}.changed_paths is invalid`);
  }
  value.changed_paths.forEach((item, index) => safeRelative(item, `${source}.changed_paths[${index}]`));
  if (new Set(value.changed_paths).size !== value.changed_paths.length) {
    throw new Error(`${source}.changed_paths must be unique`);
  }
  return value;
}

function validateRun(value, source = 'run') {
  if (!exactFields(value, RUN_FIELDS)) throw new Error(`${source} fields must exactly match schema 1`);
  if (value.schema !== SCHEMA_VERSION) throw new Error(`${source}.schema must be 1`);
  if (!['fixture-simulation', 'actual-run'].includes(value.evidence_kind)) throw new Error(`${source}.evidence_kind is invalid`);
  if (!SCENARIO_SET_ID.test(value.scenario_set_id)) throw new Error(`${source}.scenario_set_id is invalid`);
  if (!METRIC_SET_ID.test(value.metric_set_id)) throw new Error(`${source}.metric_set_id is invalid`);
  if (typeof value.scenario_id !== 'string' || !SAFE_ID.test(value.scenario_id)) throw new Error(`${source}.scenario_id is invalid`);
  if (!CATEGORIES.includes(value.category)) throw new Error(`${source}.category is invalid`);
  if (typeof value.holdout !== 'boolean') throw new Error(`${source}.holdout is invalid`);
  if (!POLICY_IDS.includes(value.policy_id)) throw new Error(`${source}.policy_id is invalid`);
  if (!Number.isInteger(value.repetition) || value.repetition < 1) throw new Error(`${source}.repetition is invalid`);
  if (!DIGEST.test(value.decision_id)) throw new Error(`${source}.decision_id is invalid`);
  for (const field of ['selected_profile_id', 'observed_profile_id']) {
    if (value[field] !== null && (typeof value[field] !== 'string' || !SAFE_ID.test(value[field]))) {
      throw new Error(`${source}.${field} is invalid`);
    }
  }
  if (typeof value.requested_model !== 'string' || !value.requested_model || value.requested_model.length > 128) {
    throw new Error(`${source}.requested_model is invalid`);
  }
  if (value.observed_model !== null
    && (typeof value.observed_model !== 'string' || !value.observed_model || value.observed_model.length > 128)) {
    throw new Error(`${source}.observed_model is invalid`);
  }
  if (!['passed', 'failed', 'unknown'].includes(value.model_proof_status)) throw new Error(`${source}.model_proof_status is invalid`);
  if (value.model_proof_status === 'passed' && value.observed_model === null) {
    throw new Error(`${source} passed model proof requires an observed model`);
  }
  if (!canonicalTime(value.started_at)) throw new Error(`${source}.started_at is invalid`);
  if (!Number.isInteger(value.duration_ms) || value.duration_ms < 0) throw new Error(`${source}.duration_ms is invalid`);
  if (!['passed', 'failed', 'unknown'].includes(value.outcome)) throw new Error(`${source}.outcome is invalid`);
  if (typeof value.verified !== 'boolean') throw new Error(`${source}.verified is invalid`);
  if (value.verified && value.outcome !== 'passed') throw new Error(`${source} only passed outcomes may be verified`);
  for (const field of ['attempts', 'human_interventions']) {
    if (!Number.isInteger(value[field]) || value[field] < 0) throw new Error(`${source}.${field} is invalid`);
  }
  if (value.attempts < 1) throw new Error(`${source}.attempts is invalid`);
  if (!['single', 'parallel-2', 'sequential-recovery'].includes(value.topology)) throw new Error(`${source}.topology is invalid`);
  validateCost(value.cost, `${source}.cost`);
  if (!Array.isArray(value.artifact_paths)) throw new Error(`${source}.artifact_paths is invalid`);
  value.artifact_paths.forEach((item, index) => safeRelative(item, `${source}.artifact_paths[${index}]`));
  if (!Array.isArray(value.verification_receipts) || value.verification_receipts.length > value.attempts) {
    throw new Error(`${source}.verification_receipts is invalid`);
  }
  value.verification_receipts.forEach((receipt, index) => {
    validateVerificationReceipt(receipt, `${source}.verification_receipts[${index}]`);
    if (receipt.attempt > value.attempts || (index > 0 && receipt.attempt <= value.verification_receipts[index - 1].attempt)) {
      throw new Error(`${source}.verification_receipts must follow attempt order`);
    }
  });
  if (['VERIFICATION_FAILED', 'EXPECTED_ARTIFACTS_NOT_CHANGED'].includes(value.failure_code)
    && value.verification_receipts.length === 0) {
    throw new Error(`${source} verification failure requires a receipt`);
  }
  if (value.outcome === 'passed'
    && (value.verification_receipts.length === 0
      || value.verification_receipts.at(-1).status !== 'passed')) {
    throw new Error(`${source} passed outcome requires a passed verification receipt`);
  }
  if (!['verified', 'failed', 'unknown'].includes(value.receipt_status)) throw new Error(`${source}.receipt_status is invalid`);
  if (value.verified && (value.model_proof_status !== 'passed' || value.receipt_status !== 'verified')) {
    throw new Error(`${source} verified outcome requires passed model proof and a verified receipt`);
  }
  if (value.adversarial_result !== null
    && !['detected', 'false_pass', 'unknown'].includes(value.adversarial_result)) {
    throw new Error(`${source}.adversarial_result is invalid`);
  }
  if (value.failure_code !== null
    && (typeof value.failure_code !== 'string' || !/^[A-Z][A-Z0-9_]{0,63}$/.test(value.failure_code))) {
    throw new Error(`${source}.failure_code is invalid`);
  }
  if (value.evidence_kind === 'fixture-simulation') {
    if (value.attestation !== null) throw new Error(`${source} fixture evidence cannot be attested`);
  } else {
    validateAttestation(value.attestation, `${source}.attestation`);
  }
  return value;
}

function scenarioSetIdentity(scenarios) {
  return `optimizer-scenarios-sha256:${digest(scenarios).slice('sha256:'.length)}`;
}

function executorSetIdentity(executors) {
  return `optimizer-executors-sha256:${digest(executors).slice('sha256:'.length)}`;
}

function metricSetIdentity() {
  return `optimizer-metrics-sha256:${digest(METRIC_IDENTITIES).slice('sha256:'.length)}`;
}

function validateFreeze(value, scenarios, executors, source = 'freeze') {
  if (!exactFields(value, FREEZE_FIELDS)) throw new Error(`${source} fields must exactly match schema 1`);
  if (value.schema !== SCHEMA_VERSION) throw new Error(`${source}.schema must be 1`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.frozen_at)) throw new Error(`${source}.frozen_at is invalid`);
  if (value.scenario_count !== scenarios.length) throw new Error(`${source}.scenario_count mismatch`);
  if (value.scenario_set_id !== scenarioSetIdentity(scenarios)) throw new Error(`${source}.scenario_set_id mismatch`);
  if (value.executor_set_id !== executorSetIdentity(executors)) throw new Error(`${source}.executor_set_id mismatch`);
  if (value.metric_set_id !== metricSetIdentity()) throw new Error(`${source}.metric_set_id mismatch`);
  if (canonical(value.policies) !== canonical(POLICY_IDS)) throw new Error(`${source}.policies must preserve the frozen policy order`);
  if (!Number.isInteger(value.repetitions) || value.repetitions < 3 || value.repetitions > 10) {
    throw new Error(`${source}.repetitions is invalid`);
  }
  const scenarioIds = new Set(scenarios.map((scenario) => scenario.id));
  if (!Array.isArray(value.holdout_scenario_ids)
    || value.holdout_scenario_ids.length < 3
    || new Set(value.holdout_scenario_ids).size !== value.holdout_scenario_ids.length
    || value.holdout_scenario_ids.some((id) => !scenarioIds.has(id))) {
    throw new Error(`${source}.holdout_scenario_ids is invalid`);
  }
  const declaredHoldouts = scenarios.filter((scenario) => scenario.holdout).map((scenario) => scenario.id).sort();
  if (canonical([...value.holdout_scenario_ids].sort()) !== canonical(declaredHoldouts)) {
    throw new Error(`${source}.holdout_scenario_ids mismatch`);
  }
  if (typeof value.selection_policy !== 'string' || value.selection_policy.trim().length < 20) {
    throw new Error(`${source}.selection_policy is required`);
  }
  if (value.pricing_snapshot_digest !== null && !DIGEST.test(value.pricing_snapshot_digest)) {
    throw new Error(`${source}.pricing_snapshot_digest is invalid`);
  }
  if (value.calibration_record_digest !== null && !DIGEST.test(value.calibration_record_digest)) {
    throw new Error(`${source}.calibration_record_digest is invalid`);
  }
  if (value.calibration_forensics_digest !== null && !DIGEST.test(value.calibration_forensics_digest)) {
    throw new Error(`${source}.calibration_forensics_digest is invalid`);
  }
  if (value.diagnostic_pilot_forensics_digest !== null
    && !DIGEST.test(value.diagnostic_pilot_forensics_digest)) {
    throw new Error(`${source}.diagnostic_pilot_forensics_digest is invalid`);
  }
  if (value.external_reproduction_digest !== null && !DIGEST.test(value.external_reproduction_digest)) {
    throw new Error(`${source}.external_reproduction_digest is invalid`);
  }
  if (!DIGEST.test(value.calibration_plan_digest)) {
    throw new Error(`${source}.calibration_plan_digest is invalid`);
  }
  if (value.external_scenario !== null) {
    if (!exactFields(value.external_scenario, EXTERNAL_SCENARIO_FIELDS)) {
      throw new Error(`${source}.external_scenario fields are invalid`);
    }
    if (!value.holdout_scenario_ids.includes(value.external_scenario.scenario_id)) {
      throw new Error(`${source}.external_scenario is not a frozen holdout`);
    }
    if (value.external_scenario.selection_method !== 'drand-public-beacon') {
      throw new Error(`${source}.external_scenario.selection_method is invalid`);
    }
    if (!DIGEST.test(value.external_scenario.selection_record_digest)) {
      throw new Error(`${source}.external_scenario.selection_record_digest is invalid`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.external_scenario.selected_at)) {
      throw new Error(`${source}.external_scenario.selected_at is invalid`);
    }
    if (!/^https:\/\//.test(value.external_scenario.selection_source)) {
      throw new Error(`${source}.external_scenario.selection_source is invalid`);
    }
  }
  if (value.attestation_public_key !== null) {
    try {
      if (crypto.createPublicKey(value.attestation_public_key).asymmetricKeyType !== 'ed25519') {
        throw new Error('wrong key type');
      }
    } catch {
      throw new Error(`${source}.attestation_public_key must be Ed25519 PEM or null`);
    }
  }
  if (value.external_scenario === null && value.external_reproduction_digest !== null) {
    throw new Error(`${source} cannot bind external reproduction before external selection`);
  }
  return value;
}

function validateBenchmarkShape(scenarios, executors) {
  if (scenarios.length < 10 || scenarios.length > 12) throw new Error('Optimizer scenario set must contain 10-12 scenarios');
  for (const category of CATEGORIES) {
    if (!scenarios.some((scenario) => scenario.category === category)) {
      throw new Error(`Optimizer scenario set is missing ${category}`);
    }
  }
  const repositories = new Set(scenarios.map((scenario) => scenario.repository));
  if (repositories.size < 3) throw new Error('Optimizer scenario set requires at least 3 repositories');
  const executorIds = new Set(executors.map((executor) => executor.profile_id));
  if (executorIds.size !== executors.length) throw new Error('Executor profile_id values must be unique');
  if (new Set(executors.map((executor) => executor.runtime)).size < 2) {
    throw new Error('Optimizer executor set requires at least 2 runtime families');
  }
  for (const tier of TIERS) {
    if (!executors.some((executor) => executor.tier === tier)) throw new Error(`Optimizer executor set is missing ${tier}`);
  }
  for (const scenario of scenarios) {
    for (const profileId of scenario.candidate_executors) {
      if (!executorIds.has(profileId)) throw new Error(`${scenario.id} references unknown executor ${profileId}`);
    }
  }
}

function loadScenarios(directory) {
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.json')).sort();
  const scenarios = files.map((name) => validateScenario(
    JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8')),
    name,
  ));
  if (new Set(scenarios.map((scenario) => scenario.id)).size !== scenarios.length) {
    throw new Error('Optimizer scenario IDs must be unique');
  }
  return scenarios;
}

function loadExecutors(file) {
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!value || value.schema !== 1 || !Array.isArray(value.executors)
    || canonical(Object.keys(value).sort()) !== canonical(['executors', 'schema'])) {
    throw new Error('executors.json fields are invalid');
  }
  const executors = value.executors.map((executor, index) => validateExecutorProfile(executor, `executors[${index}]`));
  if (executors.length < 3) throw new Error('Optimizer executor set requires at least 3 profiles');
  return executors;
}

function loadFreeze(file, scenarios, executors) {
  return validateFreeze(JSON.parse(fs.readFileSync(file, 'utf8')), scenarios, executors, path.basename(file));
}

module.exports = Object.freeze({
  CAPABILITY_KEYS,
  CATEGORIES,
  COST_COMPONENT_KINDS,
  COST_PROVENANCE,
  DIGEST,
  METRIC_IDENTITIES,
  POLICY_IDS,
  RUNTIMES,
  SCHEMA_VERSION,
  TIERS,
  canonical,
  canonicalTime,
  digest,
  exactFields,
  executorSetIdentity,
  loadExecutors,
  loadFreeze,
  loadScenarios,
  metricSetIdentity,
  safeRelative,
  scenarioSetIdentity,
  unknownCost,
  validateBenchmarkShape,
  validateCapabilities,
  validateCost,
  validateDecision,
  validateExecutorProfile,
  validateFreeze,
  validateProbe,
  validateRun,
  validateScenario,
  validateVerificationReceipt,
});

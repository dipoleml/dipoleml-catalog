'use strict';

const {
  DIGEST,
  canonical,
  exactFields,
} = require('./contracts');

const FORENSICS_FIELDS = Object.freeze([
  'schema',
  'kind',
  'observed_at',
  'model_calls_made',
  'scenario_id',
  'repository',
  'pinned_ref',
  'environment',
  'original_setup_command',
  'original_verification_command',
  'original_verifier_baseline',
  'task_focused_baseline',
  'reference_repair',
  'conclusion',
]);
const ENVIRONMENT_FIELDS = Object.freeze(['platform', 'node', 'npm']);
const ORIGINAL_BASELINE_FIELDS = Object.freeze([
  'exit_code',
  'task_tests_reached',
  'failure_classes',
]);
const TASK_BASELINE_FIELDS = Object.freeze([
  'command',
  'exit_code',
  'passed_tests',
  'failed_tests',
  'unhandled_rejections',
  'failure_class',
]);
const REFERENCE_REPAIR_FIELDS = Object.freeze([
  'changed_artifacts',
  'patch_digest',
  'verification_command',
  'exit_code',
  'passed_tests',
  'failed_tests',
  'unhandled_rejections',
]);

function nonnegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateCalibrationForensics(value, calibrationScenarios, currentScenarios) {
  if (!exactFields(value, FORENSICS_FIELDS)
    || value.schema !== 1
    || value.kind !== 'citadel_optimizer_calibration_forensics') {
    throw new Error('Calibration forensics identity or fields are invalid');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.observed_at) || value.model_calls_made !== 0) {
    throw new Error('Calibration forensics observation boundary is invalid');
  }
  const archived = calibrationScenarios.find((scenario) => scenario.id === value.scenario_id);
  const current = currentScenarios.find((scenario) => scenario.id === value.scenario_id);
  if (!archived || !current
    || value.repository !== archived.repository
    || value.pinned_ref !== archived.pinned_ref
    || current.repository !== archived.repository
    || current.pinned_ref !== archived.pinned_ref) {
    throw new Error('Calibration forensics scenario binding is invalid');
  }
  if (!exactFields(value.environment, ENVIRONMENT_FIELDS)
    || value.environment.platform !== 'win32'
    || !/^v\d+\.\d+\.\d+$/.test(value.environment.node)
    || !/^\d+\.\d+\.\d+$/.test(value.environment.npm)) {
    throw new Error('Calibration forensics environment is invalid');
  }
  if (canonical(value.original_setup_command) !== canonical(archived.setup_command)
    || canonical(value.original_verification_command) !== canonical(archived.verification_command)) {
    throw new Error('Calibration forensics original commands are invalid');
  }
  if (!exactFields(value.original_verifier_baseline, ORIGINAL_BASELINE_FIELDS)
    || !Number.isInteger(value.original_verifier_baseline.exit_code)
    || value.original_verifier_baseline.exit_code === 0
    || value.original_verifier_baseline.task_tests_reached !== false
    || !Array.isArray(value.original_verifier_baseline.failure_classes)
    || value.original_verifier_baseline.failure_classes.length < 1
    || value.original_verifier_baseline.failure_classes.some((item) => (
      typeof item !== 'string' || !/^[A-Z][A-Z0-9_]{0,63}$/.test(item)
    ))) {
    throw new Error('Calibration forensics original baseline is invalid');
  }
  if (!exactFields(value.task_focused_baseline, TASK_BASELINE_FIELDS)
    || canonical(value.task_focused_baseline.command) !== canonical(current.verification_command)
    || !Number.isInteger(value.task_focused_baseline.exit_code)
    || value.task_focused_baseline.exit_code === 0
    || !nonnegativeInteger(value.task_focused_baseline.passed_tests)
    || !Number.isInteger(value.task_focused_baseline.failed_tests)
    || value.task_focused_baseline.failed_tests < 1
    || !Number.isInteger(value.task_focused_baseline.unhandled_rejections)
    || value.task_focused_baseline.unhandled_rejections < 1
    || typeof value.task_focused_baseline.failure_class !== 'string'
    || !/^[A-Z][A-Z0-9_]{0,63}$/.test(value.task_focused_baseline.failure_class)) {
    throw new Error('Calibration forensics task-focused baseline is invalid');
  }
  if (!exactFields(value.reference_repair, REFERENCE_REPAIR_FIELDS)
    || canonical(value.reference_repair.changed_artifacts) !== canonical(archived.expected_artifacts)
    || !DIGEST.test(value.reference_repair.patch_digest)
    || canonical(value.reference_repair.verification_command) !== canonical(current.verification_command)
    || value.reference_repair.exit_code !== 0
    || !Number.isInteger(value.reference_repair.passed_tests)
    || value.reference_repair.passed_tests < 1
    || value.reference_repair.failed_tests !== 0
    || value.reference_repair.unhandled_rejections !== 0) {
    throw new Error('Calibration forensics reference repair is invalid');
  }
  if (typeof value.conclusion !== 'string' || !value.conclusion || value.conclusion.length > 1000) {
    throw new Error('Calibration forensics conclusion is invalid');
  }
  return value;
}

module.exports = Object.freeze({
  validateCalibrationForensics,
});

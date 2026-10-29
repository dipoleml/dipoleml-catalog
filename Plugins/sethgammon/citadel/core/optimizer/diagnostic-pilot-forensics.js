'use strict';

const {
  DIGEST,
  canonical,
  digest,
  exactFields,
  scenarioSetIdentity,
} = require('./contracts');

const FORENSICS_FIELDS = Object.freeze([
  'schema',
  'kind',
  'observed_at',
  'model_calls_made',
  'scenario_id',
  'pilot_record_digest',
  'pilot_scenario_set_id',
  'corrected_scenario_set_id',
  'classification',
  'claude_observation',
  'codex_observation',
  'correction',
  'conclusion',
]);
const OBSERVATION_FIELDS = Object.freeze([
  'profile_id',
  'model_proof_status',
  'receipt_status',
  'verification_status',
  'verification_exit_code',
  'verification_output_digest',
  'patch_digest',
  'changed_paths',
  'original_failure_code',
  'original_task_verified',
  'replay_artifact_gate_passed',
  'replay_task_verified',
]);
const CORRECTION_FIELDS = Object.freeze([
  'original_expected_artifacts',
  'corrected_expected_artifacts',
  'reason',
  'pilot_record_rewritten',
  'additional_model_calls',
]);

function expectedReplay(run, scenario) {
  const receipt = run.verification_receipts.at(-1);
  const artifactsPassed = scenario.expected_artifacts.every((artifact) => (
    receipt.changed_paths.includes(artifact)
  ));
  return {
    artifactsPassed,
    taskVerified: artifactsPassed
      && receipt.status === 'passed'
      && run.model_proof_status === 'passed'
      && run.receipt_status === 'verified',
  };
}

function validateObservation(value, run, correctedScenario, source) {
  if (!exactFields(value, OBSERVATION_FIELDS)) {
    throw new Error(`${source} fields are invalid`);
  }
  const receipt = run.verification_receipts.at(-1);
  const replay = expectedReplay(run, correctedScenario);
  if (value.profile_id !== run.profile_id
    || value.model_proof_status !== run.model_proof_status
    || value.receipt_status !== run.receipt_status
    || value.verification_status !== receipt.status
    || value.verification_exit_code !== receipt.exit_code
    || value.verification_output_digest !== receipt.output_digest
    || value.patch_digest !== receipt.patch_digest
    || canonical(value.changed_paths) !== canonical(receipt.changed_paths)
    || value.original_failure_code !== run.failure_code
    || value.original_task_verified !== run.task_verified
    || value.replay_artifact_gate_passed !== replay.artifactsPassed
    || value.replay_task_verified !== replay.taskVerified
    || !DIGEST.test(value.verification_output_digest)
    || !DIGEST.test(value.patch_digest)) {
    throw new Error(`${source} does not reproduce from the pilot record`);
  }
}

function validateDiagnosticPilotForensics(
  value,
  plan,
  record,
  pilotScenarios,
  currentScenarios,
) {
  if (!exactFields(value, FORENSICS_FIELDS)
    || value.schema !== 1
    || value.kind !== 'citadel_optimizer_diagnostic_pilot_forensics') {
    throw new Error('Diagnostic pilot forensics identity or fields are invalid');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.observed_at)
    || value.model_calls_made !== 0
    || value.classification !== 'ARTIFACT_GATE_FALSE_NEGATIVE') {
    throw new Error('Diagnostic pilot forensics observation boundary is invalid');
  }
  if (value.pilot_record_digest !== digest(record)
    || value.pilot_record_digest !== plan.record_digest
    || value.pilot_scenario_set_id !== scenarioSetIdentity(pilotScenarios)
    || value.pilot_scenario_set_id !== plan.scenario_set_id
    || value.pilot_scenario_set_id !== record.scenario_set_id
    || value.corrected_scenario_set_id !== scenarioSetIdentity(currentScenarios)
    || value.pilot_scenario_set_id === value.corrected_scenario_set_id) {
    throw new Error('Diagnostic pilot forensics evidence binding is invalid');
  }
  const originalScenario = pilotScenarios.find((scenario) => scenario.id === value.scenario_id);
  const correctedScenario = currentScenarios.find((scenario) => scenario.id === value.scenario_id);
  if (!originalScenario || !correctedScenario || value.scenario_id !== plan.scenario_id) {
    throw new Error('Diagnostic pilot forensics scenario is invalid');
  }
  const normalizedCorrection = {
    ...correctedScenario,
    expected_artifacts: originalScenario.expected_artifacts,
  };
  if (canonical(normalizedCorrection) !== canonical(originalScenario)
    || canonical(originalScenario.expected_artifacts) !== canonical(['index.js', 'test.js'])
    || canonical(correctedScenario.expected_artifacts) !== canonical(['index.js'])) {
    throw new Error('Diagnostic pilot forensics correction is not isolated');
  }
  if (!exactFields(value.correction, CORRECTION_FIELDS)
    || canonical(value.correction.original_expected_artifacts)
      !== canonical(originalScenario.expected_artifacts)
    || canonical(value.correction.corrected_expected_artifacts)
      !== canonical(correctedScenario.expected_artifacts)
    || typeof value.correction.reason !== 'string'
    || value.correction.reason.length < 40
    || value.correction.reason.length > 1000
    || value.correction.pilot_record_rewritten !== false
    || value.correction.additional_model_calls !== 0) {
    throw new Error('Diagnostic pilot forensics correction is invalid');
  }
  const claudeRun = record.runs.find((run) => run.profile_id === 'claude-frontier');
  const codexRun = record.runs.find((run) => run.profile_id === 'codex-frontier');
  if (!claudeRun || !codexRun) {
    throw new Error('Diagnostic pilot forensics requires both frozen runs');
  }
  validateObservation(
    value.claude_observation,
    claudeRun,
    correctedScenario,
    'Diagnostic pilot Claude observation',
  );
  validateObservation(
    value.codex_observation,
    codexRun,
    correctedScenario,
    'Diagnostic pilot Codex observation',
  );
  if (value.claude_observation.original_task_verified !== false
    || value.claude_observation.verification_status !== 'passed'
    || value.claude_observation.replay_task_verified !== true
    || value.codex_observation.original_task_verified !== false
    || value.codex_observation.replay_task_verified !== false
    || record.status !== 'failed'
    || record.stop_reason !== 'NO_TASK_VERIFIER_PASS') {
    throw new Error('Diagnostic pilot forensics classification is invalid');
  }
  if (typeof value.conclusion !== 'string'
    || value.conclusion.length < 80
    || value.conclusion.length > 1500) {
    throw new Error('Diagnostic pilot forensics conclusion is invalid');
  }
  return value;
}

module.exports = Object.freeze({
  validateDiagnosticPilotForensics,
});

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  execute,
  isContainedPath,
  resolveContained,
  safeEnvironment,
} = require('../benchmark/runner');
const {
  exactFields,
  digest,
  metricSetIdentity,
  scenarioSetIdentity,
  unknownCost,
  validateCost,
  validateExecutorProfile,
  validateScenario,
} = require('./contracts');
const { nextAdaptiveAction, route } = require('./policy');
const { probeWorkspace } = require('./probe');
const { validateExecutorBindings } = require('./executor-binding');
const { SECRET_PATTERN } = require('../forks/redaction');

const ADAPTER_FIELDS = Object.freeze([
  'schema',
  'profile_id',
  'requested_model',
  'observed_model',
  'model_proof_status',
  'receipt_status',
  'cost',
  'human_interventions',
  'progress_status',
]);
const FAILURE_CODES = Object.freeze({
  clone: 'CLONE_FAILED',
  checkout: 'CHECKOUT_FAILED',
  setup: 'SETUP_FAILED',
  execution: 'EXECUTION_FAILED',
  execution_timeout: 'EXECUTION_TIMEOUT',
  adapter_output: 'ADAPTER_OUTPUT_INVALID',
  verification: 'VERIFICATION_FAILED',
  artifacts: 'EXPECTED_ARTIFACTS_NOT_CHANGED',
  profile_binding: 'EXECUTOR_PROFILE_UNBOUND',
  unexpected: 'UNEXPECTED_FAILED',
});
const DIAGNOSTIC_EXCERPT_LIMIT = 8192;

class OptimizerRunError extends Error {
  constructor(code) {
    super(code);
    this.name = 'OptimizerRunError';
    this.code = Object.values(FAILURE_CODES).includes(code) ? code : FAILURE_CODES.unexpected;
  }
}

function validateAdapterOutput(value, expectedProfile) {
  validateExecutorProfile(expectedProfile);
  if (!exactFields(value, ADAPTER_FIELDS)) throw new OptimizerRunError(FAILURE_CODES.adapter_output);
  if (value.schema !== 1
    || value.profile_id !== expectedProfile.profile_id
    || value.requested_model !== expectedProfile.model) {
    throw new OptimizerRunError(FAILURE_CODES.adapter_output);
  }
  if (value.observed_model !== null
    && (typeof value.observed_model !== 'string' || !value.observed_model || value.observed_model.length > 128)) {
    throw new OptimizerRunError(FAILURE_CODES.adapter_output);
  }
  if (!['passed', 'failed', 'unknown'].includes(value.model_proof_status)
    || !['verified', 'failed', 'unknown'].includes(value.receipt_status)
    || !['progress', 'stalled', 'unknown'].includes(value.progress_status)) {
    throw new OptimizerRunError(FAILURE_CODES.adapter_output);
  }
  if (!Number.isInteger(value.human_interventions) || value.human_interventions < 0) {
    throw new OptimizerRunError(FAILURE_CODES.adapter_output);
  }
  try {
    validateCost(value.cost, 'adapter.cost');
  } catch {
    throw new OptimizerRunError(FAILURE_CODES.adapter_output);
  }
  if (value.model_proof_status === 'passed' && value.observed_model !== expectedProfile.model) {
    throw new OptimizerRunError(FAILURE_CODES.adapter_output);
  }
  return value;
}

function assertActualReady(freeze, executors) {
  if (!freeze.external_scenario) throw new Error('Actual optimizer runs require a frozen external scenario');
  if (!freeze.attestation_public_key) throw new Error('Actual optimizer runs require a frozen run-attestation public key');
  if (freeze.pricing_snapshot_digest === null) {
    throw new Error('Actual optimizer runs require a frozen pricing snapshot');
  }
  if (freeze.calibration_record_digest === null) {
    throw new Error('Actual optimizer runs require a completed calibration record');
  }
  const unbound = executors.filter((profile) => profile.executor_profile_digest === null);
  if (unbound.length) {
    throw new Error(`Actual optimizer runs require bound executor profiles: ${unbound.map((profile) => profile.profile_id).join(', ')}`);
  }
  const invalidBindings = validateExecutorBindings(executors);
  if (invalidBindings.length) {
    throw new Error(`Actual optimizer runs require canonical executor profile bindings: ${invalidBindings.join(', ')}`);
  }
  const unboundAdapters = executors.filter((profile) => profile.adapter_digest === null);
  if (unboundAdapters.length) {
    throw new Error(`Actual optimizer runs require bound adapters: ${unboundAdapters.map((profile) => profile.profile_id).join(', ')}`);
  }
}

function sumAttemptCosts(costs) {
  if (!costs.length || costs.some((cost) => cost.status === 'unknown')) {
    return unknownCost('optimizer_runner', 'one_or_more_attempt_costs_unknown');
  }
  const components = [];
  for (const [attemptIndex, cost] of costs.entries()) {
    if (cost.components.length) {
      for (const component of cost.components) {
        components.push({
          kind: component.kind,
          amount_usd: component.amount_usd,
          source: `attempt_${attemptIndex + 1}:${component.source}`.slice(0, 128),
        });
      }
    } else {
      components.push({
        kind: 'model',
        amount_usd: cost.amount_usd,
        source: `attempt_${attemptIndex + 1}:${cost.source}`.slice(0, 128),
      });
    }
  }
  const amount = Number(components.reduce((sum, component) => sum + component.amount_usd, 0).toFixed(6));
  const pricingDigests = [...new Set(costs
    .map((cost) => cost.pricing_snapshot_digest)
    .filter((value) => value !== null))];
  if (pricingDigests.length > 1) {
    return unknownCost('optimizer_runner', 'attempts_used_multiple_pricing_snapshots');
  }
  return validateCost({
    status: 'known',
    amount_usd: amount,
    provenance: 'tool_reported',
    source: 'citadel_optimizer_runner',
    source_ref: `summed_attempts:${costs.length}`,
    pricing_snapshot_digest: pricingDigests[0] || null,
    components,
  });
}

function changedArtifacts(workspace, scenario, executeCommand, timeoutMs) {
  const result = executeCommand(['git', 'diff', '--name-only', '--'], workspace, timeoutMs);
  if (result.status !== 0) return { passed: false, paths: [], changed_paths: [] };
  const changed = new Set(String(result.stdout || '').split(/\r?\n/).filter(Boolean).map((item) => item.replace(/\\/g, '/')));
  const expected = scenario.expected_artifacts.map((item) => item.replace(/\\/g, '/'));
  return {
    passed: expected.every((item) => changed.has(item)),
    paths: expected.filter((item) => changed.has(item)),
    changed_paths: [...changed].sort(),
  };
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function redactDiagnosticText(value, sandbox, workspace) {
  let output = String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const replacements = [
    [workspace, '<WORKSPACE>'],
    [sandbox, '<SANDBOX>'],
    [process.env.USERPROFILE, '<HOME>'],
    [process.env.HOME, '<HOME>'],
  ].filter(([candidate]) => typeof candidate === 'string' && candidate);
  for (const [candidate, replacement] of replacements) {
    const variants = [...new Set([candidate, candidate.replace(/\\/g, '/'), candidate.replace(/\//g, '\\')])];
    for (const variant of variants) {
      output = output.replace(new RegExp(escapeRegularExpression(variant), 'gi'), replacement);
    }
  }
  return output.split('\n').map((line) => (
    SECRET_PATTERN.test(line) ? '<REDACTED_SECRET_OR_PATH>' : line
  )).join('\n');
}

function boundedDiagnostic(value) {
  return {
    excerpt: value.slice(-DIAGNOSTIC_EXCERPT_LIMIT),
    truncated: value.length > DIAGNOSTIC_EXCERPT_LIMIT,
  };
}

function verificationReceipt({
  attempt,
  profileId,
  verification,
  patch,
  changedPaths,
  sandbox,
  workspace,
}) {
  const outputCapture = redactDiagnosticText(
    `[stdout]\n${verification.stdout || ''}\n[stderr]\n${verification.stderr || ''}`,
    sandbox,
    workspace,
  );
  const patchCapture = redactDiagnosticText(patch.stdout || '', sandbox, workspace);
  const output = boundedDiagnostic(outputCapture);
  const patchEvidence = boundedDiagnostic(patchCapture);
  return Object.freeze({
    attempt,
    profile_id: profileId,
    status: verification.status === 0 && !verification.timed_out ? 'passed' : 'failed',
    exit_code: Number.isInteger(verification.status) ? verification.status : null,
    timed_out: Boolean(verification.timed_out),
    output_digest: digest(outputCapture),
    output_excerpt: output.excerpt,
    output_truncated: output.truncated,
    patch_exit_code: Number.isInteger(patch.status) ? patch.status : null,
    patch_digest: digest(patchCapture),
    patch_excerpt: patchEvidence.excerpt,
    patch_truncated: patchEvidence.truncated,
    changed_paths: [...new Set(changedPaths)].sort(),
  });
}

function readAdapterOutput(sandbox, outputFile, expectedProfile) {
  if (!isContainedPath(sandbox, outputFile, { regularFile: true })) {
    throw new OptimizerRunError(FAILURE_CODES.adapter_output);
  }
  try {
    return validateAdapterOutput(JSON.parse(fs.readFileSync(outputFile, 'utf8')), expectedProfile);
  } catch (error) {
    if (error instanceof OptimizerRunError) throw error;
    throw new OptimizerRunError(FAILURE_CODES.adapter_output);
  }
}

function adapterSourceDigest(adapterFile) {
  return digest(fs.readFileSync(adapterFile, 'utf8').replace(/\r\n/g, '\n'));
}

function writeAdapterInput(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function runScenario({
  scenario,
  scenarios,
  executors,
  policyId,
  repetition,
  adapterFile,
  pricingSnapshot = null,
  executeCommand = execute,
  observedAt,
}) {
  validateScenario(scenario);
  executors.forEach(validateExecutorProfile);
  if (!Number.isInteger(repetition) || repetition < 1) throw new Error('repetition must be positive');
  const resolvedAdapter = fs.realpathSync(path.resolve(adapterFile));
  if (!fs.statSync(resolvedAdapter).isFile() || fs.lstatSync(resolvedAdapter).isSymbolicLink()) {
    throw new Error('adapterFile must be a real file');
  }
  const adapterDigest = adapterSourceDigest(resolvedAdapter);
  const timeoutMs = scenario.timeout_minutes * 60 * 1000;
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'citadel-optimizer-benchmark-'));
  const workspace = resolveContained(sandbox, 'repository');
  const startedAt = observedAt || new Date().toISOString();
  const started = Date.now();
  const costs = [];
  let decision = null;
  let currentProfile = null;
  let finalAdapter = null;
  let attempts = 0;
  let humanInterventions = 0;
  let outcome = 'unknown';
  let verified = false;
  let artifactPaths = [];
  const verificationReceipts = [];
  let failureCode = null;
  let probe = null;
  try {
    const clone = executeCommand(['git', 'clone', '--quiet', '--no-checkout', scenario.repository, workspace], sandbox, timeoutMs);
    if (clone.status !== 0) throw new OptimizerRunError(FAILURE_CODES.clone);
    const checkout = executeCommand(['git', 'checkout', '--quiet', '--detach', scenario.pinned_ref], workspace, timeoutMs);
    if (checkout.status !== 0) throw new OptimizerRunError(FAILURE_CODES.checkout);
    const setup = executeCommand(scenario.setup_command, workspace, timeoutMs);
    if (setup.status !== 0) throw new OptimizerRunError(FAILURE_CODES.setup);
    probe = probeWorkspace(workspace, scenario, { observedAt: startedAt });
    decision = route({
      scenario,
      executors,
      policyId,
      probe: policyId === 'adaptive' ? probe : undefined,
    });
    currentProfile = executors.find((profile) => profile.profile_id === decision.selected_profile_id);

    while (attempts < scenario.max_attempts) {
      attempts += 1;
      if (currentProfile.adapter_digest !== null && currentProfile.adapter_digest !== adapterDigest) {
        throw new OptimizerRunError(FAILURE_CODES.profile_binding);
      }
      const inputFile = resolveContained(sandbox, `adapter-input-${attempts}.json`);
      const outputFile = resolveContained(sandbox, `adapter-output-${attempts}.json`);
      writeAdapterInput(inputFile, {
        schema: 1,
        scenario_id: scenario.id,
        policy_id: policyId,
        repetition,
        task: scenario.task,
        allowed_tools: scenario.allowed_tools,
        timeout_minutes: scenario.timeout_minutes,
        repository_path: workspace,
        output_path: outputFile,
        profile: currentProfile,
        pricing_snapshot: pricingSnapshot,
        probe,
        decision,
      });
      const execution = executeCommand(
        [process.execPath, resolvedAdapter, inputFile],
        workspace,
        timeoutMs,
        safeEnvironment({ CITADEL_OPTIMIZER_POLICY: policyId }),
      );
      if (execution.timed_out) throw new OptimizerRunError(FAILURE_CODES.execution_timeout);
      if (execution.status !== 0) throw new OptimizerRunError(FAILURE_CODES.execution);
      finalAdapter = readAdapterOutput(sandbox, outputFile, currentProfile);
      costs.push(finalAdapter.cost);
      humanInterventions += finalAdapter.human_interventions;
      const verification = executeCommand(scenario.verification_command, workspace, timeoutMs);
      const artifacts = changedArtifacts(workspace, scenario, executeCommand, timeoutMs);
      const patch = executeCommand(['git', 'diff', '--no-ext-diff', '--binary', '--'], workspace, timeoutMs);
      verificationReceipts.push(verificationReceipt({
        attempt: attempts,
        profileId: currentProfile.profile_id,
        verification,
        patch,
        changedPaths: artifacts.changed_paths,
        sandbox,
        workspace,
      }));
      artifactPaths = artifacts.paths;
      if (verification.status === 0 && artifacts.passed) {
        outcome = 'passed';
        verified = finalAdapter.model_proof_status === 'passed' && finalAdapter.receipt_status === 'verified';
        failureCode = verified ? null : 'EXECUTION_EVIDENCE_UNKNOWN';
        break;
      }
      failureCode = verification.status === 0 ? FAILURE_CODES.artifacts : FAILURE_CODES.verification;
      outcome = 'failed';
      if (policyId !== 'adaptive') break;
      const action = nextAdaptiveAction(decision, {
        verification_status: 'failed',
        progress_status: finalAdapter.progress_status,
        attempts,
        budget_remaining_usd: null,
      }, executors);
      if (action.action !== 'escalate' || attempts >= scenario.max_attempts) break;
      currentProfile = executors.find((profile) => profile.profile_id === action.target_profile_id);
      if (!currentProfile) break;
    }
  } catch (error) {
    failureCode = error instanceof OptimizerRunError ? error.code : FAILURE_CODES.unexpected;
    outcome = 'unknown';
    verified = false;
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
  const selected = currentProfile || executors.find((profile) => scenario.candidate_executors.includes(profile.profile_id));
  const adapter = finalAdapter || {
    profile_id: selected.profile_id,
    requested_model: selected.model,
    observed_model: null,
    model_proof_status: 'unknown',
    receipt_status: 'unknown',
  };
  return {
    schema: 1,
    evidence_kind: 'actual-run',
    scenario_set_id: scenarioSetIdentity(scenarios),
    metric_set_id: metricSetIdentity(),
    scenario_id: scenario.id,
    category: scenario.category,
    holdout: scenario.holdout,
    policy_id: policyId,
    repetition,
    decision_id: decision ? decision.decision_id : `sha256:${'0'.repeat(64)}`,
    selected_profile_id: selected.profile_id,
    observed_profile_id: adapter.profile_id,
    requested_model: adapter.requested_model,
    observed_model: adapter.observed_model,
    model_proof_status: adapter.model_proof_status,
    started_at: startedAt,
    duration_ms: Date.now() - started,
    outcome,
    verified,
    attempts: Math.max(1, attempts),
    human_interventions: humanInterventions,
    topology: decision ? decision.topology : 'single',
    cost: sumAttemptCosts(costs),
    artifact_paths: artifactPaths,
    verification_receipts: verificationReceipts,
    receipt_status: adapter.receipt_status,
    adversarial_result: scenario.adversarial_case === null ? null : verified ? 'detected' : 'unknown',
    failure_code: failureCode,
    attestation: null,
  };
}

module.exports = Object.freeze({
  ADAPTER_FIELDS,
  FAILURE_CODES,
  OptimizerRunError,
  assertActualReady,
  adapterSourceDigest,
  changedArtifacts,
  redactDiagnosticText,
  runScenario,
  sumAttemptCosts,
  validateAdapterOutput,
  verificationReceipt,
});

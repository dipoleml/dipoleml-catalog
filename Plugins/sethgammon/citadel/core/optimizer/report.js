'use strict';

const crypto = require('crypto');
const {
  POLICY_IDS,
  canonical,
  digest,
  executorSetIdentity,
  metricSetIdentity,
  scenarioSetIdentity,
  validateBenchmarkShape,
  validateFreeze,
  validateRun,
} = require('./contracts');
const { validateExecutorBindings } = require('./executor-binding');
const {
  externalReproductionDigest,
  validateExternalReproduction,
} = require('./external-reproduction');
const { matrixAuthorizationCoversRuns } = require('./matrix-authorization');

function rounded(value) {
  return value === null ? null : Number(value.toFixed(6));
}

function median(values) {
  if (!values.length) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function verifiedPass(run) {
  return run.outcome === 'passed'
    && run.verified
    && run.model_proof_status === 'passed'
    && run.receipt_status === 'verified';
}

function unsignedRun(run) {
  return { ...run, attestation: null };
}

function attestRun(run, privateKey) {
  const key = privateKey && privateKey.type === 'private' ? privateKey : crypto.createPrivateKey(privateKey);
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('Optimizer attestation requires an Ed25519 private key');
  const candidate = { ...run, evidence_kind: 'actual-run', attestation: { algorithm: 'ed25519', signature_base64: 'AA==' } };
  validateRun(candidate);
  const unsigned = unsignedRun(candidate);
  const signature = crypto.sign(null, Buffer.from(canonical(unsigned)), key).toString('base64');
  return validateRun({ ...unsigned, attestation: { algorithm: 'ed25519', signature_base64: signature } });
}

function verifyRunAttestation(run, publicKey) {
  try {
    validateRun(run);
    if (run.evidence_kind !== 'actual-run') return false;
    const key = publicKey && publicKey.type === 'public' ? publicKey : crypto.createPublicKey(publicKey);
    return key.asymmetricKeyType === 'ed25519'
      && crypto.verify(
        null,
        Buffer.from(canonical(unsignedRun(run))),
        key,
        Buffer.from(run.attestation.signature_base64, 'base64'),
      );
  } catch {
    return false;
  }
}

function aggregate(runs) {
  const passes = runs.filter(verifiedPass).length;
  const knownCosts = runs.filter((run) => run.cost.status === 'known').map((run) => run.cost.amount_usd);
  const unknownCostRuns = runs.length - knownCosts.length;
  const totalKnownCost = knownCosts.reduce((sum, amount) => sum + amount, 0);
  const allCostKnown = unknownCostRuns === 0;
  return Object.freeze({
    runs: runs.length,
    verified_completions: passes,
    verified_completion_rate: runs.length ? rounded(passes / runs.length) : null,
    known_cost_runs: knownCosts.length,
    unknown_cost_runs: unknownCostRuns,
    known_cost_rate: runs.length ? rounded(knownCosts.length / runs.length) : null,
    total_cost_usd: allCostKnown ? rounded(totalKnownCost) : null,
    total_known_cost_usd: rounded(totalKnownCost),
    median_cost_usd: allCostKnown ? rounded(median(knownCosts)) : null,
    median_known_cost_usd: rounded(median(knownCosts)),
    effective_cost_per_verified_completion: allCostKnown && passes > 0 ? rounded(totalKnownCost / passes) : null,
    median_duration_ms: rounded(median(runs.map((run) => run.duration_ms))),
    total_human_interventions: runs.reduce((sum, run) => sum + run.human_interventions, 0),
    total_attempts: runs.reduce((sum, run) => sum + run.attempts, 0),
    adversarial_cases: runs.filter((run) => run.adversarial_result !== null).length,
    adversarial_false_passes: runs.filter((run) => run.adversarial_result === 'false_pass').length,
  });
}

function costReduction(baseline, candidate) {
  if (baseline.median_cost_usd === null || candidate.median_cost_usd === null || baseline.median_cost_usd === 0) return null;
  return rounded((baseline.median_cost_usd - candidate.median_cost_usd) / baseline.median_cost_usd);
}

function expectedMatrix(freeze, scenarios) {
  const keys = new Set();
  for (const scenario of scenarios) {
    for (const policy of freeze.policies) {
      for (let repetition = 1; repetition <= freeze.repetitions; repetition += 1) {
        keys.add(`${scenario.id}/${policy}/${repetition}`);
      }
    }
  }
  return keys;
}

function validateMatrix(runs, freeze, scenarios) {
  const expected = expectedMatrix(freeze, scenarios);
  const seen = new Set();
  for (const run of runs) {
    const key = `${run.scenario_id}/${run.policy_id}/${run.repetition}`;
    if (seen.has(key)) throw new Error(`Duplicate optimizer run: ${key}`);
    if (!expected.has(key)) throw new Error(`Run is outside the frozen optimizer matrix: ${key}`);
    seen.add(key);
  }
  if (seen.size !== expected.size) {
    const missing = [...expected].filter((key) => !seen.has(key)).slice(0, 5);
    throw new Error(`Optimizer run matrix is incomplete: ${missing.join(', ')}`);
  }
}

function validateRunBindings(runs, scenarios, freeze, executors) {
  const manifests = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  const profiles = new Map(executors.map((executor) => [executor.profile_id, executor]));
  for (const run of runs) {
    const scenario = manifests.get(run.scenario_id);
    if (!scenario) throw new Error(`Run references unknown scenario: ${run.scenario_id}`);
    if (run.scenario_set_id !== freeze.scenario_set_id) throw new Error(`${run.scenario_id} run scenario_set_id mismatch`);
    if (run.metric_set_id !== freeze.metric_set_id) throw new Error(`${run.scenario_id} run metric_set_id mismatch`);
    if (run.category !== scenario.category || run.holdout !== scenario.holdout) {
      throw new Error(`${run.scenario_id} run does not match frozen scenario`);
    }
    if (!scenario.candidate_executors.includes(run.selected_profile_id)
      || !profiles.has(run.selected_profile_id)
      || !profiles.has(run.observed_profile_id)) {
      throw new Error(`${run.scenario_id} run references an unfrozen executor`);
    }
    if (run.requested_model !== profiles.get(run.selected_profile_id).model) {
      throw new Error(`${run.scenario_id} requested model does not match the frozen executor`);
    }
    if (run.model_proof_status === 'passed'
      && run.observed_model !== profiles.get(run.observed_profile_id).model) {
      throw new Error(`${run.scenario_id} observed model does not match the frozen executor`);
    }
    if (run.adversarial_result !== null && scenario.adversarial_case === null) {
      throw new Error(`${run.scenario_id} run fabricates an adversarial case`);
    }
    if (run.evidence_kind === 'actual-run'
      && run.cost.pricing_snapshot_digest !== null
      && run.cost.pricing_snapshot_digest !== freeze.pricing_snapshot_digest) {
      throw new Error(`${run.scenario_id} run pricing snapshot does not match the freeze`);
    }
  }
}

function performanceGate(policy, heldOut) {
  const frontier = heldOut['always-frontier'];
  const prompt = heldOut['prompt-only'];
  const adaptive = heldOut.adaptive;
  const reduction = costReduction(frontier, adaptive);
  const noLoss = adaptive.verified_completions >= frontier.verified_completions;
  const beatsPrompt = adaptive.verified_completion_rate > prompt.verified_completion_rate
    || (adaptive.verified_completion_rate === prompt.verified_completion_rate
      && adaptive.effective_cost_per_verified_completion !== null
      && prompt.effective_cost_per_verified_completion !== null
      && adaptive.effective_cost_per_verified_completion < prompt.effective_cost_per_verified_completion);
  const noUnknownEconomicInputs = frontier.unknown_cost_runs === 0 && adaptive.unknown_cost_runs === 0;
  const noFalsePasses = policy.adversarial_false_passes === 0;
  return Object.freeze({
    status: reduction !== null
      && reduction >= 0.20
      && noLoss
      && beatsPrompt
      && noUnknownEconomicInputs
      && noFalsePasses ? 'passed' : 'open',
    median_cost_reduction_vs_frontier: reduction,
    median_cost_reduction_threshold: 0.20,
    no_loss_of_held_out_verified_completions: noLoss,
    adaptive_beats_prompt_only: beatsPrompt,
    unknown_cost_excluded_from_savings: noUnknownEconomicInputs,
    adversarial_false_passes: policy.adversarial_false_passes,
  });
}

function buildReport(inputRuns, options = {}) {
  if (!Array.isArray(options.scenarios) || !Array.isArray(options.executors) || !options.freeze) {
    throw new Error('Optimizer report requires frozen scenarios, executors, and freeze record');
  }
  const scenarios = options.scenarios;
  const executors = options.executors;
  validateBenchmarkShape(scenarios, executors);
  const freeze = validateFreeze(options.freeze, scenarios, executors);
  if (freeze.executor_set_id !== executorSetIdentity(executors)
    || freeze.scenario_set_id !== scenarioSetIdentity(scenarios)
    || freeze.metric_set_id !== metricSetIdentity()) {
    throw new Error('Optimizer freeze identity mismatch');
  }
  const runs = inputRuns.map((run, index) => validateRun(run, `runs[${index}]`))
    .sort((left, right) => canonical([
      left.scenario_id,
      left.policy_id,
      left.repetition,
    ]).localeCompare(canonical([
      right.scenario_id,
      right.policy_id,
      right.repetition,
    ])));
  validateMatrix(runs, freeze, scenarios);
  validateRunBindings(runs, scenarios, freeze, executors);

  const policies = Object.fromEntries(POLICY_IDS.map((policyId) => [
    policyId,
    aggregate(runs.filter((run) => run.policy_id === policyId)),
  ]));
  const heldOut = Object.fromEntries(POLICY_IDS.map((policyId) => [
    policyId,
    aggregate(runs.filter((run) => run.policy_id === policyId && run.holdout)),
  ]));
  const adversarialFalsePasses = runs.filter((run) => run.adversarial_result === 'false_pass').length;
  const engineeringGate = Object.freeze({
    status: adversarialFalsePasses === 0 ? 'passed' : 'failed',
    frozen_matrix_complete: true,
    strict_cost_provenance: true,
    unknown_cost_is_not_zero: true,
    adversarial_false_passes: adversarialFalsePasses,
  });
  const preliminary = performanceGate({ adversarial_false_passes: adversarialFalsePasses }, heldOut);
  const evidenceKinds = [...new Set(runs.map((run) => run.evidence_kind))].sort();
  const actualOnly = evidenceKinds.length === 1 && evidenceKinds[0] === 'actual-run';
  const actualAttested = actualOnly
    && freeze.attestation_public_key !== null
    && runs.every((run) => verifyRunAttestation(run, freeze.attestation_public_key));
  const matrixQuotaAuthorizationVerified = Boolean(actualOnly
    && options.matrixAuthorization
    && matrixAuthorizationCoversRuns(
      options.matrixAuthorization,
      freeze,
      scenarios,
      runs,
    ));
  const executorProfilesDeclared = executors.every((executor) => executor.executor_profile_digest !== null);
  const invalidExecutorProfileBindings = executorProfilesDeclared
    ? [...validateExecutorBindings(executors)] : [];
  const executorProfilesBound = executorProfilesDeclared && invalidExecutorProfileBindings.length === 0;
  const executorAdaptersBound = executors.every((executor) => executor.adapter_digest !== null);
  const pricingSnapshotBound = freeze.pricing_snapshot_digest !== null;
  const calibrationBound = freeze.calibration_record_digest !== null;
  let externalReproductionVerified = false;
  if (freeze.external_reproduction_digest !== null && options.externalReproduction) {
    const reproduction = validateExternalReproduction(options.externalReproduction, freeze);
    externalReproductionVerified = externalReproductionDigest(reproduction, freeze)
      === freeze.external_reproduction_digest;
  }
  const exactModelsFrozen = executors.every((executor) => !executor.model.startsWith('runtime-default-'));
  const blockers = [];
  if (!actualOnly) blockers.push('ACTUAL_RUNS_REQUIRED');
  if (!actualAttested) blockers.push('ACTUAL_RUNS_UNATTESTED');
  if (!executorProfilesDeclared) blockers.push('EXECUTOR_PROFILES_UNBOUND');
  if (invalidExecutorProfileBindings.length) blockers.push('EXECUTOR_PROFILE_BINDING_INVALID');
  if (!executorAdaptersBound) blockers.push('EXECUTOR_ADAPTERS_UNBOUND');
  if (!pricingSnapshotBound) blockers.push('PRICING_SNAPSHOT_NOT_FROZEN');
  if (!calibrationBound) blockers.push('CALIBRATION_REQUIRED');
  if (!exactModelsFrozen) blockers.push('EXACT_MODELS_NOT_FROZEN');
  if (freeze.external_scenario === null) blockers.push('EXTERNAL_SCENARIO_NOT_SELECTED');
  if (!matrixQuotaAuthorizationVerified) blockers.push('MATRIX_QUOTA_NOT_APPROVED');
  if (preliminary.status !== 'passed') blockers.push('PRELIMINARY_PERFORMANCE_GATE_OPEN');
  if (engineeringGate.status !== 'passed') blockers.push('ADVERSARIAL_FALSE_PASS');
  return Object.freeze({
    schema: 1,
    kind: 'citadel_optimizer_proof_report',
    report_id: `optimizer-report-${digest(runs)}`,
    scenario_set_id: freeze.scenario_set_id,
    executor_set_id: freeze.executor_set_id,
    metric_set_id: freeze.metric_set_id,
    generated_from_raw_digest: digest(runs),
    generated_at: options.generatedAt || runs.map((run) => run.started_at).sort().at(-1),
    evidence_kind: evidenceKinds.length === 1 ? evidenceKinds[0] : 'mixed',
    frozen_inputs: true,
    policies,
    held_out: heldOut,
    engineering_gate: engineeringGate,
    preliminary_performance_gate: preliminary,
    external_scenario_selected: freeze.external_scenario !== null,
    external_reproduction_verified: externalReproductionVerified,
    matrix_quota_authorization_verified: matrixQuotaAuthorizationVerified,
    actual_run_attestation_verified: actualAttested,
    executor_profiles_bound: executorProfilesBound,
    invalid_executor_profile_bindings: Object.freeze(invalidExecutorProfileBindings),
    executor_adapters_bound: executorAdaptersBound,
    pricing_snapshot_bound: pricingSnapshotBound,
    calibration_record_bound: calibrationBound,
    exact_models_frozen: exactModelsFrozen,
    submission_gate: Object.freeze({
      status: blockers.length === 0 ? 'passed' : 'open',
      blockers: Object.freeze(blockers),
    }),
    claim_status: blockers.length === 0
      ? 'preliminary-performance-supported'
      : 'engineering-contract-only',
    limitations: Object.freeze([
      'Fixture simulations validate contracts and anti-gaming behavior; they are not evidence of model performance or cost savings.',
      'Unknown cost remains unknown and blocks economic claims instead of becoming zero.',
      'Submission requires explicitly authorized, attested actual runs and a publicly selected frozen scenario.',
      'A separately signed third-party rerun is optional and is not required to verify the checked-in evidence.',
    ]),
  });
}

module.exports = Object.freeze({
  aggregate,
  attestRun,
  buildReport,
  costReduction,
  median,
  unsignedRun,
  verifiedPass,
  verifyRunAttestation,
});

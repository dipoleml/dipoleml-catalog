'use strict';

const {
  POLICY_IDS,
  TIERS,
  digest,
  exactFields,
  metricSetIdentity,
  scenarioSetIdentity,
  validateBenchmarkShape,
  validateCost,
  validateExecutorProfile,
  validateRun,
  validateScenario,
} = require('./contracts');
const { fixtureProbe } = require('./probe');
const { TIER_RANK, route } = require('./policy');

const TRUTH_FIELDS = Object.freeze([
  'scenario_id',
  'required_tier',
  'base_frontier_cost_usd',
  'base_duration_ms',
  'probe_facts',
]);
const FACT_FIELDS = Object.freeze([
  'file_count_scanned',
  'bytes_scanned',
  'languages',
  'package_manifests',
  'test_commands',
  'candidate_files',
  'has_ci',
  'has_tests',
]);
const TIER_COST_MULTIPLIER = Object.freeze({
  utility: 0.18,
  workhorse: 0.42,
  frontier: 1,
});
const TIER_DURATION_MULTIPLIER = Object.freeze({
  utility: 0.55,
  workhorse: 0.78,
  frontier: 1,
});
const FIXTURE_PRICING = Object.freeze({
  schema: 1,
  kind: 'non_claim_fixture_pricing',
  utility_multiplier: TIER_COST_MULTIPLIER.utility,
  workhorse_multiplier: TIER_COST_MULTIPLIER.workhorse,
  frontier_multiplier: TIER_COST_MULTIPLIER.frontier,
  notice: 'These deterministic multipliers test report math only. They are not vendor prices or performance evidence.',
});
const FIXTURE_PRICING_DIGEST = digest(FIXTURE_PRICING);
const FIXTURE_EPOCH = Date.parse('2026-01-01T00:00:00.000Z');

function rounded(value) {
  return Number(value.toFixed(6));
}

function validateFacts(value, source) {
  if (!exactFields(value, FACT_FIELDS)) throw new Error(`${source} fields are invalid`);
  for (const field of ['file_count_scanned', 'bytes_scanned']) {
    if (!Number.isInteger(value[field]) || value[field] < 0) throw new Error(`${source}.${field} is invalid`);
  }
  for (const field of ['languages', 'package_manifests', 'test_commands', 'candidate_files']) {
    if (!Array.isArray(value[field]) || value[field].some((item) => typeof item !== 'string' || !item)) {
      throw new Error(`${source}.${field} is invalid`);
    }
  }
  for (const field of ['has_ci', 'has_tests']) {
    if (typeof value[field] !== 'boolean') throw new Error(`${source}.${field} is invalid`);
  }
  return value;
}

function validateFixtureTruth(value, scenarios) {
  if (!value || value.schema !== 1 || !Array.isArray(value.scenarios)
    || !exactFields(value, ['schema', 'scenarios'])) {
    throw new Error('Fixture truth fields are invalid');
  }
  if (value.scenarios.length !== scenarios.length) throw new Error('Fixture truth must cover every scenario');
  const scenarioIds = new Set(scenarios.map((scenario) => scenario.id));
  const seen = new Set();
  for (const [index, truth] of value.scenarios.entries()) {
    if (!exactFields(truth, TRUTH_FIELDS)) throw new Error(`fixture truth[${index}] fields are invalid`);
    if (!scenarioIds.has(truth.scenario_id) || seen.has(truth.scenario_id)) {
      throw new Error(`fixture truth[${index}].scenario_id is invalid`);
    }
    if (!TIERS.includes(truth.required_tier)) throw new Error(`fixture truth[${index}].required_tier is invalid`);
    if (!Number.isFinite(truth.base_frontier_cost_usd) || truth.base_frontier_cost_usd <= 0) {
      throw new Error(`fixture truth[${index}].base_frontier_cost_usd is invalid`);
    }
    if (!Number.isInteger(truth.base_duration_ms) || truth.base_duration_ms <= 0) {
      throw new Error(`fixture truth[${index}].base_duration_ms is invalid`);
    }
    validateFacts(truth.probe_facts, `fixture truth[${index}].probe_facts`);
    seen.add(truth.scenario_id);
  }
  return value;
}

function knownFixtureCost(amount) {
  return validateCost({
    status: 'known',
    amount_usd: rounded(amount),
    provenance: 'price_derived',
    source: 'optimizer_fixture_simulation',
    source_ref: 'benchmarks/optimizer-proof/fixtures/pricing-assumptions.json',
    pricing_snapshot_digest: FIXTURE_PRICING_DIGEST,
    components: [{
      kind: 'model',
      amount_usd: rounded(amount),
      source: 'fixture tier multiplier',
    }],
  });
}

function nextTierProfile(current, executors, candidates) {
  const targetRank = TIER_RANK[current.tier] + 1;
  return executors
    .filter((profile) => candidates.includes(profile.profile_id) && TIER_RANK[profile.tier] === targetRank)
    .sort((left, right) => left.profile_id.localeCompare(right.profile_id))[0] || null;
}

function simulateRun({
  scenario,
  truth,
  executors,
  policyId,
  repetition,
  sequence,
  scenarioSetId,
}) {
  validateScenario(scenario);
  executors.forEach(validateExecutorProfile);
  const probe = fixtureProbe(scenario, truth.probe_facts, {
    observedAt: new Date(FIXTURE_EPOCH + sequence * 1000).toISOString(),
  });
  const decision = route({
    scenario,
    executors,
    policyId,
    probe: policyId === 'adaptive' ? probe : undefined,
  });
  const selected = executors.find((profile) => profile.profile_id === decision.selected_profile_id);
  let observed = selected;
  let attempts = 1;
  let amount = truth.base_frontier_cost_usd * TIER_COST_MULTIPLIER[selected.tier];
  let duration = truth.base_duration_ms * TIER_DURATION_MULTIPLIER[selected.tier];
  if (policyId === 'adaptive' && TIER_RANK[selected.tier] < TIER_RANK[truth.required_tier]) {
    const next = nextTierProfile(selected, executors, scenario.candidate_executors);
    if (next) {
      observed = next;
      attempts += 1;
      amount += truth.base_frontier_cost_usd * TIER_COST_MULTIPLIER[next.tier];
      duration += truth.base_duration_ms * TIER_DURATION_MULTIPLIER[next.tier];
    }
  }
  const passed = TIER_RANK[observed.tier] >= TIER_RANK[truth.required_tier];
  const jitter = 1 + ((repetition - 2) * 0.02);
  amount *= jitter;
  duration *= jitter;
  return validateRun({
    schema: 1,
    evidence_kind: 'fixture-simulation',
    scenario_set_id: scenarioSetId,
    metric_set_id: metricSetIdentity(),
    scenario_id: scenario.id,
    category: scenario.category,
    holdout: scenario.holdout,
    policy_id: policyId,
    repetition,
    decision_id: decision.decision_id,
    selected_profile_id: selected.profile_id,
    observed_profile_id: observed.profile_id,
    requested_model: selected.model,
    observed_model: observed.model,
    model_proof_status: 'passed',
    started_at: new Date(FIXTURE_EPOCH + sequence * 1000).toISOString(),
    duration_ms: Math.round(duration),
    outcome: passed ? 'passed' : 'failed',
    verified: passed,
    attempts,
    human_interventions: passed || policyId === 'adaptive' ? 0 : 1,
    topology: decision.topology,
    cost: knownFixtureCost(amount),
    artifact_paths: passed ? scenario.expected_artifacts : [],
    verification_receipts: [{
      attempt: attempts,
      profile_id: observed.profile_id,
      status: passed ? 'passed' : 'failed',
      exit_code: passed ? 0 : 1,
      timed_out: false,
      output_digest: digest(`fixture verification ${passed ? 'passed' : 'failed'}`),
      output_excerpt: `fixture verification ${passed ? 'passed' : 'failed'}`,
      output_truncated: false,
      patch_exit_code: 0,
      patch_digest: digest('fixture patch'),
      patch_excerpt: 'fixture patch',
      patch_truncated: false,
      changed_paths: passed ? scenario.expected_artifacts : [],
    }],
    receipt_status: 'verified',
    adversarial_result: scenario.adversarial_case === null ? null : passed ? 'detected' : 'unknown',
    failure_code: passed ? null : 'VERIFICATION_FAILED',
    attestation: null,
  });
}

function generateFixtureRuns(scenarios, executors, fixtureTruth, repetitions = 3) {
  scenarios.forEach(validateScenario);
  executors.forEach(validateExecutorProfile);
  validateBenchmarkShape(scenarios, executors);
  const truth = validateFixtureTruth(fixtureTruth, scenarios);
  if (!Number.isInteger(repetitions) || repetitions < 3) {
    throw new Error('Optimizer fixture simulation requires at least 3 repetitions');
  }
  const byScenario = new Map(truth.scenarios.map((entry) => [entry.scenario_id, entry]));
  const scenarioSetId = scenarioSetIdentity(scenarios);
  const runs = [];
  let sequence = 0;
  for (const scenario of scenarios) {
    for (const policyId of POLICY_IDS) {
      for (let repetition = 1; repetition <= repetitions; repetition += 1) {
        runs.push(simulateRun({
          scenario,
          truth: byScenario.get(scenario.id),
          executors,
          policyId,
          repetition,
          sequence,
          scenarioSetId,
        }));
        sequence += 1;
      }
    }
  }
  return runs;
}

module.exports = Object.freeze({
  FIXTURE_PRICING,
  FIXTURE_PRICING_DIGEST,
  TIER_COST_MULTIPLIER,
  generateFixtureRuns,
  knownFixtureCost,
  simulateRun,
  validateFixtureTruth,
});

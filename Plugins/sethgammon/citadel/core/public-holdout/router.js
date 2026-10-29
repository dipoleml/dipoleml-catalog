'use strict';

const { digest } = require('../operation-control/contracts');
const { calibratedPrediction, routeOperation } = require('../operation-controller/controller');

const PLAN_IDS = Object.freeze({
  local3: 'qwen-3b',
  local7: 'qwen-7b',
  cloud: 'claude-sonnet',
});

const ROUTING = Object.freeze({
  prior: Object.freeze({ success_probability: 0.5, strength: 1, source: 'symmetric-beta-half-neutral-prior' }),
  quality_rule: 'direct-Claude conservative probability in the same frozen feature stratum, floored at 0.10',
  candidate_rule: 'lowest expected marginal cost path meeting the calibrated direct-Claude quality target; otherwise highest conservative quality',
  feature_rule: 'language plus issue word count at or below 150 versus above 150; derived before model execution',
  recovery_rule: 'advance only after official hidden-test failure; stop at first verified pass',
});

function known(amount, source, basis = 'estimate') {
  return { status: 'known', amount_usd: amount, basis, source };
}

function unknown(source, basis = 'estimate') {
  return { status: 'unknown', amount_usd: null, basis, source };
}

function plan({ planId, label, adapterId, model, fallbackPlanIds, expectedDurationMs, estimatedMarginalUsd }) {
  return {
    plan_id: planId,
    label,
    adapter_id: adapterId,
    topology: 'direct',
    model,
    tools: [],
    privacy: fallbackPlanIds.length ? 'allow-remote' : (adapterId === 'ollama' ? 'local-only' : 'allow-remote'),
    feature_keys: [],
    prior: ROUTING.prior,
    expected_duration_ms: expectedDurationMs,
    costs: {
      actual_cash: adapterId === 'ollama' ? known(0, 'self-hosted-existing-hardware', 'not-applicable') : unknown('subscription-not-allocated-per-operation', 'subscription'),
      marginal: known(estimatedMarginalUsd, 'frozen-preflight-estimate'),
      market_equivalent: adapterId === 'ollama' ? unknown('no-frozen-market-equivalent') : known(estimatedMarginalUsd, 'provider-reported-equivalent-estimate'),
    },
    retry_on: [],
    max_retries: 0,
    fallback_plan_ids: fallbackPlanIds,
  };
}

function catalog() {
  return Object.freeze({
    schema: 1,
    catalog_id: 'public-holdout-v1',
    adapters: {
      ollama: { protocol: 'citadel-operation-adapter-v1', executable: 'ollama', args: [], timeout_ms: 300000, environment_allowlist: [] },
      claude: { protocol: 'citadel-operation-adapter-v1', executable: 'claude', args: [], timeout_ms: 300000, environment_allowlist: [] },
    },
    plans: [
      plan({ planId: PLAN_IDS.local3, label: 'Qwen 2.5 Coder 3B, then 7B, then Claude', adapterId: 'ollama', model: 'qwen2.5-coder:3b', fallbackPlanIds: [PLAN_IDS.local7], expectedDurationMs: 45000, estimatedMarginalUsd: 0.0002 }),
      plan({ planId: PLAN_IDS.local7, label: 'Qwen 2.5 Coder 7B, then Claude', adapterId: 'ollama', model: 'qwen2.5-coder:7b', fallbackPlanIds: [PLAN_IDS.cloud], expectedDurationMs: 90000, estimatedMarginalUsd: 0.0005 }),
      plan({ planId: PLAN_IDS.cloud, label: 'Claude Sonnet direct', adapterId: 'claude', model: 'claude-sonnet-5', fallbackPlanIds: [], expectedDurationMs: 90000, estimatedMarginalUsd: 0.08 }),
    ],
  });
}

function controllerHistory(calibrationAttempts) {
  return calibrationAttempts.map((attempt) => ({
    schema: 1,
    feature_key: attempt.feature_key,
    plan_id: attempt.plan_id,
    verification_status: attempt.verification_status,
    duration_ms: attempt.duration_ms,
    costs: attempt.costs,
    observed_tools: [],
  }));
}

function directClaudeTarget(featureKey, history, operationCatalog = catalog()) {
  const cloud = operationCatalog.plans.find((entry) => entry.plan_id === PLAN_IDS.cloud);
  const prediction = calibratedPrediction(cloud, { feature_key: featureKey }, history);
  return Number(Math.max(0.10, prediction.conservative_probability).toFixed(6));
}

function requestFor(task, qualityTarget) {
  return Object.freeze({
    schema: 2,
    operation_id: `swe-${digest(task.instance_id).slice(7, 31)}`,
    objective: task.problem_statement,
    feature_key: task.public_features.feature_key,
    quality_target: qualityTarget,
    constraints: {
      privacy: 'allow-remote',
      allowed_tools: [],
      required_tools: [],
      max_duration_ms: 900000,
      budgets: { actual_cash: null, marginal: null, market_equivalent: null },
      unknown_cost_policy: 'allow',
    },
    verifier: { kind: 'adapter-result' },
  });
}

function routeTask(task, calibrationAttempts, operationCatalog = catalog()) {
  const history = controllerHistory(calibrationAttempts);
  const qualityTarget = directClaudeTarget(task.public_features.feature_key, history, operationCatalog);
  const request = requestFor(task, qualityTarget);
  const decision = routeOperation({ request, catalog: operationCatalog, history });
  return Object.freeze({
    schema: 1,
    kind: 'citadel_public_holdout_route',
    instance_id: task.instance_id,
    feature_key: task.public_features.feature_key,
    quality_target_source: ROUTING.quality_rule,
    decision,
  });
}

module.exports = Object.freeze({
  PLAN_IDS,
  ROUTING,
  catalog,
  controllerHistory,
  directClaudeTarget,
  requestFor,
  routeTask,
});

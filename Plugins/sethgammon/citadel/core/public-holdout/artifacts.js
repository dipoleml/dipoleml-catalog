'use strict';

const { digest } = require('../operation-control/contracts');
const { signPayload, verifySignature } = require('../operation-control/receipt');
const { assignGoldValidTasks } = require('./selection');
const { PLAN_IDS, routeTask } = require('./router');
const { analyzePaired, pointEstimate } = require('./statistics');

function artifactPayload(value) {
  const payload = { ...value };
  delete payload.attestation;
  return payload;
}

function attest(value, privateKey) {
  return Object.freeze({ ...value, attestation: signPayload(value, privateKey) });
}

function verifyAttestation(value, publicKey) {
  if (!value?.attestation || !verifySignature(artifactPayload(value), value.attestation, publicKey)) throw new Error(`${value?.kind || 'artifact'} attestation invalid`);
  return value;
}

function validateSummary(summary, mode) {
  if (!summary || summary.schema !== 1 || summary.kind !== 'citadel_public_holdout_evaluator_summary' || summary.mode !== mode) throw new Error('evaluator summary identity invalid');
  if (summary.summary_id !== digest({ ...summary, summary_id: null })) throw new Error(`evaluator summary digest invalid: ${summary.instance_id}`);
  return summary;
}

function buildPreflight(selection, summaries, privateKey) {
  const seen = new Set();
  const tasks = summaries.map((summary) => {
    validateSummary(summary, 'gold');
    if (seen.has(summary.instance_id)) throw new Error(`duplicate gold summary: ${summary.instance_id}`);
    seen.add(summary.instance_id);
    return { instance_id: summary.instance_id, repo: summary.repo, split: summary.split, feature_key: summary.feature_key, attempts: summary.attempts.length, passes: summary.passes, failures: summary.failures, errors: summary.errors, evaluator_summary_id: summary.summary_id };
  }).sort((left, right) => left.instance_id.localeCompare(right.instance_id));
  const unsigned = { schema: 1, kind: 'citadel_public_holdout_gold_preflight', preflight_id: null, selection_id: selection.selection_id, evaluator_commit: '70ec57e852e3f2d195790fe71f553e272c691833', tasks };
  const payload = { ...unsigned, preflight_id: digest(unsigned) };
  return attest(payload, privateKey);
}

function buildAssignment(selection, preflight, privateKey) {
  const payload = assignGoldValidTasks(selection, preflight);
  return attest(payload, privateKey);
}

function buildVisibleArtifact(selection, assignment, tasks, privateKey) {
  const assigned = [...assignment.assignments.calibration, ...assignment.assignments.evaluation];
  const byId = new Map(tasks.map((task) => [task.instance_id, task]));
  const visible = assigned.map((instanceId) => {
    const task = byId.get(instanceId);
    if (!task) throw new Error(`visible task missing: ${instanceId}`);
    return task;
  });
  const unsigned = { schema: 1, kind: 'citadel_public_holdout_visible_tasks', artifact_id: null, selection_id: selection.selection_id, assignment_id: assignment.assignment_id, tasks: visible };
  return attest({ ...unsigned, artifact_id: digest(unsigned) }, privateKey);
}

function signAttempt(attempt, request, privateKey) {
  if (attempt.attempt_id !== digest({ ...attempt, attempt_id: null })) throw new Error(`attempt digest invalid: ${attempt.instance_id}`);
  const signed = attest(attempt, privateKey);
  verifyAttestation(signed, request.attestation_public_key);
  return signed;
}

function buildPredictionEvidence({ phase, planId, attempts, predictionDigest, privateKey }) {
  const unsigned = { schema: 1, kind: 'citadel_public_holdout_prediction_evidence', evidence_id: null, phase, plan_id: planId, prediction_digest: predictionDigest, attempts: attempts.map((attempt) => ({ instance_id: attempt.instance_id, attempt_id: attempt.attempt_id, generated_patch_digest: attempt.generated_patch_digest, execution_status: attempt.execution_evidence.status })) };
  return attest({ ...unsigned, evidence_id: digest(unsigned) }, privateKey);
}

function verdictFromSummary(summary) {
  validateSummary(summary, 'prediction');
  if (summary.attempts.length !== 1) throw new Error(`prediction summary must contain one evaluator attempt: ${summary.instance_id}`);
  return summary.attempts[0].status === 'passed' ? 'passed' : summary.attempts[0].status === 'failed' ? 'failed' : 'unknown';
}

function buildVerdictBundle({ phase, planId, attempts, summaries, privateKey }) {
  const byId = new Map(summaries.map((summary) => [summary.instance_id, summary]));
  const verdicts = attempts.map((attempt) => {
    const summary = byId.get(attempt.instance_id);
    if (!summary) throw new Error(`evaluator summary missing: ${attempt.instance_id}`);
    return { instance_id: attempt.instance_id, attempt_id: attempt.attempt_id, verification_status: verdictFromSummary(summary), evaluator_summary_id: summary.summary_id, evaluator_summary_digest: digest(summary) };
  });
  const unsigned = { schema: 1, kind: 'citadel_public_holdout_verdict_bundle', bundle_id: null, phase, plan_id: planId, verdicts };
  return attest({ ...unsigned, bundle_id: digest(unsigned) }, privateKey);
}

function controllerCosts(attempt) {
  const comparison = attempt.economics.comparison_cost;
  const known = comparison && Number.isFinite(comparison.amount_usd);
  const basis = comparison?.status === 'provider-reported-equivalent' ? 'observed' : 'observed';
  return {
    actual_cash: attempt.economics.actual_subscription_cash.status === 'not-applicable'
      ? { status: 'known', amount_usd: 0, basis: 'not-applicable', source: attempt.economics.actual_subscription_cash.source || 'self-hosted-local-model' }
      : { status: 'unknown', amount_usd: null, basis: 'subscription', source: attempt.economics.actual_subscription_cash.source || 'subscription-not-allocated' },
    marginal: known ? { status: 'known', amount_usd: comparison.amount_usd, basis, source: comparison.source } : { status: 'unknown', amount_usd: null, basis: 'estimate', source: comparison?.source || 'comparison-cost-missing' },
    market_equivalent: known ? { status: 'known', amount_usd: comparison.amount_usd, basis, source: comparison.source } : { status: 'unknown', amount_usd: null, basis: 'estimate', source: comparison?.source || 'comparison-cost-missing' },
  };
}

function calibrationHistory(attemptSets, verdictBundles, visibleTasks) {
  const featureById = new Map(visibleTasks.map((task) => [task.instance_id, task.public_features.feature_key]));
  const verdictByAttempt = new Map(verdictBundles.flatMap((bundle) => bundle.verdicts.map((verdict) => [verdict.attempt_id, verdict])));
  return attemptSets.flatMap((attempts) => attempts.map((attempt) => {
    const verdict = verdictByAttempt.get(attempt.attempt_id);
    if (!verdict) throw new Error(`calibration verdict missing: ${attempt.attempt_id}`);
    return { feature_key: featureById.get(attempt.instance_id), plan_id: attempt.plan_id, verification_status: verdict.verification_status, duration_ms: attempt.duration_ms, costs: controllerCosts(attempt) };
  }));
}

function buildRouteLedger({ assignment, visibleTasks, calibrationAttemptSets, calibrationVerdictBundles, privateKey }) {
  const evaluationIds = new Set(assignment.assignments.evaluation);
  const calibrationAttempts = calibrationHistory(calibrationAttemptSets, calibrationVerdictBundles, visibleTasks);
  const routes = visibleTasks.filter((task) => evaluationIds.has(task.instance_id)).map((task) => routeTask(task, calibrationAttempts));
  const unsigned = { schema: 1, kind: 'citadel_public_holdout_route_ledger', ledger_id: null, assignment_id: assignment.assignment_id, calibration_history_digest: digest(calibrationAttempts), calibration_records: calibrationAttempts.length, routes };
  return attest({ ...unsigned, ledger_id: digest(unsigned) }, privateKey);
}

function outcome(path, attemptsByPlan, verdictsByPlan) {
  const visited = [];
  let terminal = 'failed';
  for (const planId of path) {
    const attempt = attemptsByPlan.get(planId);
    const verdict = verdictsByPlan.get(planId);
    if (!attempt || !verdict) throw new Error(`attempt or verdict missing for ${planId}`);
    visited.push({ plan_id: planId, attempt_id: attempt.attempt_id, verification_status: verdict.verification_status, comparison_cost_usd: attempt.economics.comparison_cost.amount_usd });
    if (verdict.verification_status === 'passed') { terminal = 'passed'; break; }
    if (verdict.verification_status === 'unknown') { terminal = 'unknown'; break; }
  }
  const amounts = visited.map((attempt) => attempt.comparison_cost_usd);
  return { status: terminal, visited_attempts: visited, comparison_cost_usd: amounts.every(Number.isFinite) ? Number(amounts.reduce((sum, value) => sum + value, 0).toFixed(9)) : null };
}

function buildAnalysis({ assignment, visibleTasks, routeLedger, evaluationAttemptSets, evaluationVerdictBundles, privateKey }) {
  const evaluationIds = new Set(assignment.assignments.evaluation);
  const attemptsByTask = new Map();
  for (const attempt of evaluationAttemptSets.flat()) {
    if (!attemptsByTask.has(attempt.instance_id)) attemptsByTask.set(attempt.instance_id, new Map());
    attemptsByTask.get(attempt.instance_id).set(attempt.plan_id, attempt);
  }
  const verdictsByTask = new Map();
  for (const bundle of evaluationVerdictBundles) for (const verdict of bundle.verdicts) {
    if (!verdictsByTask.has(verdict.instance_id)) verdictsByTask.set(verdict.instance_id, new Map());
    verdictsByTask.get(verdict.instance_id).set(bundle.plan_id, verdict);
  }
  const routeById = new Map(routeLedger.routes.map((route) => [route.instance_id, route]));
  const rows = visibleTasks.filter((task) => evaluationIds.has(task.instance_id)).map((task) => {
    const attempts = attemptsByTask.get(task.instance_id); const verdicts = verdictsByTask.get(task.instance_id); const route = routeById.get(task.instance_id);
    if (!attempts || !verdicts || !route) throw new Error(`evaluation evidence incomplete: ${task.instance_id}`);
    return { instance_id: task.instance_id, repo: task.repo, feature_key: task.public_features.feature_key, outcomes: { 'always-claude': outcome([PLAN_IDS.cloud], attempts, verdicts), 'static-local-first': outcome([PLAN_IDS.local7, PLAN_IDS.cloud], attempts, verdicts), 'citadel-controller': outcome(route.decision.selected.plan_ids, attempts, verdicts) } };
  });
  const primary = analyzePaired(rows);
  const staticComparison = pointEstimate(rows, 'always-claude', 'static-local-first');
  const executed = evaluationAttemptSets.flat();
  const unsigned = { schema: 1, kind: 'citadel_public_holdout_final_analysis', analysis_id: null, assignment_id: assignment.assignment_id, route_ledger_id: routeLedger.ledger_id, rows, primary, static_comparison: staticComparison, counterfactual_execution_disclosure: { generated_attempts: executed.length, policy_cost_excludes_unvisited_generated_tiers: true, total_observed_generation_comparison_usd: executed.every((attempt) => Number.isFinite(attempt.economics.comparison_cost.amount_usd)) ? Number(executed.reduce((sum, attempt) => sum + attempt.economics.comparison_cost.amount_usd, 0).toFixed(9)) : null }, actual_subscription_cash_status: 'unknown' };
  return attest({ ...unsigned, analysis_id: digest(unsigned) }, privateKey);
}

module.exports = Object.freeze({ artifactPayload, attest, buildAnalysis, buildAssignment, buildPreflight, buildPredictionEvidence, buildRouteLedger, buildVerdictBundle, buildVisibleArtifact, calibrationHistory, controllerCosts, signAttempt, validateSummary, verifyAttestation });

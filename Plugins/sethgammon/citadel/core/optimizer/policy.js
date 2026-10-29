'use strict';

const {
  CAPABILITY_KEYS,
  POLICY_IDS,
  TIERS,
  digest,
  validateDecision,
  validateExecutorProfile,
  validateProbe,
  validateScenario,
} = require('./contracts');
const { planningProfile } = require('./capability-profiles');

const TIER_RANK = Object.freeze({ utility: 0, workhorse: 1, frontier: 2 });
const BASE_NEEDS = Object.freeze({
  code_edit: 0.55,
  repository_reasoning: 0.55,
  long_horizon: 0.15,
  recovery: 0.10,
  parallel_coordination: 0.05,
  safety_boundary: 0.10,
});
const HARD_TASK = /\b(diagnose|trace|architecture|cross[- ]cutting|lifecycle|rollback|reconcile|hardening|across)\b/i;
const RECOVERY_TASK = /\b(recover|recovery|resume|rollback|interrupted|context reset|crash|handoff)\b/i;
const PARALLEL_TASK = /\b(parallel|concurrent|fan[- ]out|several independent|multiple independent)\b/i;
const SAFETY_TASK = /\b(safety|security|protected|permission|traversal|symlink|secret|adversarial|tamper|untrusted)\b/i;

function rounded(value) {
  return Number(value.toFixed(6));
}

function inferTaskNeeds(task, probe = null) {
  const needs = { ...BASE_NEEDS };
  if (HARD_TASK.test(task)) {
    needs.code_edit = 0.70;
    needs.repository_reasoning = 0.80;
    needs.long_horizon = 0.75;
  }
  if (RECOVERY_TASK.test(task)) {
    needs.recovery = 0.85;
    needs.long_horizon = Math.max(needs.long_horizon, 0.70);
  }
  if (PARALLEL_TASK.test(task)) {
    needs.parallel_coordination = 0.85;
    needs.repository_reasoning = Math.max(needs.repository_reasoning, 0.70);
  }
  if (SAFETY_TASK.test(task)) {
    needs.safety_boundary = 0.90;
    needs.repository_reasoning = Math.max(needs.repository_reasoning, 0.70);
  }
  if (probe) {
    validateProbe(probe);
    if (probe.signals.scope === 'cross_cutting') {
      needs.repository_reasoning = Math.max(needs.repository_reasoning, 0.80);
      needs.long_horizon = Math.max(needs.long_horizon, 0.70);
    }
    if (probe.signals.complexity === 'high') {
      needs.code_edit = Math.max(needs.code_edit, 0.70);
      needs.repository_reasoning = Math.max(needs.repository_reasoning, 0.85);
      needs.long_horizon = Math.max(needs.long_horizon, 0.80);
    }
    if (probe.signals.recovery_required) needs.recovery = Math.max(needs.recovery, 0.90);
    if (probe.signals.parallelizable) needs.parallel_coordination = Math.max(needs.parallel_coordination, 0.90);
    if (probe.signals.safety_sensitive) needs.safety_boundary = Math.max(needs.safety_boundary, 0.95);
  }
  return Object.fromEntries(CAPABILITY_KEYS.map((key) => [key, rounded(needs[key])]));
}

function weightedCapability(profile, needs) {
  let weight = 0;
  let score = 0;
  for (const key of CAPABILITY_KEYS) {
    const importance = Math.max(0.05, needs[key]);
    weight += importance;
    score += profile.capabilities[key] * importance;
  }
  return rounded(score / weight);
}

function prediction(profile, needs) {
  const planned = planningProfile(profile);
  const capability = weightedCapability(profile, needs);
  const prior = planned.verified_completion_probability;
  return Object.freeze({
    profile,
    completion: rounded((capability * 0.65) + (prior * 0.35)),
    cost: planned.median_cost_usd,
    source: planned.source,
  });
}

function compareEconomic(left, right) {
  const leftCost = left.cost === null ? Number.POSITIVE_INFINITY : left.cost;
  const rightCost = right.cost === null ? Number.POSITIVE_INFINITY : right.cost;
  if (leftCost !== rightCost) return leftCost - rightCost;
  if (left.completion !== right.completion) return right.completion - left.completion;
  if (TIER_RANK[left.profile.tier] !== TIER_RANK[right.profile.tier]) {
    return TIER_RANK[left.profile.tier] - TIER_RANK[right.profile.tier];
  }
  return left.profile.profile_id.localeCompare(right.profile.profile_id);
}

function compareCapability(left, right) {
  if (left.completion !== right.completion) return right.completion - left.completion;
  return compareEconomic(left, right);
}

function eligibleExecutors(scenario, executors) {
  const allowed = new Set(scenario.candidate_executors);
  const selected = executors.filter((profile) => allowed.has(profile.profile_id));
  if (!selected.length) throw new Error(`No candidate executors are available for ${scenario.id}`);
  return selected;
}

function chooseAlwaysFrontier(predictions) {
  const frontier = predictions.filter((candidate) => candidate.profile.tier === 'frontier').sort(compareCapability);
  return (frontier.length ? frontier : [...predictions].sort(compareCapability))[0];
}

function chooseAlwaysCheap(predictions) {
  const utility = predictions.filter((candidate) => candidate.profile.tier === 'utility').sort(compareEconomic);
  return (utility.length ? utility : [...predictions].sort(compareEconomic))[0];
}

function choosePromptOnly(predictions, needs) {
  const difficult = needs.long_horizon >= 0.70
    || needs.recovery >= 0.80
    || needs.parallel_coordination >= 0.80
    || needs.safety_boundary >= 0.85;
  const threshold = difficult ? 0.74 : 0.62;
  const plausible = predictions.filter((candidate) => candidate.completion >= threshold).sort(compareEconomic);
  return (plausible.length ? plausible : [...predictions].sort(compareCapability))[0];
}

function chooseAdaptive(predictions, needs, probe) {
  const highRisk = needs.long_horizon >= 0.75
    || needs.recovery >= 0.85
    || needs.parallel_coordination >= 0.85
    || needs.safety_boundary >= 0.90;
  const uncertainty = probe ? probe.signals.uncertainty : 1;
  const threshold = highRisk || uncertainty >= 0.50 ? 0.80 : 0.68;
  const plausible = predictions.filter((candidate) => candidate.completion >= threshold).sort(compareEconomic);
  return (plausible.length ? plausible : [...predictions].sort(compareCapability))[0];
}

function topologyFor(needs, scenario) {
  if (needs.parallel_coordination >= 0.80 && scenario.max_agents >= 2) {
    return { topology: 'parallel-2', max_agents: 2 };
  }
  if (needs.recovery >= 0.80) return { topology: 'sequential-recovery', max_agents: 1 };
  return { topology: 'single', max_agents: 1 };
}

function escalationPlan(selected) {
  const steps = [
    { trigger: 'outcome_verified', action: 'stop', target_tier: null },
    { trigger: 'budget_exhausted', action: 'stop', target_tier: null },
  ];
  if (selected.profile.tier === 'utility') {
    steps.push({ trigger: 'no_progress', action: 'escalate', target_tier: 'workhorse' });
    steps.push({ trigger: 'verification_failed', action: 'escalate', target_tier: 'workhorse' });
  } else if (selected.profile.tier === 'workhorse') {
    steps.push({ trigger: 'no_progress', action: 'escalate', target_tier: 'frontier' });
    steps.push({ trigger: 'verification_failed', action: 'escalate', target_tier: 'frontier' });
  } else {
    steps.push({ trigger: 'no_progress', action: 'stop', target_tier: null });
    steps.push({ trigger: 'verification_failed', action: 'stop', target_tier: null });
  }
  return steps;
}

function reasonCodes(policyId, selected, probe) {
  const reasons = [`POLICY_${policyId.toUpperCase().replace(/-/g, '_')}`];
  reasons.push(`SELECTED_${selected.profile.tier.toUpperCase()}`);
  reasons.push(selected.source === 'training_evidence' ? 'TRAINING_EVIDENCE_USED' : 'POLICY_ASSUMPTION_USED');
  if (probe) {
    reasons.push(`PROBE_${probe.status.toUpperCase()}`);
    if (probe.signals.uncertainty >= 0.50) reasons.push('PROBE_UNCERTAINTY_HIGH');
  }
  return reasons;
}

function route(input) {
  const scenario = validateScenario(input.scenario);
  const policyId = input.policyId;
  if (!POLICY_IDS.includes(policyId)) throw new Error(`Unknown optimizer policy: ${policyId}`);
  const executors = input.executors.map((profile) => validateExecutorProfile(profile));
  let probe = null;
  if (policyId === 'adaptive') {
    if (!input.probe) throw new Error('Adaptive policy requires a probe');
    probe = validateProbe(input.probe);
    if (probe.scenario_id !== scenario.id) throw new Error('Probe does not match scenario');
  }
  const needs = inferTaskNeeds(scenario.task, probe);
  const predictions = eligibleExecutors(scenario, executors).map((profile) => prediction(profile, needs));
  let selected;
  if (policyId === 'always-frontier') selected = chooseAlwaysFrontier(predictions);
  else if (policyId === 'always-cheap') selected = chooseAlwaysCheap(predictions);
  else if (policyId === 'prompt-only') selected = choosePromptOnly(predictions, needs);
  else selected = chooseAdaptive(predictions, needs, probe);
  const topology = topologyFor(needs, scenario);
  const unsigned = {
    schema: 1,
    decision_id: null,
    policy_id: policyId,
    scenario_id: scenario.id,
    selected_profile_id: selected.profile.profile_id,
    status: 'planned',
    probe_status: probe ? probe.status : 'not_used',
    required_capabilities: needs,
    predicted_completion_probability: selected.completion,
    predicted_cost_usd: selected.cost,
    prediction_source: selected.source,
    topology: topology.topology,
    max_agents: topology.max_agents,
    reason_codes: reasonCodes(policyId, selected, probe),
    escalation_plan: escalationPlan(selected),
  };
  return validateDecision({ ...unsigned, decision_id: digest(unsigned) });
}

function nextAdaptiveAction(decision, trajectory, executors) {
  validateDecision(decision);
  if (decision.policy_id !== 'adaptive') throw new Error('Trajectory control is only available for the adaptive policy');
  if (!trajectory || typeof trajectory !== 'object' || Array.isArray(trajectory)) throw new Error('trajectory is required');
  const required = ['verification_status', 'progress_status', 'attempts', 'budget_remaining_usd'];
  for (const field of required) if (!(field in trajectory)) throw new Error(`trajectory is missing ${field}`);
  if (!['passed', 'failed', 'unknown'].includes(trajectory.verification_status)) throw new Error('trajectory.verification_status is invalid');
  if (!['progress', 'stalled', 'unknown'].includes(trajectory.progress_status)) throw new Error('trajectory.progress_status is invalid');
  if (!Number.isInteger(trajectory.attempts) || trajectory.attempts < 1) throw new Error('trajectory.attempts is invalid');
  if (trajectory.budget_remaining_usd !== null
    && (!Number.isFinite(trajectory.budget_remaining_usd) || trajectory.budget_remaining_usd < 0)) {
    throw new Error('trajectory.budget_remaining_usd is invalid');
  }
  if (trajectory.verification_status === 'passed') {
    return Object.freeze({ action: 'stop', reason_code: 'OUTCOME_VERIFIED', target_profile_id: null });
  }
  if (trajectory.budget_remaining_usd === 0) {
    return Object.freeze({ action: 'stop', reason_code: 'BUDGET_EXHAUSTED', target_profile_id: null });
  }
  const profiles = executors.map((profile) => validateExecutorProfile(profile));
  const current = profiles.find((profile) => profile.profile_id === decision.selected_profile_id);
  if (!current) return Object.freeze({ action: 'unknown', reason_code: 'CURRENT_PROFILE_MISSING', target_profile_id: null });
  const shouldEscalate = trajectory.verification_status === 'failed' || trajectory.progress_status === 'stalled';
  if (!shouldEscalate) return Object.freeze({ action: 'continue', reason_code: 'BOUNDED_PROGRESS_OBSERVED', target_profile_id: current.profile_id });
  const targetRank = TIER_RANK[current.tier] + 1;
  const target = profiles
    .filter((profile) => TIER_RANK[profile.tier] === targetRank)
    .sort((left, right) => left.profile_id.localeCompare(right.profile_id))[0];
  if (!target) return Object.freeze({ action: 'stop', reason_code: 'NO_HIGHER_TIER_AVAILABLE', target_profile_id: null });
  return Object.freeze({
    action: 'escalate',
    reason_code: trajectory.verification_status === 'failed' ? 'VERIFICATION_FAILED' : 'NO_PROGRESS',
    target_profile_id: target.profile_id,
  });
}

module.exports = Object.freeze({
  TIER_RANK,
  inferTaskNeeds,
  nextAdaptiveAction,
  prediction,
  route,
  weightedCapability,
});

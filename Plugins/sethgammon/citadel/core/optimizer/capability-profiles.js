'use strict';

const {
  CAPABILITY_KEYS,
  validateExecutorProfile,
  validateRun,
} = require('./contracts');

const CATEGORY_CAPABILITIES = Object.freeze({
  short_control: Object.freeze(['code_edit', 'repository_reasoning']),
  long_task: Object.freeze(['code_edit', 'repository_reasoning', 'long_horizon']),
  context_reset: Object.freeze(['repository_reasoning', 'long_horizon', 'recovery']),
  parallel_work: Object.freeze(['repository_reasoning', 'long_horizon', 'parallel_coordination']),
  safety_boundary: Object.freeze(['code_edit', 'repository_reasoning', 'safety_boundary']),
  cleanup: Object.freeze(['repository_reasoning', 'recovery', 'safety_boundary']),
});

const TIER_ASSUMPTIONS = Object.freeze({
  utility: Object.freeze({
    verified_completion_probability: 0.55,
    median_cost_usd: 0.25,
    median_duration_ms: 60000,
    human_intervention_rate: 0.20,
  }),
  workhorse: Object.freeze({
    verified_completion_probability: 0.75,
    median_cost_usd: 1,
    median_duration_ms: 120000,
    human_intervention_rate: 0.10,
  }),
  frontier: Object.freeze({
    verified_completion_probability: 0.90,
    median_cost_usd: 3,
    median_duration_ms: 180000,
    human_intervention_rate: 0.05,
  }),
});

function rounded(value) {
  return Number(value.toFixed(6));
}

function median(values) {
  if (!values.length) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function laplacePassRate(records) {
  const passes = records.filter((record) => record.outcome === 'passed' && record.verified).length;
  return rounded((passes + 1) / (records.length + 2));
}

function capabilityEvidence(records, capability, fallback) {
  const relevant = records.filter((record) => CATEGORY_CAPABILITIES[record.category].includes(capability));
  return relevant.length ? laplacePassRate(relevant) : fallback;
}

function planningProfile(profile) {
  validateExecutorProfile(profile);
  if (profile.priors.source === 'training_evidence') {
    return Object.freeze({
      profile,
      verified_completion_probability: profile.priors.verified_completion_probability,
      median_cost_usd: profile.priors.median_cost_usd,
      median_duration_ms: profile.priors.median_duration_ms,
      human_intervention_rate: profile.priors.human_intervention_rate,
      source: 'training_evidence',
    });
  }
  const assumed = TIER_ASSUMPTIONS[profile.tier];
  return Object.freeze({
    profile,
    ...assumed,
    source: 'policy_assumption',
  });
}

function learnCapabilityProfiles(executors, inputRuns) {
  if (!Array.isArray(executors) || !Array.isArray(inputRuns)) throw new TypeError('executors and runs must be arrays');
  const profiles = executors.map((profile) => validateExecutorProfile(profile));
  const runs = inputRuns.map((record) => validateRun(record));
  if (runs.some((record) => record.holdout)) {
    throw new Error('Held-out runs cannot calibrate capability profiles');
  }
  return profiles.map((profile) => {
    const selected = runs.filter((record) => record.observed_profile_id === profile.profile_id);
    if (!selected.length) return profile;
    const knownCosts = selected.filter((record) => record.cost.status === 'known').map((record) => record.cost.amount_usd);
    const capabilities = Object.fromEntries(CAPABILITY_KEYS.map((capability) => [
      capability,
      capabilityEvidence(selected, capability, profile.capabilities[capability]),
    ]));
    const priors = {
      verified_completion_probability: laplacePassRate(selected),
      median_cost_usd: median(knownCosts),
      median_duration_ms: median(selected.map((record) => record.duration_ms)),
      human_intervention_rate: rounded(mean(selected.map((record) => record.human_interventions))),
      sample_size: selected.length,
      known_cost_sample_size: knownCosts.length,
      source: 'training_evidence',
    };
    return validateExecutorProfile({ ...profile, capabilities, priors });
  });
}

module.exports = Object.freeze({
  CATEGORY_CAPABILITIES,
  TIER_ASSUMPTIONS,
  learnCapabilityProfiles,
  planningProfile,
});

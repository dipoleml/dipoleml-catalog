'use strict';

const crypto = require('crypto');
const { DESIGN } = require('./selection');

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function seedNumber(seed) {
  return crypto.createHash('sha256').update(String(seed)).digest().readUInt32BE(0);
}

function quantile(values, probability) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return lower === upper ? sorted[lower] : sorted[lower] + ((sorted[upper] - sorted[lower]) * (position - lower));
}

function rate(rows, policyId) {
  return rows.filter((row) => row.outcomes[policyId].status === 'passed').length / rows.length;
}

function totalCost(rows, policyId) {
  const costs = rows.map((row) => row.outcomes[policyId].comparison_cost_usd);
  return costs.every(Number.isFinite) ? costs.reduce((sum, value) => sum + value, 0) : null;
}

function pointEstimate(rows, baselineId, candidateId) {
  const baselineRate = rate(rows, baselineId);
  const candidateRate = rate(rows, candidateId);
  const baselineCost = totalCost(rows, baselineId);
  const candidateCost = totalCost(rows, candidateId);
  return {
    baseline_verified_rate: baselineRate,
    candidate_verified_rate: candidateRate,
    paired_quality_difference: candidateRate - baselineRate,
    baseline_comparison_cost_usd: baselineCost,
    candidate_comparison_cost_usd: candidateCost,
    comparison_cost_reduction: baselineCost > 0 && candidateCost !== null ? 1 - (candidateCost / baselineCost) : null,
  };
}

function stratifiedSample(rows, random) {
  const groups = new Map();
  for (const row of rows) {
    const key = row.feature_key;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.values()].flatMap((group) => Array.from({ length: group.length }, () => group[Math.floor(random() * group.length)]));
}

function analyzePaired(rows, { baselineId = 'always-claude', candidateId = 'citadel-controller', seed = 'citadel-public-holdout-statistics-v1', repetitions = DESIGN.bootstrap_repetitions } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) throw new TypeError('paired result rows required');
  for (const row of rows) {
    if (!row.outcomes?.[baselineId] || !row.outcomes?.[candidateId] || typeof row.feature_key !== 'string') throw new Error(`paired outcome missing for ${row.instance_id || 'unknown task'}`);
  }
  const point = pointEstimate(rows, baselineId, candidateId);
  const random = mulberry32(seedNumber(seed));
  const quality = [];
  const cost = [];
  for (let index = 0; index < repetitions; index += 1) {
    const sample = stratifiedSample(rows, random);
    const estimate = pointEstimate(sample, baselineId, candidateId);
    quality.push(estimate.paired_quality_difference);
    if (estimate.comparison_cost_reduction !== null) cost.push(estimate.comparison_cost_reduction);
  }
  const alpha = DESIGN.primary_alpha;
  const qualityInterval = { lower: quantile(quality, alpha / 2), upper: quantile(quality, 1 - (alpha / 2)) };
  const costInterval = cost.length === repetitions ? { lower: quantile(cost, alpha / 2), upper: quantile(cost, 1 - (alpha / 2)) } : { lower: null, upper: null };
  const qualityGate = qualityInterval.lower >= -DESIGN.quality_noninferiority_margin;
  const costGate = qualityGate && costInterval.lower !== null && costInterval.lower > 0;
  const byStratum = Object.fromEntries([...new Set(rows.map((row) => row.feature_key))].sort().map((featureKey) => [featureKey, pointEstimate(rows.filter((row) => row.feature_key === featureKey), baselineId, candidateId)]));
  return Object.freeze({
    schema: 1,
    kind: 'citadel_public_holdout_paired_analysis',
    task_count: rows.length,
    baseline_policy_id: baselineId,
    candidate_policy_id: candidateId,
    point_estimate: point,
    confidence_method: `paired stratified percentile bootstrap, ${repetitions} repetitions, ${(1 - alpha) * 100}% two-sided interval`,
    quality_difference_interval: qualityInterval,
    comparison_cost_reduction_interval: costInterval,
    hierarchical_gates: {
      quality_noninferiority: qualityGate,
      cost_superiority_after_quality: costGate,
      overall: qualityGate && costGate,
    },
    by_feature_stratum: byStratum,
    claim_boundary: 'Comparison cost is not actual subscription cash. Intervals describe this selected task population and execution environment; they do not establish universal model performance.',
  });
}

module.exports = Object.freeze({ analyzePaired, pointEstimate, quantile, seedNumber, stratifiedSample });

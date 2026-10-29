'use strict';

const crypto = require('crypto');
const { canonical, digest } = require('../operation-control/contracts');
const { DATASET } = require('./dataset');

const DRAND_CHAIN = Object.freeze({
  provider: 'league-of-entropy-drand',
  chain_hash: '8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce',
  public_key: '868f005eb8e6e4ca0a47c8a77ceaa5309a47978a7c71bc5cce96366b5d7a569937c529eeda66c7293784a9402801af31',
  period_seconds: 30,
});

const DESIGN = Object.freeze({
  feature_strata: Object.freeze(['js.issue-short', 'js.issue-long', 'ts.issue-short', 'ts.issue-long']),
  calibration_per_feature_stratum: 5,
  evaluation_floor_per_feature_stratum: 8,
  evaluation_total: 60,
  maximum_tasks_per_repo: 5,
  required_gold_passes: 3,
  gold_attempts: 3,
  quality_noninferiority_margin: 0.05,
  bootstrap_repetitions: 20000,
  primary_alpha: 0.05,
  selection_rule: 'sha256(request_id_lf_beacon_randomness_lf_split_lf_instance_id), ascending',
  assignment_rule: 'scan each feature stratum in public order for 5 calibration and 8 evaluation tasks, then fill evaluation to 60 from the remaining global rank-digest order; accept only gold-valid tasks subject to repo cap',
  terminal_rule: 'if quotas cannot be filled from the frozen eligible pool, result is setup-unknown; no outcome-based replacement',
});

function relayUrls(round) {
  return [
    `https://api.drand.sh/public/${round}`,
    `https://api2.drand.sh/public/${round}`,
    `https://drand.cloudflare.com/public/${round}`,
  ];
}

function createSelectionRequest({ pool, round, roundTime, frozenAt = new Date().toISOString(), sourceDigests = {}, attestationPublicKey, supersedesRequestId = null }) {
  if (!pool || typeof pool.pool_id !== 'string') throw new TypeError('candidate pool required');
  if (!Number.isSafeInteger(round) || round < 1) throw new TypeError('future drand round required');
  if (!roundTime || Number.isNaN(Date.parse(roundTime)) || Date.parse(roundTime) <= Date.parse(frozenAt)) throw new Error('drand round must be in the future when frozen');
  const unsigned = {
    schema: 1,
    kind: 'citadel_public_holdout_selection_request',
    request_id: null,
    frozen_at: frozenAt,
    pool_id: pool.pool_id,
    supersedes_request_id: supersedesRequestId,
    eligible_candidate_digests: pool.candidates.filter((candidate) => candidate.eligible).map((candidate) => digest(candidate)).sort(),
    dataset: DATASET,
    design: DESIGN,
    source_digests: sourceDigests,
    attestation_public_key: attestationPublicKey,
    beacon: {
      ...DRAND_CHAIN,
      round,
      round_time: roundTime,
      source_urls: relayUrls(round),
      minimum_identical_sources: 3,
    },
  };
  return Object.freeze({ ...unsigned, request_id: digest(unsigned) });
}

function normalizeBeacon(value) {
  if (!value || !Number.isSafeInteger(value.round)) throw new TypeError('beacon invalid');
  const normalized = {
    round: value.round,
    randomness: String(value.randomness || '').toLowerCase(),
    signature: String(value.signature || '').toLowerCase(),
    previous_signature: String(value.previous_signature || '').toLowerCase(),
  };
  if (!/^[0-9a-f]{64}$/.test(normalized.randomness) || !/^[0-9a-f]{192}$/.test(normalized.signature) || !/^[0-9a-f]{192}$/.test(normalized.previous_signature)) throw new Error('beacon encoding invalid');
  const derived = crypto.createHash('sha256').update(Buffer.from(normalized.signature, 'hex')).digest('hex');
  if (derived !== normalized.randomness) throw new Error('beacon randomness does not match signature digest');
  return normalized;
}

function orderCandidates(request, pool, randomness) {
  if (request.pool_id !== pool.pool_id) throw new Error('selection request does not bind candidate pool');
  return Object.fromEntries(DATASET.splits.map((split) => {
    const candidates = pool.candidates.filter((candidate) => candidate.eligible && candidate.split === split);
    return [split, candidates.map((candidate) => ({
      instance_id: candidate.instance_id,
      repo: candidate.repo,
      feature_key: candidate.public_features.feature_key,
      candidate_digest: digest(candidate),
      rank_digest: digest(`${request.request_id}\n${randomness}\n${split}\n${candidate.instance_id}`),
    })).sort((left, right) => left.rank_digest.localeCompare(right.rank_digest) || left.instance_id.localeCompare(right.instance_id)).map((entry, index) => ({ rank: index + 1, ...entry }))];
  }));
}

function buildSelectionRecord({ request, pool, relayResponses, observedAt = new Date().toISOString() }) {
  if (Date.parse(observedAt) < Date.parse(request.beacon.round_time)) throw new Error('beacon cannot be observed before committed round');
  if (!Array.isArray(relayResponses) || relayResponses.length !== request.beacon.source_urls.length) throw new Error('all committed relays are required');
  const normalized = relayResponses.map((entry, index) => {
    if (!entry || entry.source_url !== request.beacon.source_urls[index]) throw new Error('relay source or order drifted');
    return normalizeBeacon(entry.beacon);
  });
  if (normalized.length < request.beacon.minimum_identical_sources || normalized.some((value) => canonical(value) !== canonical(normalized[0]))) throw new Error('committed drand relays did not agree');
  if (normalized[0].round !== request.beacon.round) throw new Error('drand round mismatch');
  const unsigned = {
    schema: 1,
    kind: 'citadel_public_holdout_selection',
    selection_id: null,
    request_id: request.request_id,
    pool_id: pool.pool_id,
    observed_at: observedAt,
    beacon: normalized[0],
    source_urls: [...request.beacon.source_urls],
    verified_relay_count: normalized.length,
    ordered_candidates: orderCandidates(request, pool, normalized[0].randomness),
  };
  return Object.freeze({ ...unsigned, selection_id: digest(unsigned) });
}

function validateSelectionRecord(record, request, pool) {
  if (!record || record.kind !== 'citadel_public_holdout_selection' || record.request_id !== request.request_id || record.pool_id !== pool.pool_id) throw new Error('selection identity invalid');
  if (record.selection_id !== digest({ ...record, selection_id: null })) throw new Error('selection digest mismatch');
  if (JSON.stringify(record.ordered_candidates) !== JSON.stringify(orderCandidates(request, pool, normalizeBeacon(record.beacon).randomness))) throw new Error('selection order drifted');
  return record;
}

function assignGoldValidTasks(record, preflight) {
  const assignments = { calibration: [], evaluation: [] };
  const decisions = [];
  const repoCounts = new Map();
  const byId = new Map(preflight.tasks.map((task) => [task.instance_id, task]));
  for (const featureKey of DESIGN.feature_strata) {
    const split = featureKey.slice(0, 2);
    let calibrated = 0;
    let evaluated = 0;
    for (const ordered of record.ordered_candidates[split].filter((candidate) => candidate.feature_key === featureKey)) {
      const result = byId.get(ordered.instance_id);
      const repo = result?.repo || ordered.repo;
      let disposition = 'not-preflighted';
      if (result) {
        const valid = result.attempts === DESIGN.gold_attempts && result.passes === DESIGN.required_gold_passes;
        if (!valid) disposition = 'gold-invalid';
        else if ((repoCounts.get(repo) || 0) >= DESIGN.maximum_tasks_per_repo) disposition = 'repo-cap';
        else if (calibrated < DESIGN.calibration_per_feature_stratum) {
          disposition = 'calibration';
          calibrated += 1;
          repoCounts.set(repo, (repoCounts.get(repo) || 0) + 1);
          assignments.calibration.push(ordered.instance_id);
        } else if (evaluated < DESIGN.evaluation_floor_per_feature_stratum) {
          disposition = 'evaluation';
          evaluated += 1;
          repoCounts.set(repo, (repoCounts.get(repo) || 0) + 1);
          assignments.evaluation.push(ordered.instance_id);
        } else disposition = 'unused-valid-reserve';
      }
      decisions.push({ split, feature_key: featureKey, rank: ordered.rank, instance_id: ordered.instance_id, repo, disposition });
      if (calibrated === DESIGN.calibration_per_feature_stratum && evaluated === DESIGN.evaluation_floor_per_feature_stratum) break;
    }
  }
  const assigned = new Set([...assignments.calibration, ...assignments.evaluation]);
  const globalReserve = Object.values(record.ordered_candidates).flat().sort((left, right) => left.rank_digest.localeCompare(right.rank_digest) || left.instance_id.localeCompare(right.instance_id));
  for (const ordered of globalReserve) {
    if (assignments.evaluation.length >= DESIGN.evaluation_total) break;
    if (assigned.has(ordered.instance_id)) continue;
    const result = byId.get(ordered.instance_id);
    const repo = result?.repo || ordered.repo;
    let disposition = 'not-preflighted';
    if (result) {
      const valid = result.attempts === DESIGN.gold_attempts && result.passes === DESIGN.required_gold_passes;
      if (!valid) disposition = 'gold-invalid';
      else if ((repoCounts.get(repo) || 0) >= DESIGN.maximum_tasks_per_repo) disposition = 'repo-cap';
      else {
        disposition = 'evaluation-fill';
        repoCounts.set(repo, (repoCounts.get(repo) || 0) + 1);
        assignments.evaluation.push(ordered.instance_id);
        assigned.add(ordered.instance_id);
      }
    }
    decisions.push({ split: ordered.feature_key.slice(0, 2), feature_key: ordered.feature_key, rank: ordered.rank, instance_id: ordered.instance_id, repo, disposition });
  }
  const complete = assignments.calibration.length === DESIGN.calibration_per_feature_stratum * DESIGN.feature_strata.length && assignments.evaluation.length === DESIGN.evaluation_total;
  const unsigned = {
    schema: 1,
    kind: 'citadel_public_holdout_assignment',
    assignment_id: null,
    selection_id: record.selection_id,
    preflight_id: preflight.preflight_id,
    status: complete ? 'ready' : 'setup-unknown',
    assignments,
    decisions,
  };
  return Object.freeze({ ...unsigned, assignment_id: digest(unsigned) });
}

module.exports = Object.freeze({
  DESIGN,
  DRAND_CHAIN,
  assignGoldValidTasks,
  buildSelectionRecord,
  createSelectionRequest,
  normalizeBeacon,
  orderCandidates,
  relayUrls,
  validateSelectionRecord,
});

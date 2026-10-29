'use strict';

const {
  SCHEMA,
  canonical,
  digest,
  exactFields,
  validateAssignment,
  validateProtocol,
} = require('./trial-contract');

const SPEC_FIELDS = Object.freeze([
  'evidence_kind', 'created_day', 'participant_count', 'metric_set_id',
  'scenario_pairs', 'strata', 'gates', 'randomization_seed',
  'signing_public_key',
]);

function shaIdentity(value) {
  return `sha256:${digest(value)}`;
}

function deterministicNumber(seed, counter) {
  return Number.parseInt(digest(`${seed}:${counter}`).slice(0, 12), 16);
}

function shuffle(values, seed) {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = deterministicNumber(seed, index) % (index + 1);
    [output[index], output[target]] = [output[target], output[index]];
  }
  return output;
}

function assignmentCommitment(assignments) {
  const normalized = [...assignments].sort((left, right) => (
    canonical([
      left.participant_id, left.order, left.assignment_id,
    ]).localeCompare(canonical([
      right.participant_id, right.order, right.assignment_id,
    ]))
  ));
  return shaIdentity(normalized);
}

function protocolIdentity(base) {
  return `protocol-${digest(base).slice(0, 24)}`;
}

function opaqueId(prefix, seed) {
  return `${prefix}-${digest(seed).slice(0, 24)}`;
}

function createPlan(spec) {
  exactFields(spec, SPEC_FIELDS, 'trial plan specification');
  if (typeof spec.randomization_seed !== 'string' || spec.randomization_seed.length < 16) {
    throw new Error('randomization_seed must contain at least 16 characters');
  }
  if (spec.participant_count % spec.scenario_pairs.length !== 0) {
    throw new Error('participant_count must be divisible by scenario pair count');
  }
  const perPair = spec.participant_count / spec.scenario_pairs.length;
  if (perPair % 2 !== 0) throw new Error('each scenario pair requires an even participant count');
  if (spec.participant_count % spec.strata.length !== 0) {
    throw new Error('participant_count must be divisible by stratum count');
  }

  const randomizationDigest = shaIdentity(spec.randomization_seed);
  const base = {
    schema: SCHEMA,
    kind: 'product_proof_protocol_v2',
    evidence_kind: spec.evidence_kind,
    created_day: spec.created_day,
    participant_count: spec.participant_count,
    metric_set_id: spec.metric_set_id,
    scenario_pairs: spec.scenario_pairs,
    strata: spec.strata,
    gates: spec.gates,
    randomization_digest: randomizationDigest,
    signing_public_key: spec.signing_public_key,
  };
  const protocolId = protocolIdentity(base);
  const participantIndexes = shuffle(
    Array.from({ length: spec.participant_count }, (_, index) => index),
    spec.randomization_seed,
  );
  const assignments = [];

  spec.scenario_pairs.forEach((pair, pairIndex) => {
    const indexes = participantIndexes.slice(pairIndex * perPair, (pairIndex + 1) * perPair);
    indexes.forEach((participantIndex, localIndex) => {
      const participantId = opaqueId('participant', `${randomizationDigest}:${participantIndex}`);
      const stratum = spec.strata[participantIndex % spec.strata.length];
      const bareFirst = localIndex % 2 === 0;
      const attempts = bareFirst
        ? [
          { scenario_id: pair.scenario_a, mode: 'bare', order: 1 },
          { scenario_id: pair.scenario_b, mode: 'harnessed', order: 2 },
        ]
        : [
          { scenario_id: pair.scenario_a, mode: 'harnessed', order: 1 },
          { scenario_id: pair.scenario_b, mode: 'bare', order: 2 },
        ];
      attempts.forEach((attempt) => {
        assignments.push({
          schema: SCHEMA,
          kind: 'trial_assignment_v2',
          protocol_id: protocolId,
          assignment_id: opaqueId(
            'attempt',
            `${protocolId}:${participantId}:${attempt.scenario_id}:${attempt.mode}`,
          ),
          participant_id: participantId,
          pair_id: pair.pair_id,
          scenario_id: attempt.scenario_id,
          mode: attempt.mode,
          order: attempt.order,
          runtime_family: stratum.runtime_family,
          model_id: stratum.model_id,
          os_family: stratum.os_family,
        });
      });
    });
  });

  const protocol = validateProtocol({
    ...base,
    protocol_id: protocolId,
    assignment_commitment: assignmentCommitment(assignments),
  });
  assignments.forEach((assignment) => validateAssignment(assignment, protocol));
  const balance = analyzeBalance(protocol, assignments);
  if (!balance.valid) throw new Error(`generated assignment plan is unbalanced: ${balance.errors.join('; ')}`);
  return { protocol, assignments, balance };
}

function analyzeBalance(protocol, assignments) {
  validateProtocol(protocol);
  const errors = [];
  const ids = new Set();
  for (const assignment of assignments) {
    validateAssignment(assignment, protocol);
    if (ids.has(assignment.assignment_id)) errors.push(`duplicate assignment_id: ${assignment.assignment_id}`);
    ids.add(assignment.assignment_id);
  }
  if (assignments.length !== protocol.participant_count * 2) {
    errors.push(`expected ${protocol.participant_count * 2} assignments, got ${assignments.length}`);
  }
  const byParticipant = new Map();
  for (const assignment of assignments) {
    const values = byParticipant.get(assignment.participant_id) || [];
    values.push(assignment);
    byParticipant.set(assignment.participant_id, values);
  }
  if (byParticipant.size !== protocol.participant_count) {
    errors.push(`expected ${protocol.participant_count} participants, got ${byParticipant.size}`);
  }
  for (const [participant, values] of byParticipant) {
    if (values.length !== 2) {
      errors.push(`${participant} must have exactly two assignments`);
      continue;
    }
    if (new Set(values.map((item) => item.mode)).size !== 2) errors.push(`${participant} must receive both modes`);
    if (canonical(values.map((item) => item.order).sort()) !== canonical([1, 2])) {
      errors.push(`${participant} must receive orders 1 and 2`);
    }
    if (new Set(values.map((item) => item.pair_id)).size !== 1) errors.push(`${participant} crosses matched pairs`);
    if (new Set(values.map((item) => canonical([
      item.runtime_family, item.model_id, item.os_family,
    ]))).size !== 1) errors.push(`${participant} changes stratum between modes`);
  }
  for (const pair of protocol.scenario_pairs) {
    const selected = assignments.filter((item) => item.pair_id === pair.pair_id);
    for (const scenario of [pair.scenario_a, pair.scenario_b]) {
      const bare = selected.filter((item) => item.scenario_id === scenario && item.mode === 'bare').length;
      const harnessed = selected.filter((item) => item.scenario_id === scenario && item.mode === 'harnessed').length;
      if (bare !== harnessed) errors.push(`${scenario} mode imbalance: bare=${bare}, harnessed=${harnessed}`);
    }
    const firstBare = selected.filter((item) => item.order === 1 && item.mode === 'bare').length;
    const firstHarnessed = selected.filter((item) => item.order === 1 && item.mode === 'harnessed').length;
    if (firstBare !== firstHarnessed) {
      errors.push(`${pair.pair_id} order imbalance: bare-first=${firstBare}, harnessed-first=${firstHarnessed}`);
    }
  }
  const actualCommitment = assignmentCommitment(assignments);
  if (actualCommitment !== protocol.assignment_commitment) errors.push('assignment commitment mismatch');
  return {
    valid: errors.length === 0,
    errors,
    participants: byParticipant.size,
    assignments: assignments.length,
    commitment: actualCommitment,
  };
}

function validatePlan(protocol, assignments) {
  const balance = analyzeBalance(protocol, assignments);
  if (!balance.valid) throw new Error(balance.errors.join('; '));
  return { protocol, assignments, balance };
}

module.exports = Object.freeze({
  SPEC_FIELDS,
  analyzeBalance,
  assignmentCommitment,
  createPlan,
  deterministicNumber,
  shuffle,
  validatePlan,
});

'use strict';

const {
  digest,
  validateProtocol,
  validateRecord,
} = require('./trial-contract');
const { validatePlan } = require('./assignment');
const { verifyPinnedReceipt } = require('./receipts');

function rate(numerator, denominator) {
  return denominator ? Number((numerator / denominator).toFixed(6)) : null;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function gate(value, target, direction = 'min', eligible = true) {
  if (!eligible || value === null) return { state: 'waiting', value, target, direction };
  const passed = direction === 'max' ? value <= target : value >= target;
  return { state: passed ? 'passed' : 'failed', value, target, direction };
}

function deterministicIndex(seed, replicate, draw, length) {
  return Number.parseInt(digest(`${seed}:${replicate}:${draw}`).slice(0, 12), 16) % length;
}

function pairedAcceptedInterval(protocol, assignments, indexed, replicates = 2000) {
  const byParticipant = new Map();
  for (const assignment of assignments) {
    const pair = byParticipant.get(assignment.participant_id) || {};
    const score = indexed.scores.get(assignment.assignment_id);
    pair[assignment.mode] = score && score.completed
      && score.oracle_verdict === 'passed' && score.owner_accepted ? 1 : 0;
    byParticipant.set(assignment.participant_id, pair);
  }
  const differences = [...byParticipant.values()].map((pair) => (
    (pair.harnessed || 0) - (pair.bare || 0)
  ));
  if (differences.length === 0) return { point: null, lower_95: null, upper_95: null, replicates };
  const point = differences.reduce((sum, value) => sum + value, 0) / differences.length;
  const samples = [];
  for (let replicate = 0; replicate < replicates; replicate += 1) {
    let total = 0;
    for (let draw = 0; draw < differences.length; draw += 1) {
      total += differences[deterministicIndex(
        protocol.randomization_digest, replicate, draw, differences.length,
      )];
    }
    samples.push(total / differences.length);
  }
  samples.sort((left, right) => left - right);
  const percentile = (fraction) => samples[Math.floor((samples.length - 1) * fraction)];
  return {
    point: Number(point.toFixed(6)),
    lower_95: Number(percentile(0.025).toFixed(6)),
    upper_95: Number(percentile(0.975).toFixed(6)),
    replicates,
  };
}

function recordKey(record) {
  return `${record.kind}:${digest(record)}`;
}

function indexRecords(protocol, assignments, records) {
  const assignmentIds = new Set(assignments.map((item) => item.assignment_id));
  const participantIds = new Set(assignments.map((item) => item.participant_id));
  const scores = new Map();
  const artifacts = new Map();
  const exits = new Map();
  const stages = new Map();
  const retention = new Map();
  const seenSingleton = new Set();

  records.forEach((record) => {
    validateRecord(record);
    if (record.protocol_id !== protocol.protocol_id) throw new Error('trial record protocol mismatch');
    if ('assignment_id' in record && !assignmentIds.has(record.assignment_id)) {
      throw new Error(`trial record references unknown assignment: ${record.assignment_id}`);
    }
    if (record.kind === 'retention_observation_v2' && !participantIds.has(record.participant_id)) {
      throw new Error(`retention record references unknown participant: ${record.participant_id}`);
    }
    if (['trial_score_v2', 'trial_artifacts_v2', 'trial_exit_v2'].includes(record.kind)) {
      const key = `${record.kind}:${record.assignment_id}`;
      if (seenSingleton.has(key)) throw new Error(`duplicate singleton trial record: ${key}`);
      seenSingleton.add(key);
    }
    if (record.kind === 'trial_score_v2') scores.set(record.assignment_id, record);
    else if (record.kind === 'trial_artifacts_v2') artifacts.set(record.assignment_id, record);
    else if (record.kind === 'trial_exit_v2') exits.set(record.assignment_id, record);
    else if (record.kind === 'trial_stage_v2') {
      const values = stages.get(record.assignment_id) || [];
      values.push(record);
      stages.set(record.assignment_id, values);
    } else {
      const values = retention.get(record.participant_id) || [];
      if (values.some((item) => item.observation_day === record.observation_day)) {
        throw new Error(`duplicate retention observation day for ${record.participant_id}`);
      }
      values.push(record);
      retention.set(record.participant_id, values);
    }
  });
  return { scores, artifacts, exits, stages, retention };
}

function modeSummary(mode, assignments, indexed) {
  const selected = assignments.filter((item) => item.mode === mode);
  const scores = selected.map((item) => indexed.scores.get(item.assignment_id)).filter(Boolean);
  const accepted = scores.filter((score) => (
    score.completed && score.oracle_verdict === 'passed' && score.owner_accepted
  )).length;
  const claimed = scores.filter((score) => score.claimed_verdict !== 'unknown');
  const falsePasses = scores.filter((score) => (
    score.claimed_verdict === 'passed' && score.oracle_verdict !== 'passed'
  )).length;
  const resume = scores.filter((score) => score.resume_correct !== null);
  const artifacts = selected.map((item) => indexed.artifacts.get(item.assignment_id)).filter(Boolean);
  const exits = selected.map((item) => indexed.exits.get(item.assignment_id)).filter(Boolean);
  const handoffDurations = selected.flatMap((item) => (
    (indexed.stages.get(item.assignment_id) || [])
      .filter((stage) => stage.stage === 'handoff' && stage.status === 'succeeded' && stage.duration_ms !== null)
      .map((stage) => stage.duration_ms)
  ));
  const cleanArtifacts = artifacts.filter((item) => (
    item.unexpected_tracked === 0
      && item.unexpected_untracked === 0
      && item.cleanup_verdict === 'passed'
  )).length;
  const cleanExits = exits.filter((item) => (
    item.plan_reviewed
      && item.archive_verdict === 'passed'
      && item.user_state_verdict === 'passed'
      && item.hooks_removed_verdict === 'passed'
      && item.footprint_verdict === 'passed'
      && item.restore_verdict === 'passed'
  )).length;
  return {
    assigned: selected.length,
    scored: scores.length,
    missing_scores: selected.length - scores.length,
    completed: scores.filter((score) => score.completed).length,
    accepted_verified: accepted,
    accepted_verified_rate: rate(accepted, selected.length),
    claimed_verdicts: claimed.length,
    verification_accuracy: rate(
      claimed.filter((score) => score.claimed_verdict === score.oracle_verdict).length,
      claimed.length,
    ),
    false_passes: falsePasses,
    corrective_interventions: scores.reduce((sum, score) => sum + score.corrective_interventions, 0),
    required_approvals: scores.reduce((sum, score) => sum + score.required_approvals, 0),
    clarifications: scores.reduce((sum, score) => sum + score.clarifications, 0),
    rework_cycles: scores.reduce((sum, score) => sum + score.rework_cycles, 0),
    regressions: scores.reduce((sum, score) => sum + score.regressions, 0),
    resume_eligible: resume.length,
    resume_succeeded: resume.filter((score) => score.resume_correct).length,
    resume_rate: rate(resume.filter((score) => score.resume_correct).length, resume.length),
    median_handoff_ms: median(handoffDurations),
    artifact_records: artifacts.length,
    clean_artifact_records: cleanArtifacts,
    exit_records: exits.length,
    clean_exit_records: cleanExits,
  };
}

function retentionSummary(protocol, assignments, indexed) {
  const participantIds = [...new Set(assignments.map((item) => item.participant_id))];
  const installed = participantIds.filter((participant) => (
    (indexed.retention.get(participant) || []).some((item) => item.install_succeeded)
  ));
  function window(start, end) {
    const eligible = installed.filter((participant) => (
      Math.max(...(indexed.retention.get(participant) || []).map((item) => item.observation_day)) >= start
    ));
    const returned = eligible.filter((participant) => (
      (indexed.retention.get(participant) || []).some((item) => (
        item.observation_day >= start
          && item.observation_day <= end
          && item.meaningful_task_completed
          && item.canonical_verification_passed
      ))
    ));
    return {
      eligible: eligible.length,
      returned: returned.length,
      rate: rate(returned.length, eligible.length),
      window: [start, end],
    };
  }
  return {
    participants: protocol.participant_count,
    successful_installs: installed.length,
    d7: window(7, 13),
    d30: window(30, 44),
  };
}

function buildReport(input) {
  const protocol = validateProtocol(input.protocol);
  const assignments = input.assignments || [];
  const balance = validatePlan(protocol, assignments).balance;
  const records = input.records || [];
  const indexed = indexRecords(protocol, assignments, records);
  const receipts = input.receipts || [];
  const invalidReceipts = receipts.filter((receipt) => !verifyPinnedReceipt(receipt, protocol)).length;
  const signedRecordKeys = new Set(
    receipts.filter((receipt) => verifyPinnedReceipt(receipt, protocol))
      .flatMap((receipt) => receipt.records.map(recordKey)),
  );
  const signedScores = [...indexed.scores.values()].filter((record) => signedRecordKeys.has(recordKey(record))).length;
  const bare = modeSummary('bare', assignments, indexed);
  const harnessed = modeSummary('harnessed', assignments, indexed);
  const retention = retentionSummary(protocol, assignments, indexed);
  const telemetryJoin = rate(indexed.scores.size, assignments.length);
  const acceptedDifference = harnessed.accepted_verified_rate - bare.accepted_verified_rate;
  const acceptedInterval = pairedAcceptedInterval(protocol, assignments, indexed);
  const interventionReduction = bare.corrective_interventions === 0
    ? (harnessed.corrective_interventions === 0 ? 0 : null)
    : Number(((bare.corrective_interventions - harnessed.corrective_interventions)
      / bare.corrective_interventions).toFixed(6));
  const recoveryGain = bare.resume_rate === null || harnessed.resume_rate === null
    ? null : Number((harnessed.resume_rate - bare.resume_rate).toFixed(6));
  const timeOverhead = bare.median_handoff_ms === null || harnessed.median_handoff_ms === null
    || bare.median_handoff_ms === 0
    ? null : Number(((harnessed.median_handoff_ms - bare.median_handoff_ms)
      / bare.median_handoff_ms).toFixed(6));
  const falsePasses = bare.false_passes + harnessed.false_passes;
  const claims = bare.claimed_verdicts + harnessed.claimed_verdicts;
  const correctClaims = [bare, harnessed].reduce((sum, mode) => (
    sum + Math.round((mode.verification_accuracy || 0) * mode.claimed_verdicts)
  ), 0);
  const verificationAccuracy = rate(correctClaims, claims);
  const artifactRecords = bare.artifact_records + harnessed.artifact_records;
  const cleanArtifactRecords = bare.clean_artifact_records + harnessed.clean_artifact_records;
  const exitRecords = bare.exit_records + harnessed.exit_records;
  const cleanExitRecords = bare.clean_exit_records + harnessed.clean_exit_records;
  const gates = {
    assignment_integrity: {
      state: balance.valid ? 'passed' : 'invalid',
      value: balance.valid,
      target: true,
    },
    telemetry_join: gate(telemetryJoin, protocol.gates.telemetry_join_min),
    signed_score_coverage: protocol.signing_public_key
      ? gate(rate(signedScores, assignments.length), protocol.gates.telemetry_join_min)
      : { state: 'waiting', value: null, target: protocol.gates.telemetry_join_min, direction: 'min' },
    receipt_integrity: {
      state: invalidReceipts === 0 ? 'passed' : 'invalid',
      value: invalidReceipts,
      target: 0,
    },
    accepted_completion: gate(
      acceptedInterval.lower_95,
      protocol.gates.accepted_completion_margin,
      'min',
      telemetryJoin === 1,
    ),
    complex_task_benefit: {
      state: (recoveryGain !== null && recoveryGain >= protocol.gates.recovery_gain_min)
        || (interventionReduction !== null
          && interventionReduction >= protocol.gates.intervention_reduction_min)
        ? 'passed'
        : recoveryGain === null && interventionReduction === null ? 'waiting' : 'failed',
      recovery_gain: recoveryGain,
      intervention_reduction: interventionReduction,
      recovery_target: protocol.gates.recovery_gain_min,
      intervention_target: protocol.gates.intervention_reduction_min,
    },
    time_overhead: gate(timeOverhead, protocol.gates.time_overhead_max, 'max'),
    rework: {
      state: telemetryJoin === 1
        ? (harnessed.rework_cycles <= bare.rework_cycles ? 'passed' : 'failed')
        : 'waiting',
      bare: bare.rework_cycles,
      harnessed: harnessed.rework_cycles,
      direction: 'harnessed_lte_bare',
    },
    verification_accuracy: gate(
      verificationAccuracy,
      protocol.gates.verification_accuracy_min,
    ),
    false_pass: gate(falsePasses, protocol.gates.false_pass_max, 'max', claims > 0),
    artifact_noise: artifactRecords === 0
      ? { state: 'waiting', value: null, target: 1, direction: 'all_clean' }
      : {
        state: cleanArtifactRecords === artifactRecords ? 'passed' : 'failed',
        value: cleanArtifactRecords,
        target: artifactRecords,
        direction: 'all_clean',
      },
    safe_exit: exitRecords === 0
      ? { state: 'waiting', value: null, target: 1, direction: 'all_clean' }
      : {
        state: cleanExitRecords === exitRecords ? 'passed' : 'failed',
        value: cleanExitRecords,
        target: exitRecords,
        direction: 'all_clean',
      },
    d7_meaningful_retention: gate(
      retention.d7.rate,
      protocol.gates.d7_retention_min,
      'min',
      retention.d7.eligible > 0,
    ),
  };
  const gateStates = Object.values(gates).map((item) => item.state);
  const instrumentStatus = gateStates.includes('invalid') ? 'invalid'
    : gateStates.includes('failed') ? 'needs_attention'
      : gateStates.includes('waiting') ? 'collecting' : 'instrument_ready';
  return {
    schema: 2,
    kind: 'product_proof_report_v2',
    protocol_id: protocol.protocol_id,
    evidence_kind: protocol.evidence_kind,
    claim_status: 'instrument_only',
    utility_claim: false,
    instrument_status: instrumentStatus,
    intention_to_treat: {
      assigned_attempts: assignments.length,
      scored_attempts: indexed.scores.size,
      missing_attempts: assignments.length - indexed.scores.size,
      denominator_policy: 'all randomized assignments remain in mode denominators',
    },
    receipt_evidence: {
      supplied: receipts.length,
      invalid: invalidReceipts,
      signed_scores: signedScores,
    },
    modes: { bare, harnessed },
    comparisons: {
      accepted_completion_difference: Number(acceptedDifference.toFixed(6)),
      accepted_completion_paired_bootstrap_95: acceptedInterval,
      recovery_gain: recoveryGain,
      intervention_reduction: interventionReduction,
      time_overhead: timeOverhead,
    },
    retention,
    gates,
    limitations: [
      'This report proves the local measurement instrument only.',
      'It is not independent human evidence and cannot support a comparative utility claim.',
      'Confidence-bound cohort decisions remain a later externally run milestone.',
    ],
  };
}

module.exports = Object.freeze({
  buildReport,
  gate,
  indexRecords,
  median,
  modeSummary,
  pairedAcceptedInterval,
  rate,
  retentionSummary,
});

'use strict';

const { assertPublicAggregate, suppressCell } = require('./redaction');

function suppressRetention(value, minimum) {
  if (!value || value.eligible < minimum) {
    return {
      suppressed: true,
      eligible: null,
      returned: null,
      rate: null,
      window: value?.window || null,
    };
  }
  return { suppressed: false, ...value };
}

function buildSharePreview(report, minimumPublicCell) {
  if (!report || report.schema !== 2 || report.kind !== 'product_proof_report_v2') {
    throw new Error('share preview requires a product proof v2 report');
  }
  const minimum = minimumPublicCell;
  if (!Number.isInteger(minimum) || minimum < 5) throw new Error('minimum public cell must be at least 5');
  const bare = suppressCell(report.modes.bare, minimum);
  const harnessed = suppressCell(report.modes.harnessed, minimum);
  const comparisonsSuppressed = bare.suppressed || harnessed.suppressed;
  const privateGate = (name) => comparisonsSuppressed ? 'suppressed' : report.gates[name].state;
  const retentionGate = report.retention.d7.eligible < minimum
    ? 'suppressed' : report.gates.d7_meaningful_retention.state;
  const preview = {
    schema: 2,
    kind: 'product_proof_share_preview_v2',
    protocol_id: report.protocol_id,
    evidence_kind: report.evidence_kind,
    claim_status: 'instrument_only',
    utility_claim: false,
    instrument_status: comparisonsSuppressed ? 'suppressed' : report.instrument_status,
    minimum_public_cell: minimum,
    cells: { bare, harnessed },
    comparisons: comparisonsSuppressed ? {
      suppressed: true,
      accepted_completion_difference: null,
      recovery_gain: null,
      intervention_reduction: null,
      time_overhead: null,
    } : {
      suppressed: false,
      ...report.comparisons,
    },
    retention: {
      successful_installs: report.retention.successful_installs < minimum
        ? null : report.retention.successful_installs,
      d7: suppressRetention(report.retention.d7, minimum),
      d30: suppressRetention(report.retention.d30, minimum),
    },
    gates: {
      assignment_integrity: report.gates.assignment_integrity.state,
      telemetry_join: privateGate('telemetry_join'),
      receipt_integrity: report.gates.receipt_integrity.state,
      false_pass: privateGate('false_pass'),
      artifact_noise: privateGate('artifact_noise'),
      safe_exit: privateGate('safe_exit'),
      d7_meaningful_retention: retentionGate,
    },
    limitations: [
      'Aggregate-only preview; no network request was made.',
      'Small cells are suppressed and detailed receipts remain local.',
      'This instrument proof is not a comparative utility claim.',
    ],
  };
  return assertPublicAggregate(preview);
}

module.exports = Object.freeze({ buildSharePreview, suppressRetention });

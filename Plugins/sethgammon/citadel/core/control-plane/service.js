'use strict';

const operations = require('../operations');
const {
  CONTROL_PLANE_API_VERSION,
  CONTROL_PLANE_CONTRACT_VERSION,
  canonicalTimestamp,
  exactFields,
  validDigest,
  validateIntentCommand,
  validatePublicValue,
  validateRequestEnvelope,
  validateResponseEnvelope,
  validateSubmission,
} = require('./contracts');
const {
  validateAuthorityEnvelope,
  verifyAuthorityEnvelope,
} = require('./authority');
const { createControlPlaneEvent } = require('./events');
const { createProofBundle } = require('./proof-bundle');
const {
  evaluateProofPolicy,
  validateEvidenceBinding,
  validateProofPolicy,
} = require('./proof-policy');

const EXECUTION_FIELDS = Object.freeze([
  'run', 'step_attempts', 'evidence_envelopes', 'evidence_bindings',
  'handoffs', 'execution_plan_digest',
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mapFromEntries(entries) {
  return new Map(Array.isArray(entries) ? entries : []);
}

function createControlPlaneService(options = {}) {
  const now = options.now || (() => new Date().toISOString());
  const installationId = options.installationId || 'citadel-local';
  const authority = Object.freeze({
    trustedKeys: options.authorityTrustedKeys || new Map(),
    revokedGrantIds: options.revokedGrantIds || new Set(),
  });
  const proofPrivateKey = options.proofPrivateKey;
  const proofKeyId = options.proofKeyId;
  const proofIssuerId = options.proofIssuerId || 'citadel-local';
  const restored = options.snapshot ? clone(options.snapshot) : null;
  const state = {
    operations: mapFromEntries(restored?.operations),
    decisions: mapFromEntries(restored?.decisions),
    events: restored?.events || [],
    sequence: restored?.sequence || 0,
  };

  function timestamp() {
    const value = now();
    if (!canonicalTimestamp(value)) throw new TypeError('service clock must return a canonical timestamp');
    return value;
  }

  function response(request, domain) {
    const value = {
      control_plane_api_version: CONTROL_PLANE_API_VERSION,
      request_id: request?.request_id && operations.ID_PATTERN.test(request.request_id)
        ? request.request_id : 'request-invalid',
      outcome: domain.outcome,
      reason_code: domain.reason_code,
      current_revision: domain.current_revision ?? null,
      result: domain.result || {},
      completed_at: timestamp(),
    };
    const errors = validateResponseEnvelope(value);
    if (errors.length) throw new TypeError(`Invalid service response: ${errors.join('; ')}`);
    return Object.freeze(value);
  }

  function domain(outcome, reasonCode, currentRevision = null, result = {}) {
    return Object.freeze({
      outcome, reason_code: reasonCode, current_revision: currentRevision, result: Object.freeze(result),
    });
  }

  function semanticRequestDigest(request) {
    return operations.sha256Digest({
      method: request.method,
      payload: request.payload,
      expected_revision: request.expected_revision,
    });
  }

  function currentRevisionFor(request) {
    const operationId = request?.payload?.operation_id
      || request?.payload?.operation_spec?.operation_id
      || request?.payload?.intent?.operation_id;
    return state.operations.get(operationId)?.revision ?? null;
  }

  function idempotentDispatch(request, execute) {
    const digest = semanticRequestDigest(request);
    const previous = state.decisions.get(request.idempotency_key);
    if (previous) {
      if (previous.request_digest !== digest) {
        return domain('conflict', 'IDEMPOTENCY_KEY_REUSED', currentRevisionFor(request));
      }
      return Object.freeze(previous.domain);
    }
    const result = execute();
    state.decisions.set(request.idempotency_key, clone({ request_digest: digest, domain: result }));
    return result;
  }

  function appendEvent(record, eventType, payloadKind, payload, traceparent = null) {
    state.sequence += 1;
    const event = createControlPlaneEvent({
      eventType,
      sequence: state.sequence,
      subjectRevision: record.revision,
      payloadKind,
      payload,
      id: `event-${state.sequence}`,
      installationId,
      operationId: record.submission.operation_spec.operation_id,
      time: timestamp(),
      traceparent,
    });
    state.events.push(event);
    return event;
  }

  function authorityDecision(envelope, expected) {
    const verified = verifyAuthorityEnvelope(envelope, { ...authority, now: timestamp() });
    if (verified.status !== 'verified') {
      const blocked = ['AUTHORITY_SIGNER_NOT_TRUSTED'].includes(verified.reason_code);
      return { error: domain(blocked ? 'blocked' : 'rejected', verified.reason_code), verified };
    }
    const grant = envelope.grant;
    if (grant.operation_digest !== expected.operationDigest) {
      return { error: domain('blocked', 'AUTHORITY_OPERATION_MISMATCH'), verified };
    }
    if (grant.scope_digest !== expected.scopeDigest) {
      return { error: domain('blocked', 'AUTHORITY_SCOPE_MISMATCH'), verified };
    }
    if (expected.actorId && grant.actor_id !== expected.actorId) {
      return { error: domain('blocked', 'AUTHORITY_ACTOR_MISMATCH'), verified };
    }
    if (!grant.permitted_actions.includes(expected.action)) {
      return { error: domain('blocked', 'AUTHORITY_ACTION_NOT_GRANTED'), verified };
    }
    return { error: null, verified };
  }

  function submitOperation(submission, traceparent) {
    const errors = validateSubmission(submission, validateProofPolicy, validateAuthorityEnvelope);
    if (errors.length) return domain('rejected', 'SUBMISSION_INVALID');
    const operation = submission.operation_spec;
    const operationDigest = operations.sha256Digest(operation);
    const authorization = authorityDecision(submission.authority_grant_envelope, {
      operationDigest, scopeDigest: submission.scope_digest, action: 'start',
    });
    if (authorization.error) return authorization.error;
    if (state.operations.has(operation.operation_id)) {
      return domain('conflict', 'OPERATION_ALREADY_EXISTS', state.operations.get(operation.operation_id).revision);
    }
    const run = Object.freeze({
      protocol_version: operations.PROTOCOL_VERSION,
      kind: 'operation_run',
      run_id: `run-${operationDigest.slice(7, 31)}`,
      operation_id: operation.operation_id,
      spec_digest: operationDigest,
      status: 'pending',
      started_at: null,
      completed_at: null,
      intent_ids: Object.freeze([]),
      step_attempt_ids: Object.freeze([]),
    });
    const executionPlanDigest = operations.sha256Digest({
      operation_digest: operationDigest,
      proof_policy_digest: operations.sha256Digest(submission.proof_policy),
      scope_digest: submission.scope_digest,
      adapter_id: submission.adapter_id,
    });
    const record = {
      revision: 0,
      submission: clone(submission),
      run: clone(run),
      run_history: [],
      intents: [],
      grants: [clone(submission.authority_grant_envelope)],
      attempts: [],
      evidence: [],
      bindings: [],
      handoffs: [],
      execution_plan_digest: executionPlanDigest,
      proof_bundle: null,
      last_execution_digest: null,
    };
    state.operations.set(operation.operation_id, record);
    appendEvent(record, 'run.changed', 'operation_run', run, traceparent);
    return domain('accepted', 'OPERATION_REGISTERED', 0, {
      operation_id: operation.operation_id,
      operation_digest: operationDigest,
      proof_policy_digest: operations.sha256Digest(submission.proof_policy),
      execution_plan_digest: executionPlanDigest,
    });
  }

  function allowedAction(run, action) {
    const states = {
      start: ['pending'],
      pause: ['running'],
      resume: ['blocked'],
      cancel: ['pending', 'running', 'blocked'],
      approve: ['blocked'],
      reject: ['pending', 'running', 'blocked'],
      retry: ['blocked', 'failed', 'unknown'],
    };
    return states[action]?.includes(run.status);
  }

  function runAfterIntent(record, intent, at) {
    const current = record.run;
    const intentIds = [...current.intent_ids, intent.intent_id];
    if (intent.action === 'retry' && ['failed', 'unknown'].includes(current.status)) {
      record.run_history.push(clone(current));
      return {
        protocol_version: operations.PROTOCOL_VERSION,
        kind: 'operation_run',
        run_id: `run-${operations.sha256Digest({
          operation_id: current.operation_id, intent_id: intent.intent_id,
        }).slice(7, 31)}`,
        operation_id: current.operation_id,
        spec_digest: current.spec_digest,
        status: 'running',
        started_at: at,
        completed_at: null,
        intent_ids: [intent.intent_id],
        step_attempt_ids: [],
      };
    }
    let status = current.status;
    let startedAt = current.started_at;
    let completedAt = current.completed_at;
    if (intent.action === 'start' || intent.action === 'resume' || intent.action === 'retry') {
      status = 'running';
      startedAt ||= at;
      completedAt = null;
    } else if (intent.action === 'pause' || intent.action === 'reject') {
      status = 'blocked';
      startedAt ||= at;
      completedAt = null;
    } else if (intent.action === 'cancel') {
      status = 'unknown';
      startedAt ||= at;
      completedAt = at;
    }
    return {
      ...current, status, started_at: startedAt, completed_at: completedAt, intent_ids: intentIds,
    };
  }

  function submitIntent(command, expectedRevision, traceparent) {
    const errors = validateIntentCommand(command, validateAuthorityEnvelope);
    if (errors.length) return domain('rejected', 'INTENT_COMMAND_INVALID');
    const intent = command.intent;
    const record = state.operations.get(intent.operation_id);
    if (!record) return domain('unknown', 'OPERATION_NOT_FOUND');
    if (record.revision !== expectedRevision) return domain('conflict', 'STALE_REVISION', record.revision);
    const operationDigest = operations.sha256Digest(record.submission.operation_spec);
    const authorization = authorityDecision(command.authority_grant_envelope, {
      operationDigest,
      scopeDigest: intent.scope_digest,
      actorId: intent.actor_id,
      action: intent.action,
    });
    if (authorization.error) return Object.freeze({ ...authorization.error, current_revision: record.revision });
    const at = timestamp();
    if (intent.expires_at && Date.parse(intent.expires_at) <= Date.parse(at)) {
      return domain('rejected', 'INTENT_EXPIRED', record.revision);
    }
    if (!allowedAction(record.run, intent.action)) {
      return domain('rejected', 'INVALID_TRANSITION', record.revision);
    }
    const nextRun = runAfterIntent(record, intent, at);
    const runErrors = operations.validateOperationRun(nextRun);
    if (runErrors.length) throw new TypeError(`Intent produced invalid run: ${runErrors.join('; ')}`);
    record.intents.push(clone(intent));
    record.grants.push(clone(command.authority_grant_envelope));
    record.run = clone(nextRun);
    record.revision += 1;
    appendEvent(record, 'intent.accepted', 'intent', {
      intent,
      authority_grant_digest: command.authority_grant_envelope.grant_digest,
      command_id: command.command_id,
      reason_code: command.reason_code,
      reason_digest: command.reason_digest,
    }, traceparent);
    appendEvent(record, 'run.changed', 'operation_run', nextRun, traceparent);
    return domain('accepted', 'INTENT_CONSUMED', record.revision, {
      operation_id: intent.operation_id,
      intent_id: intent.intent_id,
      run_id: nextRun.run_id,
      run_status: nextRun.status,
    });
  }

  function publicOperation(record) {
    return Object.freeze({
      operation_spec: record.submission.operation_spec,
      proof_policy: record.submission.proof_policy,
      scope_digest: record.submission.scope_digest,
      execution_plan_digest: record.execution_plan_digest,
      revision: record.revision,
      run: record.run,
    });
  }

  function methodPayloadErrors(method, payload) {
    const fields = {
      handshake: ['supported_control_plane_contract_versions', 'supported_operations_protocol_versions'],
      'operations.get': ['operation_id'],
      'events.replay': ['after_cursor', 'limit'],
      'proof.get': ['run_id'],
    };
    if (!fields[method]) return [];
    if (!exactFields(payload, fields[method])) return [`${method} payload fields are invalid`];
    return [];
  }

  function executeRequest(request) {
    if (request.method === 'handshake') {
      const supportsControl = request.payload.supported_control_plane_contract_versions;
      const supportsOperations = request.payload.supported_operations_protocol_versions;
      if (!Array.isArray(supportsControl) || !supportsControl.includes(CONTROL_PLANE_CONTRACT_VERSION)
        || !Array.isArray(supportsOperations) || !supportsOperations.includes(operations.PROTOCOL_VERSION)) {
        return domain('blocked', 'NO_COMMON_CONTRACT_VERSION');
      }
      const trustedKeys = authority.trustedKeys instanceof Map
        ? [...authority.trustedKeys.keys()] : Object.keys(authority.trustedKeys);
      return domain('accepted', 'HANDSHAKE_NEGOTIATED', null, {
        control_plane_contract_version: CONTROL_PLANE_CONTRACT_VERSION,
        operations_protocol_version: operations.PROTOCOL_VERSION,
        capabilities: [
          'authority', 'idempotency', 'optimistic-revisions', 'proof-policy',
          'signed-proof-bundle', 'event-replay',
        ],
        max_payload_bytes: 65536,
        trusted_authority_key_ids: trustedKeys.sort(),
      });
    }
    if (request.method === 'operations.submit') return submitOperation(request.payload, request.traceparent);
    if (request.method === 'intents.submit') {
      return submitIntent(request.payload, request.expected_revision, request.traceparent);
    }
    if (request.method === 'operations.get') {
      const record = state.operations.get(request.payload.operation_id);
      return record
        ? domain('accepted', 'OPERATION_FOUND', record.revision, publicOperation(record))
        : domain('unknown', 'OPERATION_NOT_FOUND');
    }
    if (request.method === 'events.replay') {
      const { after_cursor: cursor, limit } = request.payload;
      if ((cursor !== null && (typeof cursor !== 'string' || !/^cursor-[0-9]+$/.test(cursor)))
        || !Number.isSafeInteger(limit) || limit < 1 || limit > 5000) {
        return domain('rejected', 'REPLAY_ARGUMENTS_INVALID');
      }
      const after = cursor === null ? 0 : Number(cursor.slice('cursor-'.length));
      if (after > state.sequence) {
        return domain('conflict', 'REPLAY_CURSOR_AHEAD', null, {
          earliest_cursor: state.events.length
            ? `cursor-${state.events[0].data.sequence - 1}` : 'cursor-0',
          latest_cursor: `cursor-${state.sequence}`,
        });
      }
      if (after > 0 && !state.events.some((event) => event.data.sequence === after)) {
        return domain('unknown', 'REPLAY_GAP', null, {
          earliest_cursor: state.events.length
            ? `cursor-${state.events[0].data.sequence - 1}` : 'cursor-0',
          latest_cursor: `cursor-${state.sequence}`,
        });
      }
      const events = state.events.filter((event) => event.data.sequence > after).slice(0, limit);
      const next = events.length ? events[events.length - 1].data.sequence : after;
      return domain('accepted', 'EVENTS_REPLAYED', null, {
        events, next_cursor: `cursor-${next}`,
      });
    }
    if (request.method === 'proof.get') {
      const record = [...state.operations.values()].find((item) =>
        item.run.run_id === request.payload.run_id
        || item.run_history.some((run) => run.run_id === request.payload.run_id));
      if (!record) return domain('unknown', 'RUN_NOT_FOUND');
      if (!record.proof_bundle || record.proof_bundle.operation_run.run_id !== request.payload.run_id) {
        return domain('unknown', 'PROOF_NOT_AVAILABLE', record.revision);
      }
      return domain('accepted', 'PROOF_FOUND', record.revision, { proof_bundle: record.proof_bundle });
    }
    return domain('rejected', 'METHOD_UNSUPPORTED');
  }

  function handle(request) {
    const errors = validateRequestEnvelope(request);
    if (errors.length) return response(request, domain('rejected', 'REQUEST_INVALID'));
    const payloadErrors = methodPayloadErrors(request.method, request.payload);
    if (payloadErrors.length) return response(request, domain('rejected', 'PAYLOAD_INVALID'));
    const result = request.kind === 'command'
      ? idempotentDispatch(request, () => executeRequest(request))
      : executeRequest(request);
    return response(request, result);
  }

  function recordExecution(operationId, input, traceparent = null) {
    if (!exactFields(input, EXECUTION_FIELDS)) throw new TypeError('execution input fields are invalid');
    const privacy = validatePublicValue(input, 'execution');
    if (privacy.length) throw new TypeError(privacy.join('; '));
    const record = state.operations.get(operationId);
    if (!record) throw new Error('operation not found');
    const digest = operations.sha256Digest(input);
    if (digest === record.last_execution_digest) return publicOperation(record);
    const operation = record.submission.operation_spec;
    if (input.run.run_id !== record.run.run_id
      || JSON.stringify(input.run.intent_ids) !== JSON.stringify(record.run.intent_ids)) {
      throw new TypeError('execution run does not preserve accepted intent lineage');
    }
    if (input.execution_plan_digest !== record.execution_plan_digest) {
      throw new TypeError('execution plan digest does not match operation binding');
    }
    const evaluation = evaluateProofPolicy({
      operation,
      run: input.run,
      attempts: input.step_attempts,
      evidence: input.evidence_envelopes,
      bindings: input.evidence_bindings,
      proofPolicy: record.submission.proof_policy,
    });
    if (input.run.status === 'passed' && evaluation.status !== 'passed' && input.run.completed_at === null) {
      throw new TypeError('terminal unknown normalization requires completed_at');
    }
    const bundle = createProofBundle({
      operation,
      proofPolicy: record.submission.proof_policy,
      run: input.run,
      attempts: input.step_attempts,
      evidence: input.evidence_envelopes,
      bindings: input.evidence_bindings,
      handoffs: input.handoffs,
      intents: record.intents,
      authorityEnvelopes: record.grants,
      executionPlanDigest: record.execution_plan_digest,
      issuedAt: timestamp(),
      issuerId: proofIssuerId,
      privateKey: proofPrivateKey,
      keyId: proofKeyId,
    });
    record.run = clone(bundle.operation_run);
    record.attempts = clone(input.step_attempts);
    record.evidence = clone(input.evidence_envelopes);
    record.bindings = clone(input.evidence_bindings);
    record.handoffs = clone(input.handoffs);
    record.proof_bundle = clone(bundle);
    record.last_execution_digest = digest;
    record.revision += 1;
    input.step_attempts.forEach((attempt) =>
      appendEvent(record, 'attempt.changed', 'step_attempt', attempt, traceparent));
    input.evidence_envelopes.forEach((item) =>
      appendEvent(record, 'evidence.recorded', 'evidence_envelope', item, traceparent));
    input.handoffs.forEach((handoff) =>
      appendEvent(record, 'handoff.changed', 'handoff', handoff, traceparent));
    appendEvent(record, 'run.changed', 'operation_run', record.run, traceparent);
    appendEvent(record, 'receipt.issued', 'proof_bundle_summary', {
      bundle_digest: bundle.bundle_digest,
      receipt_digest: bundle.execution_receipt_envelope.receipt_digest,
      receipt_status: bundle.execution_receipt_envelope.receipt.status,
      proof_status: bundle.proof_evaluation.status,
    }, traceparent);
    return publicOperation(record);
  }

  function snapshot() {
    return clone({
      operations: [...state.operations.entries()],
      decisions: [...state.decisions.entries()],
      events: state.events,
      sequence: state.sequence,
    });
  }

  return Object.freeze({
    handle,
    recordExecution,
    snapshot,
    get eventCount() { return state.events.length; },
  });
}

module.exports = Object.freeze({
  EXECUTION_FIELDS,
  createControlPlaneService,
});

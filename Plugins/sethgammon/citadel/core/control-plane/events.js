'use strict';

const operations = require('../operations');
const {
  CONTROL_PLANE_CONTRACT_VERSION,
  canonicalTimestamp,
  exactFields,
  validDigest,
  validId,
  validatePublicValue,
} = require('./contracts');

const EVENT_FIELDS = Object.freeze([
  'specversion', 'id', 'source', 'type', 'subject', 'time', 'datacontenttype',
  'dataschema', 'traceparent', 'data',
]);
const DATA_FIELDS = Object.freeze([
  'control_plane_contract_version', 'kind', 'sequence', 'subject_revision',
  'payload_kind', 'payload_digest', 'payload',
]);
const EVENT_TYPES = Object.freeze([
  'intent.accepted', 'run.changed', 'attempt.changed', 'evidence.recorded',
  'handoff.changed', 'receipt.issued', 'recovery.decision',
]);

function createControlPlaneEvent(input) {
  if (!EVENT_TYPES.includes(input.eventType)) throw new TypeError('event type is unsupported');
  const data = {
    control_plane_contract_version: CONTROL_PLANE_CONTRACT_VERSION,
    kind: 'control_plane_event_data',
    sequence: input.sequence,
    subject_revision: input.subjectRevision,
    payload_kind: input.payloadKind,
    payload_digest: operations.sha256Digest(input.payload),
    payload: input.payload,
  };
  const event = {
    specversion: '1.0',
    id: input.id,
    source: `urn:citadel:installation:${input.installationId}`,
    type: `dev.citadel.control.${input.eventType}.v1alpha1`,
    subject: `operation/${input.operationId}`,
    time: input.time,
    datacontenttype: 'application/json',
    dataschema: `urn:citadel:schema:control-plane:${input.eventType}:v1alpha1`,
    traceparent: input.traceparent ?? null,
    data,
  };
  const errors = validateControlPlaneEvent(event);
  if (errors.length) throw new TypeError(`Invalid control-plane event: ${errors.join('; ')}`);
  return Object.freeze(event);
}

function validateControlPlaneEvent(event) {
  const errors = [];
  if (!exactFields(event, EVENT_FIELDS)) return ['event fields are invalid'];
  if (event.specversion !== '1.0') errors.push('CloudEvents specversion must be 1.0');
  if (!validId(event.id)) errors.push('event id is invalid');
  if (typeof event.source !== 'string' || !/^urn:citadel:installation:[a-z][a-z0-9_.:-]*$/.test(event.source)) {
    errors.push('event source is invalid');
  }
  if (typeof event.type !== 'string'
    || !EVENT_TYPES.some((type) => event.type === `dev.citadel.control.${type}.v1alpha1`)) {
    errors.push('event type is invalid');
  }
  if (typeof event.subject !== 'string' || !/^operation\/[a-z][a-z0-9_.:-]*$/.test(event.subject)) {
    errors.push('event subject is invalid');
  }
  if (!canonicalTimestamp(event.time)) errors.push('event time must be canonical');
  if (event.datacontenttype !== 'application/json') errors.push('event datacontenttype is invalid');
  if (typeof event.dataschema !== 'string'
    || !/^urn:citadel:schema:control-plane:[a-z.]+:v1alpha1$/.test(event.dataschema)) {
    errors.push('event dataschema is invalid');
  }
  if (event.traceparent !== null
    && (typeof event.traceparent !== 'string'
      || !/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/.test(event.traceparent))) {
    errors.push('event traceparent is invalid');
  }
  if (!exactFields(event.data, DATA_FIELDS)) errors.push('event data fields are invalid');
  else {
    if (event.data.control_plane_contract_version !== CONTROL_PLANE_CONTRACT_VERSION) errors.push('event data version is invalid');
    if (event.data.kind !== 'control_plane_event_data') errors.push('event data kind is invalid');
    if (!Number.isSafeInteger(event.data.sequence) || event.data.sequence < 1) errors.push('event sequence is invalid');
    if (!Number.isSafeInteger(event.data.subject_revision) || event.data.subject_revision < 0) {
      errors.push('event subject revision is invalid');
    }
    if (typeof event.data.payload_kind !== 'string' || !/^[a-z][a-z0-9_.-]*$/.test(event.data.payload_kind)) {
      errors.push('event payload_kind is invalid');
    }
    if (!validDigest(event.data.payload_digest)
      || event.data.payload_digest !== operations.sha256Digest(event.data.payload)) {
      errors.push('event payload digest is invalid');
    }
    errors.push(...validatePublicValue(event.data.payload, 'event.data.payload'));
  }
  return errors;
}

module.exports = Object.freeze({
  DATA_FIELDS,
  EVENT_FIELDS,
  EVENT_TYPES,
  createControlPlaneEvent,
  validateControlPlaneEvent,
});

'use strict';

const fs = require('fs');
const path = require('path');
const { createControlPlaneService } = require('./service');

const SNAPSHOT_FIELDS = Object.freeze(['operations', 'decisions', 'events', 'sequence']);

function validateSnapshot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('control-plane snapshot must be an object');
  }
  const actual = Object.keys(value).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...SNAPSHOT_FIELDS].sort())) {
    throw new Error('control-plane snapshot fields are invalid');
  }
  if (!Array.isArray(value.operations) || !Array.isArray(value.decisions)
    || !Array.isArray(value.events) || !Number.isSafeInteger(value.sequence)
    || value.sequence < 0) {
    throw new Error('control-plane snapshot shape is invalid');
  }
  return value;
}

function readSnapshot(statePath) {
  if (!fs.existsSync(statePath)) return null;
  return validateSnapshot(JSON.parse(fs.readFileSync(statePath, 'utf8')));
}

function writeSnapshot(statePath, snapshot) {
  validateSnapshot(snapshot);
  const directory = path.dirname(statePath);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = `${statePath}.${process.pid}.tmp`;
  const descriptor = fs.openSync(temporary, 'w', 0o600);
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(snapshot)}\n`, 'utf8');
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.renameSync(temporary, statePath);
}

function createFileControlPlaneAdapter(options = {}) {
  if (!options.statePath) throw new Error('statePath is required');
  const statePath = path.resolve(options.statePath);
  const service = createControlPlaneService({
    ...options,
    snapshot: readSnapshot(statePath),
  });

  function persist() {
    writeSnapshot(statePath, service.snapshot());
  }

  function handle(request) {
    const response = service.handle(request);
    if (request?.kind === 'command') persist();
    return response;
  }

  function recordExecution(operationId, input, traceparent = null) {
    const result = service.recordExecution(operationId, input, traceparent);
    persist();
    return result;
  }

  return Object.freeze({
    handle,
    recordExecution,
    snapshot: service.snapshot,
    statePath,
    get eventCount() { return service.eventCount; },
  });
}

module.exports = Object.freeze({
  SNAPSHOT_FIELDS,
  createFileControlPlaneAdapter,
  readSnapshot,
  validateSnapshot,
  writeSnapshot,
});

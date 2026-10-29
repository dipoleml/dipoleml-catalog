'use strict';

const crypto = require('crypto');
const readline = require('readline');
const {
  MAX_PUBLIC_PAYLOAD_BYTES,
  exactFields,
  validId,
} = require('./contracts');
const { createFileControlPlaneAdapter } = require('./file-adapter');

const STDIO_TRANSPORT_VERSION = 1;
const MAX_NDJSON_LINE_BYTES = MAX_PUBLIC_PAYLOAD_BYTES * 2;
const TRUST_FILE_FIELDS = Object.freeze([
  'control_plane_trust_version', 'kind', 'keys',
]);
const TRUST_KEY_FIELDS = Object.freeze([
  'key_id', 'algorithm', 'public_key_pem',
]);
const REQUIRED_ARGUMENTS = Object.freeze([
  'state',
  'authority-keys',
  'proof-private-key',
  'proof-key-id',
  'proof-issuer-id',
  'installation-id',
]);
const STARTUP_EXIT_CODES = Object.freeze({
  CONFIG_INVALID: 64,
  TRUST_CONFIG_INVALID: 65,
  TRUST_CONFIG_UNREADABLE: 65,
  PROOF_KEY_INVALID: 65,
  PROOF_KEY_UNREADABLE: 65,
  STATE_INVALID: 70,
  STARTUP_FAILED: 70,
});

class ControlPlaneStartupError extends Error {
  constructor(code) {
    super(code);
    this.name = 'ControlPlaneStartupError';
    this.code = code;
    this.exitCode = STARTUP_EXIT_CODES[code] || STARTUP_EXIT_CODES.STARTUP_FAILED;
  }
}

function transportError(errorCode, recoverable, requestId = 'request-invalid') {
  return Object.freeze({
    transport_version: STDIO_TRANSPORT_VERSION,
    kind: 'control_plane_transport_error',
    request_id: validId(requestId) ? requestId : 'request-invalid',
    error_code: errorCode,
    recoverable,
  });
}

function loadAuthorityTrustedKeys(content) {
  let document;
  try {
    document = JSON.parse(content);
  } catch (_error) {
    throw new ControlPlaneStartupError('TRUST_CONFIG_INVALID');
  }
  if (!exactFields(document, TRUST_FILE_FIELDS)
    || document.control_plane_trust_version !== 1
    || document.kind !== 'authority_public_key_map'
    || !Array.isArray(document.keys)
    || document.keys.length < 1
    || document.keys.length > 64) {
    throw new ControlPlaneStartupError('TRUST_CONFIG_INVALID');
  }
  const trustedKeys = new Map();
  for (const item of document.keys) {
    if (!exactFields(item, TRUST_KEY_FIELDS)
      || !validId(item.key_id)
      || item.algorithm !== 'ed25519'
      || typeof item.public_key_pem !== 'string'
      || item.public_key_pem.length > 8192
      || trustedKeys.has(item.key_id)) {
      throw new ControlPlaneStartupError('TRUST_CONFIG_INVALID');
    }
    try {
      const key = crypto.createPublicKey(item.public_key_pem);
      if (key.asymmetricKeyType !== 'ed25519') {
        throw new ControlPlaneStartupError('TRUST_CONFIG_INVALID');
      }
      trustedKeys.set(item.key_id, key);
    } catch (error) {
      if (error instanceof ControlPlaneStartupError) throw error;
      throw new ControlPlaneStartupError('TRUST_CONFIG_INVALID');
    }
  }
  return trustedKeys;
}

function loadProofPrivateKey(content) {
  try {
    const privateKey = crypto.createPrivateKey(content);
    if (privateKey.asymmetricKeyType !== 'ed25519') {
      throw new ControlPlaneStartupError('PROOF_KEY_INVALID');
    }
    return privateKey;
  } catch (error) {
    if (error instanceof ControlPlaneStartupError) throw error;
    throw new ControlPlaneStartupError('PROOF_KEY_INVALID');
  }
}

function parseStdioArguments(argv) {
  if (!Array.isArray(argv)) throw new ControlPlaneStartupError('CONFIG_INVALID');
  if (argv.length === 1 && argv[0] === '--help') return Object.freeze({ help: true });
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (typeof flag !== 'string' || !flag.startsWith('--')
      || !REQUIRED_ARGUMENTS.includes(flag.slice(2))
      || typeof value !== 'string' || value.length < 1
      || Object.hasOwn(values, flag.slice(2))) {
      throw new ControlPlaneStartupError('CONFIG_INVALID');
    }
    values[flag.slice(2)] = value;
  }
  if (argv.length !== REQUIRED_ARGUMENTS.length * 2
    || REQUIRED_ARGUMENTS.some((name) => !Object.hasOwn(values, name))
    || !validId(values['proof-key-id'])
    || !validId(values['proof-issuer-id'])
    || !validId(values['installation-id'])) {
    throw new ControlPlaneStartupError('CONFIG_INVALID');
  }
  return Object.freeze(values);
}

function createStdioControlPlaneAdapter(configuration) {
  if (!configuration || typeof configuration.statePath !== 'string'
    || !(configuration.authorityTrustedKeys instanceof Map)
    || configuration.authorityTrustedKeys.size < 1
    || configuration.proofPrivateKey?.type !== 'private'
    || configuration.proofPrivateKey.asymmetricKeyType !== 'ed25519'
    || !validId(configuration.proofKeyId)
    || !validId(configuration.proofIssuerId)
    || !validId(configuration.installationId)) {
    throw new ControlPlaneStartupError('CONFIG_INVALID');
  }
  try {
    return createFileControlPlaneAdapter({
      statePath: configuration.statePath,
      authorityTrustedKeys: configuration.authorityTrustedKeys,
      proofPrivateKey: configuration.proofPrivateKey,
      proofKeyId: configuration.proofKeyId,
      proofIssuerId: configuration.proofIssuerId,
      installationId: configuration.installationId,
    });
  } catch (_error) {
    throw new ControlPlaneStartupError('STATE_INVALID');
  }
}

function requestIdFromParsed(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value.request_id : 'request-invalid';
}

function writeNdjson(stream, value) {
  stream.write(`${JSON.stringify(value)}\n`);
}

function runNdjsonControlPlane(adapter, streams = {}) {
  const input = streams.input || process.stdin;
  const output = streams.output || process.stdout;
  const lines = readline.createInterface({ input, crlfDelay: Infinity, terminal: false });
  return new Promise((resolve) => {
    let exitCode = 0;
    let settled = false;
    function finish() {
      if (settled) return;
      settled = true;
      resolve(exitCode);
    }
    lines.on('line', (line) => {
      if (exitCode !== 0 || line.trim().length === 0) return;
      if (Buffer.byteLength(line, 'utf8') > MAX_NDJSON_LINE_BYTES) {
        writeNdjson(output, transportError('REQUEST_LINE_TOO_LARGE', true));
        return;
      }
      let request;
      try {
        request = JSON.parse(line);
      } catch (_error) {
        writeNdjson(output, transportError('MALFORMED_JSON', true));
        return;
      }
      try {
        writeNdjson(output, adapter.handle(request));
      } catch (_error) {
        exitCode = STARTUP_EXIT_CODES.STARTUP_FAILED;
        writeNdjson(output, transportError(
          'REQUEST_PROCESSING_FAILED',
          false,
          requestIdFromParsed(request),
        ));
        lines.close();
      }
    });
    lines.once('close', finish);
    lines.once('error', () => {
      exitCode = STARTUP_EXIT_CODES.STARTUP_FAILED;
      finish();
    });
  });
}

const USAGE = 'Usage: control-plane-stdio.js --state FILE --authority-keys FILE '
  + '--proof-private-key FILE --proof-key-id ID --proof-issuer-id ID --installation-id ID';

module.exports = Object.freeze({
  ControlPlaneStartupError,
  MAX_NDJSON_LINE_BYTES,
  REQUIRED_ARGUMENTS,
  STARTUP_EXIT_CODES,
  STDIO_TRANSPORT_VERSION,
  TRUST_FILE_FIELDS,
  TRUST_KEY_FIELDS,
  USAGE,
  createStdioControlPlaneAdapter,
  loadAuthorityTrustedKeys,
  loadProofPrivateKey,
  parseStdioArguments,
  runNdjsonControlPlane,
  transportError,
});

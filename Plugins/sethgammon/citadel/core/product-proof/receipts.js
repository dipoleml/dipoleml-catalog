'use strict';

const crypto = require('crypto');

const {
  SCHEMA,
  canonical,
  digest,
  unsignedReceipt,
  validateProtocol,
  validateReceipt,
  validateRecord,
} = require('./trial-contract');

function parsePrivateKey(value) {
  const key = value && value.type === 'private' ? value : crypto.createPrivateKey(value);
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('receipt signing key must be Ed25519');
  return key;
}

function parsePublicKey(value) {
  const key = value && value.type === 'public' ? value : crypto.createPublicKey(value);
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('receipt verification key must be Ed25519');
  return key;
}

function signReceipt(records, privateKey, options = {}) {
  if (!Array.isArray(records) || records.length < 1) throw new Error('records must be a non-empty array');
  records.forEach(validateRecord);
  const protocolIds = new Set(records.map((record) => record.protocol_id));
  if (protocolIds.size !== 1) throw new Error('receipt records mix protocol identities');
  const recordAssignmentIds = [...new Set(records
    .filter((record) => Object.prototype.hasOwnProperty.call(record, 'assignment_id'))
    .map((record) => record.assignment_id))];
  const assignmentId = options.assignmentId || recordAssignmentIds[0];
  if (!assignmentId) throw new Error('assignmentId is required for retention-only receipts');
  if (recordAssignmentIds.some((value) => value !== assignmentId)) {
    throw new Error('receipt records mix assignment identities');
  }
  const key = parsePrivateKey(privateKey);
  const receipt = {
    schema: SCHEMA,
    kind: 'product_proof_receipt_v2',
    protocol_id: records[0].protocol_id,
    assignment_id: assignmentId,
    issued_at: (options.now || new Date()).toISOString(),
    signer: options.signer || 'local-facilitator',
    records,
    signature: null,
  };
  const value = crypto.sign(null, Buffer.from(canonical(receipt)), key).toString('base64');
  const signed = {
    ...receipt,
    signature: { algorithm: 'ed25519', value_base64: value },
  };
  return validateReceipt(signed, options.protocol ? { protocol: options.protocol } : {});
}

function verifyReceiptSignature(receipt, publicKey, options = {}) {
  try {
    validateReceipt(receipt, options.protocol ? { protocol: options.protocol } : {});
    const key = parsePublicKey(publicKey);
    return crypto.verify(
      null,
      Buffer.from(canonical(unsignedReceipt(receipt))),
      key,
      Buffer.from(receipt.signature.value_base64, 'base64'),
    );
  } catch {
    return false;
  }
}

function verifyPinnedReceipt(receipt, protocol) {
  validateProtocol(protocol);
  if (!protocol.signing_public_key) return false;
  return verifyReceiptSignature(receipt, protocol.signing_public_key, { protocol });
}

function receiptIdentity(receipt) {
  validateReceipt(receipt);
  return `sha256:${digest(receipt)}`;
}

module.exports = Object.freeze({
  receiptIdentity,
  signReceipt,
  verifyPinnedReceipt,
  verifyReceiptSignature,
});

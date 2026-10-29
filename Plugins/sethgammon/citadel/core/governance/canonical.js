'use strict';

const {
  canonicalSerialize,
  sha256Digest,
} = require('../operations/canonical');

function canonicalClone(value) {
  return JSON.parse(canonicalSerialize(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function digestWithout(value, field) {
  const clone = canonicalClone(value);
  delete clone[field];
  return sha256Digest(clone);
}

function finalizeDigest(value, field) {
  const base = canonicalClone(value);
  delete base[field];
  return deepFreeze({ ...base, [field]: sha256Digest(base) });
}

module.exports = Object.freeze({
  canonicalClone,
  canonicalSerialize,
  deepFreeze,
  digestWithout,
  finalizeDigest,
  sha256Digest,
});

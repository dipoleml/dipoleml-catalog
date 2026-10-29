'use strict';

const { PROHIBITED_KEY } = require('./trial-contract');

const PRIVATE_STRING = /(?:[A-Za-z]:[\\/]|\/(?:Users|home|private|tmp)\/|https?:\/\/|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/;

function assertPublicAggregate(value, label = 'public aggregate') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertPublicAggregate(item, `${label}[${index}]`));
    return value;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (PROHIBITED_KEY.test(key)) throw new Error(`${label} contains prohibited field: ${key}`);
      assertPublicAggregate(item, `${label}.${key}`);
    }
    return value;
  }
  if (typeof value === 'string' && PRIVATE_STRING.test(value)) {
    throw new Error(`${label} contains a path, URL, or email-like value`);
  }
  return value;
}

function suppressCell(cell, minimum) {
  if (!cell || !Number.isInteger(cell.assigned) || cell.assigned < minimum) {
    return {
      suppressed: true,
      assigned: null,
      accepted_verified: null,
      accepted_verified_rate: null,
      missing_scores: null,
      false_passes: null,
    };
  }
  return {
    suppressed: false,
    assigned: cell.assigned,
    accepted_verified: cell.accepted_verified,
    accepted_verified_rate: cell.accepted_verified_rate,
    missing_scores: cell.missing_scores,
    false_passes: cell.false_passes,
  };
}

module.exports = Object.freeze({
  assertPublicAggregate,
  suppressCell,
});

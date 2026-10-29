'use strict';

const canonical = require('./canonical');
const authority = require('./authority');
const constants = require('./constants');
const contracts = require('./contracts');
const evaluator = require('./evaluator');
const journal = require('./journal');
const receipts = require('./receipts');
const reasons = require('./reasons');
const store = require('./store');

module.exports = Object.freeze({
  ...authority,
  ...canonical,
  ...constants,
  ...contracts,
  ...evaluator,
  ...journal,
  ...receipts,
  ...reasons,
  ...store,
});

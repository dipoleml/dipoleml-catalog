'use strict';

module.exports = Object.freeze({
  ...require('./trial-contract'),
  ...require('./assignment'),
  ...require('./receipts'),
  ...require('./scoring'),
  ...require('./redaction'),
  ...require('./aggregate'),
  ...require('./store'),
});

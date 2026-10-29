'use strict';

module.exports = Object.freeze({
  ...require('./vendor/contracts'),
  app: require('./app'),
  controlPlane: require('./control-plane'),
  operations: require('./vendor/operations'),
  schemaVersion: require('./vendor/telemetry/schema').SCHEMA_VERSION,
});

'use strict';

const KNOWN_STATE_SCHEMAS = Object.freeze(['citadel-state-v1']);
const MIGRATION_FIELDS = Object.freeze([
  'reads', 'writes', 'reversible', 'minimum_code_version',
]);

function exactFields(value, fields) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
}

function parseVersion(value) {
  const match = String(value || '').match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return null;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return 0;
}

function validateMigration(metadata) {
  const errors = [];
  if (!exactFields(metadata, MIGRATION_FIELDS)) return ['migration fields must exactly match the v1 contract'];
  for (const field of ['reads', 'writes']) {
    if (!Array.isArray(metadata[field]) || metadata[field].length === 0
        || metadata[field].some((item) => typeof item !== 'string' || !item)) {
      errors.push(`migration.${field} must be a non-empty string array`);
    }
  }
  if (typeof metadata.reversible !== 'boolean') errors.push('migration.reversible must be boolean');
  if (!parseVersion(metadata.minimum_code_version)) errors.push('migration.minimum_code_version must be semantic version');
  return errors;
}

function evaluateMigration(metadata, input = {}) {
  const errors = validateMigration(metadata);
  const known = new Set(input.knownSchemas || KNOWN_STATE_SCHEMAS);
  if (errors.length) return { compatible: false, code: 'MIGRATION_METADATA_INVALID', errors };
  const unknown = [...metadata.reads, ...metadata.writes].filter((schema) => !known.has(schema));
  if (unknown.length) {
    return { compatible: false, code: 'STATE_SCHEMA_UNKNOWN', errors: [`Unknown state schemas: ${[...new Set(unknown)].join(', ')}`] };
  }
  if (!metadata.reads.includes(input.currentSchema)) {
    return { compatible: false, code: 'STATE_SCHEMA_INCOMPATIBLE', errors: [`Migration cannot read ${input.currentSchema}`] };
  }
  const versionOrder = compareVersions(metadata.minimum_code_version, input.codeVersion);
  if (versionOrder === null || versionOrder > 0) {
    return {
      compatible: false,
      code: 'MINIMUM_CODE_VERSION_UNMET',
      errors: [`Migration requires ${metadata.minimum_code_version}; source is ${input.codeVersion}`],
    };
  }
  return { compatible: true, code: 'MIGRATION_COMPATIBLE', nextSchema: metadata.writes[0], errors: [] };
}

function baselineMigration() {
  return {
    reads: ['citadel-state-v1'],
    writes: ['citadel-state-v1'],
    reversible: true,
    minimum_code_version: '0.0.0',
  };
}

module.exports = Object.freeze({
  KNOWN_STATE_SCHEMAS, MIGRATION_FIELDS, baselineMigration, compareVersions,
  evaluateMigration, parseVersion, validateMigration,
});

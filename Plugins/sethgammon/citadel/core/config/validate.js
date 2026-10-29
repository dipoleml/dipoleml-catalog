'use strict';

const {
  BUNDLE_IDS,
  CHECKPOINT_LEVELS,
  CONFIG_SCHEMA_VERSION,
  ON_DEMAND_MODES,
  POLICY_FIELDS,
  PROFILE_IDS,
  SCHEMA_URL,
  TOP_LEVEL_FIELDS,
  plain,
} = require('./contract');
const { getProfile } = require('./profiles');

const CONSENT_VALUES = Object.freeze(['always-ask', 'session-allow', 'auto-allow']);
const CONSENT_FIELDS = Object.freeze(['externalActions', 'daemonSpend', 'fleetSpawn']);
const TRUST_FIELDS = Object.freeze([
  'sessionsCompleted',
  'campaignsCompleted',
  'campaignsReverted',
  'fleetCleanMerges',
  'improveLoopsAccepted',
  'daemonRuns',
  'override',
]);

function exactFields(value, allowed, label, errors, required = allowed) {
  if (!plain(value)) {
    errors.push(`${label} must be a plain object`);
    return false;
  }
  const unknown = Object.keys(value).filter((field) => !allowed.includes(field));
  const missing = required.filter((field) => !(field in value));
  if (unknown.length) errors.push(`${label} has unknown fields: ${unknown.join(', ')}`);
  if (missing.length) errors.push(`${label} is missing fields: ${missing.join(', ')}`);
  return true;
}

function integer(value, label, errors) {
  if (!Number.isInteger(value) || value < 0) errors.push(`${label} must be a nonnegative integer`);
}

function validateConstraints(value, label = 'operating policy') {
  const errors = [];
  if (!plain(value)) return [`${label} must be a plain object`];
  const unknown = Object.keys(value).filter((field) => !POLICY_FIELDS.includes(field));
  if (unknown.length) errors.push(`${label} has unknown fields: ${unknown.join(', ')}`);
  for (const field of ['maxParallelAgents', 'maxBudgetUnits', 'verifierRetryLimit']) {
    if (field in value) integer(value[field], `${label}.${field}`, errors);
  }
  if ('checkpointMinimum' in value && !CHECKPOINT_LEVELS.includes(value.checkpointMinimum)) {
    errors.push(`${label}.checkpointMinimum is invalid`);
  }
  for (const field of [
    'allowIndependentOnUnknown',
    'allowAutoWorktreeIntegration',
    'allowConsentGatedExternalMerge',
    'requireArchitectureApproval',
  ]) {
    if (field in value && typeof value[field] !== 'boolean') {
      errors.push(`${label}.${field} must be boolean`);
    }
  }
  return errors;
}

function validateProfile(execution, errors) {
  if (!exactFields(execution, ['profile'], 'execution', errors)) return;
  const profile = execution.profile;
  if (!exactFields(profile, ['id', 'version'], 'execution.profile', errors)) return;
  if (!PROFILE_IDS.includes(profile.id)) errors.push('execution.profile.id is invalid');
  if (typeof profile.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(profile.version)) {
    errors.push('execution.profile.version must be an exact semantic version');
  } else {
    try {
      getProfile(profile);
    } catch (error) {
      errors.push(error.message);
    }
  }
}

function validateActivation(activation, errors) {
  const fields = ['bundles', 'onDemand', 'allowDegradedRuntime'];
  if (!exactFields(activation, fields, 'activation', errors)) return;
  if (!Array.isArray(activation.bundles) || activation.bundles.length === 0) {
    errors.push('activation.bundles must be a non-empty array');
  } else {
    if (new Set(activation.bundles).size !== activation.bundles.length) {
      errors.push('activation.bundles must be unique');
    }
    const unknown = activation.bundles.filter((bundle) => !BUNDLE_IDS.includes(bundle));
    if (unknown.length) errors.push(`activation.bundles has unknown values: ${unknown.join(', ')}`);
    if (!activation.bundles.includes('core')) errors.push('activation.bundles must include core');
  }
  if (!ON_DEMAND_MODES.includes(activation.onDemand)) errors.push('activation.onDemand is invalid');
  if (typeof activation.allowDegradedRuntime !== 'boolean') {
    errors.push('activation.allowDegradedRuntime must be boolean');
  }
}

function validateConsent(consent, errors) {
  if (!exactFields(consent, CONSENT_FIELDS, 'consent', errors, [])) return;
  for (const [field, value] of Object.entries(consent)) {
    if (!CONSENT_VALUES.includes(value)) errors.push(`consent.${field} is invalid`);
  }
}

function validateTrust(trust, errors) {
  if (!exactFields(trust, TRUST_FIELDS, 'trust', errors, [])) return;
  for (const field of TRUST_FIELDS.filter((name) => name !== 'override')) {
    if (field in trust) integer(trust[field], `trust.${field}`, errors);
  }
  if ('override' in trust && trust.override !== null
    && !['novice', 'familiar', 'trusted'].includes(trust.override)) {
    errors.push('trust.override is invalid');
  }
}

function validateExtensions(extensions, errors) {
  if (!plain(extensions)) {
    errors.push('extensions must be a plain object');
    return;
  }
  for (const key of Object.keys(extensions)) {
    if (!/^[A-Za-z0-9][A-Za-z0-9-]*(?:\.[A-Za-z0-9][A-Za-z0-9-]*)+$/.test(key)) {
      errors.push(`extensions key must be namespaced: ${key}`);
    }
  }
}

function validateStringArray(value, label, errors) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    errors.push(`${label} must be an array of strings`);
    return;
  }
  if (new Set(value).size !== value.length) errors.push(`${label} must be unique`);
}

function validateCompatibilityFields(value, errors) {
  for (const field of ['language', 'packageManager']) {
    if (field in value && typeof value[field] !== 'string') {
      errors.push(`${field} must be a string`);
    }
  }
  if ('framework' in value && value.framework !== null && typeof value.framework !== 'string') {
    errors.push('framework must be a string or null');
  }
  for (const field of [
    'typecheck',
    'test',
    'qualityRules',
    'features',
    'agentTimeouts',
    'storage',
    'policy',
    'organization',
    'telemetry',
    'cost',
    'verification',
    'preCompact',
    'worktreeReadiness',
    'docs',
  ]) {
    if (field in value && !plain(value[field])) errors.push(`${field} must be a plain object`);
  }
  for (const field of ['protectedFiles', 'registeredSkills']) {
    if (field in value) validateStringArray(value[field], field, errors);
  }
  if ('registeredSkillCount' in value) {
    integer(value.registeredSkillCount, 'registeredSkillCount', errors);
  }
  if ('dependencyPatterns' in value
    && !Array.isArray(value.dependencyPatterns)
    && !plain(value.dependencyPatterns)) {
    errors.push('dependencyPatterns must be an array or plain object');
  }
  if ('allowEnvWrites' in value && typeof value.allowEnvWrites !== 'boolean') {
    errors.push('allowEnvWrites must be boolean');
  }
}

function validateConfigV2(value) {
  const errors = [];
  if (!plain(value)) return ['config must be a plain object'];
  const unknown = Object.keys(value).filter((field) => !TOP_LEVEL_FIELDS.includes(field));
  if (unknown.length) errors.push(`config has unknown fields: ${unknown.join(', ')}`);
  for (const required of ['$schema', 'schemaVersion', 'execution', 'activation']) {
    if (!(required in value)) errors.push(`config is missing field: ${required}`);
  }
  if (value.$schema !== SCHEMA_URL) errors.push(`$schema must be ${SCHEMA_URL}`);
  if (value.schemaVersion !== CONFIG_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${CONFIG_SCHEMA_VERSION}`);
  }
  if ('execution' in value) validateProfile(value.execution, errors);
  if ('activation' in value) validateActivation(value.activation, errors);
  if ('consent' in value) validateConsent(value.consent, errors);
  if ('trust' in value) validateTrust(value.trust, errors);
  if ('extensions' in value) validateExtensions(value.extensions, errors);
  validateCompatibilityFields(value, errors);
  if (plain(value.policy) && 'operating' in value.policy) {
    errors.push(...validateConstraints(value.policy.operating, 'policy.operating'));
  }
  return errors;
}

function assertConfigV2(value) {
  const errors = validateConfigV2(value);
  if (errors.length) throw new TypeError(`Invalid harness config v2: ${errors.join('; ')}`);
  return value;
}

module.exports = Object.freeze({
  CONSENT_FIELDS,
  CONSENT_VALUES,
  TRUST_FIELDS,
  assertConfigV2,
  validateConfigV2,
  validateConstraints,
});

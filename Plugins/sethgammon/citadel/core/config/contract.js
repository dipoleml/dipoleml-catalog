'use strict';

const CONFIG_SCHEMA_VERSION = 2;
const OPERATING_POLICY_VERSION = 1;
const PROFILE_VERSION = '1.0.0';
const SCHEMA_URL =
  'https://raw.githubusercontent.com/SethGammon/Citadel/v2.0.0/schemas/harness-config-v2.schema.json';

const PROFILE_IDS = Object.freeze([
  'strict-supervised',
  'standard',
  'experimental',
]);

const BUNDLE_IDS = Object.freeze([
  'core',
  'persistence',
  'parallel',
  'operations',
  'delivery',
]);

const ON_DEMAND_MODES = Object.freeze(['prompt', 'deny', 'auto-safe']);
const SUPPORT_LEVELS = Object.freeze(['full', 'partial', 'none']);

const POLICY_FIELDS = Object.freeze([
  'maxParallelAgents',
  'maxBudgetUnits',
  'verifierRetryLimit',
  'checkpointMinimum',
  'allowIndependentOnUnknown',
  'allowAutoWorktreeIntegration',
  'allowConsentGatedExternalMerge',
  'requireArchitectureApproval',
]);

const CHECKPOINT_LEVELS = Object.freeze([
  'destructive-only',
  'risk-boundaries',
  'every-mutation',
]);

const TOP_LEVEL_FIELDS = Object.freeze([
  '$schema',
  'schemaVersion',
  'execution',
  'activation',
  'language',
  'framework',
  'packageManager',
  'typecheck',
  'test',
  'qualityRules',
  'protectedFiles',
  'features',
  'registeredSkills',
  'registeredSkillCount',
  'agentTimeouts',
  'trust',
  'consent',
  'storage',
  'policy',
  'dependencyPatterns',
  'organization',
  'telemetry',
  'cost',
  'verification',
  'preCompact',
  'worktreeReadiness',
  'docs',
  'allowEnvWrites',
  'extensions',
]);

function plain(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function createDefaultConfig() {
  return {
    $schema: SCHEMA_URL,
    schemaVersion: CONFIG_SCHEMA_VERSION,
    execution: {
      profile: { id: 'standard', version: PROFILE_VERSION },
    },
    activation: {
      bundles: ['core', 'persistence'],
      onDemand: 'prompt',
      allowDegradedRuntime: false,
    },
    consent: {
      externalActions: 'session-allow',
      daemonSpend: 'always-ask',
      fleetSpawn: 'always-ask',
    },
    trust: {
      sessionsCompleted: 0,
      campaignsCompleted: 0,
      campaignsReverted: 0,
      fleetCleanMerges: 0,
      improveLoopsAccepted: 0,
      daemonRuns: 0,
      override: null,
    },
    policy: {},
    extensions: {},
  };
}

module.exports = Object.freeze({
  BUNDLE_IDS,
  CHECKPOINT_LEVELS,
  CONFIG_SCHEMA_VERSION,
  ON_DEMAND_MODES,
  OPERATING_POLICY_VERSION,
  POLICY_FIELDS,
  PROFILE_IDS,
  PROFILE_VERSION,
  SCHEMA_URL,
  SUPPORT_LEVELS,
  TOP_LEVEL_FIELDS,
  createDefaultConfig,
  deepFreeze,
  plain,
});

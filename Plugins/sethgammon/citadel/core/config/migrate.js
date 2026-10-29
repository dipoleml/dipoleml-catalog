'use strict';

const { sha256Digest } = require('../operations/canonical');
const {
  CONFIG_SCHEMA_VERSION,
  PROFILE_VERSION,
  SCHEMA_URL,
  TOP_LEVEL_FIELDS,
  createDefaultConfig,
  plain,
} = require('./contract');
const { dependencyClosure, dependentsOf, assertBundleId } = require('./bundle-catalog');
const { getProfile } = require('./profiles');
const { validateConfigV2 } = require('./validate');

function trustNumber(trust, canonical, snake, legacy) {
  for (const key of [canonical, snake, legacy]) {
    if (Number.isInteger(trust[key]) && trust[key] >= 0) return trust[key];
  }
  return 0;
}

function normalizeTrust(value) {
  const trust = plain(value) ? value : {};
  return {
    sessionsCompleted: trustNumber(trust, 'sessionsCompleted', 'sessions_completed', 'sessionCount'),
    campaignsCompleted: trustNumber(trust, 'campaignsCompleted', 'campaigns_completed', 'campaignCount'),
    campaignsReverted: trustNumber(trust, 'campaignsReverted', 'campaigns_reverted'),
    fleetCleanMerges: trustNumber(trust, 'fleetCleanMerges', 'fleet_clean_merges'),
    improveLoopsAccepted: trustNumber(trust, 'improveLoopsAccepted', 'improve_loops_accepted'),
    daemonRuns: trustNumber(trust, 'daemonRuns', 'daemon_runs'),
    override: ['novice', 'familiar', 'trusted'].includes(trust.override) ? trust.override : null,
  };
}

function configKind(raw) {
  if (raw === undefined || raw === null) return 'new';
  if (!plain(raw)) return 'invalid';
  if (!('schemaVersion' in raw)) return 'legacy';
  if (raw.schemaVersion === CONFIG_SCHEMA_VERSION) return 'v2';
  if (Number.isInteger(raw.schemaVersion) && raw.schemaVersion > CONFIG_SCHEMA_VERSION) return 'future';
  return 'unsupported';
}

function migrationCandidate(raw, options = {}) {
  const kind = configKind(raw);
  if (kind === 'future' || kind === 'unsupported' || kind === 'invalid') {
    throw new TypeError(`Cannot migrate ${kind} harness config`);
  }
  const profile = getProfile(options.profile || (kind === 'v2'
    ? raw.execution.profile
    : { id: 'standard', version: PROFILE_VERSION }));
  const bundles = dependencyClosure(options.bundles || (kind === 'v2'
    ? raw.activation.bundles
    : ['core', 'persistence']));
  const base = kind === 'new' ? createDefaultConfig() : { ...raw };
  return {
    ...base,
    $schema: SCHEMA_URL,
    schemaVersion: CONFIG_SCHEMA_VERSION,
    execution: { profile: { id: profile.id, version: profile.version } },
    activation: {
      bundles,
      onDemand: options.onDemand || raw?.activation?.onDemand || 'prompt',
      allowDegradedRuntime: options.allowDegradedRuntime
        ?? raw?.activation?.allowDegradedRuntime
        ?? false,
    },
    trust: normalizeTrust(raw?.trust || base.trust),
    policy: plain(raw?.policy) ? raw.policy : {},
    extensions: plain(raw?.extensions) ? raw.extensions : {},
  };
}

function migrationChanges(raw, candidate) {
  const changes = [];
  const kind = configKind(raw);
  if (kind !== 'v2') changes.push({ field: 'schemaVersion', from: raw?.schemaVersion ?? null, to: 2 });
  for (const field of ['execution', 'activation', 'trust']) {
    if (sha256Digest(raw?.[field] ?? null) !== sha256Digest(candidate[field])) {
      changes.push({ field, from: raw?.[field] ?? null, to: candidate[field] });
    }
  }
  if (raw?.$schema !== candidate.$schema) {
    changes.push({ field: '$schema', from: raw?.$schema ?? null, to: candidate.$schema });
  }
  return changes.sort((a, b) => (a.field < b.field ? -1 : a.field > b.field ? 1 : 0));
}

function createMigrationPlan(raw, options = {}) {
  const source = raw === undefined ? null : raw;
  let candidate;
  let errors = [];
  try {
    candidate = migrationCandidate(raw, options);
    errors = validateConfigV2(candidate);
  } catch (error) {
    errors = [error.message];
    candidate = null;
  }
  if (plain(raw)) {
    const unknown = Object.keys(raw).filter((field) => !TOP_LEVEL_FIELDS.includes(field));
    if (unknown.length) errors.push(`legacy config has unmapped fields: ${unknown.join(', ')}`);
  }
  const body = {
    contractVersion: 1,
    action: options.action || 'migrate',
    sourceKind: configKind(raw),
    sourceDigest: sha256Digest(source),
    candidateDigest: candidate ? sha256Digest(candidate) : null,
    changes: candidate ? migrationChanges(raw, candidate) : [],
    errors,
    blocked: errors.length > 0,
    candidateConfig: candidate,
  };
  return Object.freeze({ ...body, planDigest: sha256Digest(body) });
}

function withProfile(raw, reference) {
  const candidate = migrationCandidate(raw);
  const profile = getProfile(reference);
  return {
    ...candidate,
    execution: { profile: { id: profile.id, version: profile.version } },
  };
}

function withBundleEnabled(raw, bundleId) {
  assertBundleId(bundleId);
  const candidate = migrationCandidate(raw);
  return {
    ...candidate,
    activation: {
      ...candidate.activation,
      bundles: dependencyClosure([...candidate.activation.bundles, bundleId]),
    },
  };
}

function withBundleDisabled(raw, bundleId) {
  assertBundleId(bundleId);
  if (bundleId === 'core') throw new TypeError('The core bundle cannot be disabled');
  const candidate = migrationCandidate(raw);
  const removed = new Set(dependentsOf(bundleId));
  return {
    ...candidate,
    activation: {
      ...candidate.activation,
      bundles: candidate.activation.bundles.filter((id) => !removed.has(id)),
    },
  };
}

function createChangePlan(raw, action, transform) {
  let candidate = null;
  let errors = [];
  try {
    candidate = transform(raw);
    errors = validateConfigV2(candidate);
  } catch (error) {
    errors = [error.message];
  }
  const body = {
    contractVersion: 1,
    action,
    sourceKind: configKind(raw),
    sourceDigest: sha256Digest(raw === undefined ? null : raw),
    candidateDigest: candidate ? sha256Digest(candidate) : null,
    changes: candidate ? migrationChanges(raw, candidate) : [],
    errors,
    blocked: errors.length > 0,
    candidateConfig: candidate,
  };
  return Object.freeze({ ...body, planDigest: sha256Digest(body) });
}

module.exports = Object.freeze({
  configKind,
  createChangePlan,
  createMigrationPlan,
  migrationCandidate,
  normalizeTrust,
  withBundleDisabled,
  withBundleEnabled,
  withProfile,
});

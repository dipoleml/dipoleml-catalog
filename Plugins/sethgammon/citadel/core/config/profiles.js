'use strict';

const { sha256Digest } = require('../operations/canonical');
const {
  OPERATING_POLICY_VERSION,
  PROFILE_IDS,
  PROFILE_VERSION,
  deepFreeze,
} = require('./contract');

const RELEASED_PROFILE_DIGESTS = deepFreeze({
  'strict-supervised@1.0.0': 'sha256:882048a6843e4973c5ee98150f85adca7641c4865d3f1598080fb8393500733b',
  'standard@1.0.0': 'sha256:b0957be6fb656a7822420fec545a3ba2f8140baed15b831a81c10030f2ac5a9d',
  'experimental@1.0.0': 'sha256:4534c9e7f4552af3e5d8f01949795ea1cdcf5e4dc7fd436ece67c509c80f8341',
  'legacy@1.0.0': 'sha256:2f5ec837c0f6eac28667e30c4b3a0b2083347892ddd9a840795084356c448d74',
});

function definition(id, description, policy) {
  const base = {
    contractVersion: OPERATING_POLICY_VERSION,
    id,
    version: PROFILE_VERSION,
    description,
    policy,
    invariants: {
      missingEvidenceNeverPasses: true,
      terminalSuccessRequiresProof: true,
      unsupportedBundlesNeverExecute: true,
      tierOneSafetyAlwaysApplies: true,
      riskAcceptanceNeverChangesEvidence: true,
    },
  };
  return deepFreeze({ ...base, digest: sha256Digest(base) });
}

const PROFILE_CATALOG = deepFreeze({
  'strict-supervised@1.0.0': definition(
    'strict-supervised',
    'Explicit evidence, architecture, checkpoint, integration, and budget boundaries.',
    {
      maxParallelAgents: 2,
      maxBudgetUnits: 0,
      verifierRetryLimit: 0,
      checkpointMinimum: 'every-mutation',
      allowIndependentOnUnknown: false,
      allowAutoWorktreeIntegration: false,
      allowConsentGatedExternalMerge: false,
      requireArchitectureApproval: true,
    },
  ),
  'standard@1.0.0': definition(
    'standard',
    'Bounded retries, independent verified progress, and risk-based checkpoints.',
    {
      maxParallelAgents: 3,
      maxBudgetUnits: 50,
      verifierRetryLimit: 1,
      checkpointMinimum: 'risk-boundaries',
      allowIndependentOnUnknown: true,
      allowAutoWorktreeIntegration: true,
      allowConsentGatedExternalMerge: false,
      requireArchitectureApproval: true,
    },
  ),
  'experimental@1.0.0': definition(
    'experimental',
    'More reversible autonomy within explicit ceilings; proof remains mandatory.',
    {
      maxParallelAgents: 5,
      maxBudgetUnits: 100,
      verifierRetryLimit: 1,
      checkpointMinimum: 'destructive-only',
      allowIndependentOnUnknown: true,
      allowAutoWorktreeIntegration: true,
      allowConsentGatedExternalMerge: true,
      requireArchitectureApproval: true,
    },
  ),
  'legacy@1.0.0': definition(
    'legacy',
    'Compatibility-only interpretation of an unversioned Citadel installation.',
    {
      maxParallelAgents: 5,
      maxBudgetUnits: 100,
      verifierRetryLimit: 3,
      checkpointMinimum: 'destructive-only',
      allowIndependentOnUnknown: true,
      allowAutoWorktreeIntegration: true,
      allowConsentGatedExternalMerge: true,
      requireArchitectureApproval: false,
    },
  ),
});

for (const [key, profile] of Object.entries(PROFILE_CATALOG)) {
  if (profile.digest !== RELEASED_PROFILE_DIGESTS[key]) {
    throw new Error(
      `Released profile ${key} changed without a versioned digest update: ${profile.digest}`,
    );
  }
}

function profileKey(reference) {
  if (typeof reference === 'string') {
    return reference.includes('@') ? reference : `${reference}@${PROFILE_VERSION}`;
  }
  if (reference && typeof reference === 'object') {
    return `${reference.id}@${reference.version}`;
  }
  return '';
}

function getProfile(reference, options = {}) {
  const key = profileKey(reference);
  const profile = PROFILE_CATALOG[key];
  if (!profile) throw new TypeError(`Unknown execution profile: ${key || String(reference)}`);
  if (!options.allowLegacy && profile.id === 'legacy') {
    throw new TypeError('The legacy profile is compatibility-only and cannot be selected in config v2');
  }
  return profile;
}

function listProfiles(options = {}) {
  return Object.freeze(Object.values(PROFILE_CATALOG)
    .filter((profile) => options.includeLegacy || PROFILE_IDS.includes(profile.id)));
}

module.exports = Object.freeze({
  PROFILE_CATALOG,
  RELEASED_PROFILE_DIGESTS,
  getProfile,
  listProfiles,
  profileKey,
});

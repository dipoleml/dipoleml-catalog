import { createCommandAnalysisPolicy } from './effective-rules';
import { deriveEffectiveSafetyLevel } from './env';
import type { EffectiveSafetyCapabilities, PolicySnapshot } from './types';

type PolicyContextOptions = {
  policySnapshot: Pick<PolicySnapshot, 'policy'>;
  effectiveCapabilities: EffectiveSafetyCapabilities;
  worktreeMode?: boolean;
};

export function resolveCommandAnalysisContext(options: PolicyContextOptions) {
  const capabilities = options.effectiveCapabilities;
  const strict = capabilities.fail_closed.enabled;
  const paranoidRm = capabilities.paranoid_rm.enabled;
  const paranoidInterpreters = capabilities.paranoid_interpreters.enabled;
  return {
    policy: createCommandAnalysisPolicy(options.policySnapshot.policy, capabilities),
    effectiveCapabilities: capabilities,
    effectiveLevel: deriveEffectiveSafetyLevel({
      failClosed: strict,
      paranoidRm,
      paranoidInterpreters,
    }),
    strict,
    paranoidRm,
    paranoidInterpreters,
    worktreeMode: options.worktreeMode ?? false,
  };
}

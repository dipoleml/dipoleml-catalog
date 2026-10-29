import { dirname, join } from 'node:path';
import type { Environment } from '@/core/environment';
import {
  getPolicyFilesystemTargetForPath,
  type PolicyFilesystemScope,
  type PolicyFilesystemTarget,
} from '@/core/io/safe-read';
import {
  getProjectPolicyFilesystemScope,
  getProjectRulesConfigPath,
  getUserPolicyFilesystemScope,
  getUserRulesConfigPath,
} from '@/core/policy/paths';
import type { SyncRulesConfigOptions } from './types';

const RULES_LOCK_FILE = 'rule.lock';

export interface ScopePaths {
  configDir: string;
  configPath: string;

  lockPath: string;
  filesystemScope: PolicyFilesystemScope;
  configTarget: PolicyFilesystemTarget;
  lockTarget: PolicyFilesystemTarget;
}

/** @internal */
export function getRulesLockPathForConfigPath(configPath: string): string {
  return join(dirname(configPath), RULES_LOCK_FILE);
}

export function getScopePaths(
  environment: Environment,
  options: SyncRulesConfigOptions,
): ScopePaths {
  const configPath = options.global
    ? (options.userConfigPath ?? getUserRulesConfigPath(environment, options))
    : (options.projectConfigPath ?? getProjectRulesConfigPath(options.cwd ?? process.cwd()));
  const filesystemScope = options.global
    ? getUserPolicyFilesystemScope(environment, options)
    : getProjectPolicyFilesystemScope(configPath, options.cwd ?? process.cwd());
  const lockPath = getRulesLockPathForConfigPath(configPath);
  return {
    configDir: dirname(configPath),
    configPath,
    lockPath,
    filesystemScope,
    configTarget: getPolicyFilesystemTargetForPath(filesystemScope, configPath),
    lockTarget: getPolicyFilesystemTargetForPath(filesystemScope, lockPath),
  };
}

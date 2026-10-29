import { chmodSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Environment } from '@/core/environment';
import { bindDelegatedPolicyFilesystemTarget, writePolicyFileAtomic } from '@/core/io/safe-read';
import { getUserPolicyPath, type UserScopeOptions } from './paths';
import {
  createDefaultGuiPolicy,
  createPolicyPreview,
  DEFAULT_GUI_POLICY,
  normalizeGuiPolicy,
  type PolicyPreview,
} from './store';
import type { GuiPolicy } from './types';
import { salvageUserPolicy } from './user-policy-diagnostics';

export interface GuiPolicyReadResult {
  path: string;
  exists: boolean;
  raw: string;
  policy: GuiPolicy;
  errors: string[];
}

export interface GuiPolicyWriteResult {
  path: string;
  policy: GuiPolicy;
  errors: string[];
}

export function readUserPolicyForGui(
  environment: Environment,
  options: UserScopeOptions = {},
): GuiPolicyReadResult {
  const path = getUserPolicyPath(environment, options);
  if (!existsSync(path)) {
    return {
      path,
      exists: false,
      raw: '',
      policy: createDefaultGuiPolicy(),
      errors: [],
    };
  }

  const raw = readFileSync(path, 'utf-8');
  if (!raw.trim()) {
    return {
      path,
      exists: true,
      raw,
      policy: createDefaultGuiPolicy(),
      errors: ['Config file is empty'],
    };
  }

  try {
    const salvaged = salvageUserPolicy(JSON.parse(raw) as unknown, environment.home);

    return {
      path,
      exists: true,
      raw,
      policy: salvaged.policy,
      errors: salvaged.errors,
    };
  } catch (error) {
    return {
      path,
      exists: true,
      raw,
      policy: createDefaultGuiPolicy(),
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

export function writeUserPolicyFromGui(
  environment: Environment,
  policy: unknown,
  options: UserScopeOptions = {},
): GuiPolicyWriteResult {
  const path = getUserPolicyPath(environment, options);
  const salvaged = salvageUserPolicy(policy, environment.home);
  if (salvaged.errors.length > 0) {
    return { path, policy: createDefaultGuiPolicy(), errors: salvaged.errors };
  }
  const normalizedPolicy = salvaged.policy;

  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writePolicyFileAtomic(
    bindDelegatedPolicyFilesystemTarget(path),
    `${JSON.stringify(normalizedPolicy, null, 2)}\n`,
    0o600,
  );
  chmodSync(path, 0o600);
  return { path, policy: normalizedPolicy, errors: [] };
}

export function previewUserPolicyForGui(
  environment: Environment,
  policy: unknown,
): {
  preview?: PolicyPreview;
  errors: string[];
} {
  const salvaged = salvageUserPolicy(policy, environment.home);
  if (salvaged.errors.length > 0) return { errors: salvaged.errors };
  return {
    preview: createPolicyPreview(salvaged.policy, environment.env),
    errors: [],
  };
}

export function repairUserPolicyForGui(
  environment: Environment,
  options: UserScopeOptions = {},
): GuiPolicyWriteResult {
  const path = getUserPolicyPath(environment, options);
  if (!existsSync(path)) return writeUserPolicyFromGui(environment, DEFAULT_GUI_POLICY, options);

  const raw = readFileSync(path, 'utf-8');
  if (!raw.trim()) return writeUserPolicyFromGui(environment, DEFAULT_GUI_POLICY, options);

  try {
    return writeUserPolicyFromGui(
      environment,
      normalizeGuiPolicy(JSON.parse(raw) as unknown, environment.home),
      options,
    );
  } catch {
    return writeUserPolicyFromGui(environment, DEFAULT_GUI_POLICY, options);
  }
}

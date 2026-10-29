import { SECRET_DEFAULT_OFF_RULE_ID_SET } from '@/core/rules/secret';
import {
  SAFETY_LEVEL_CAPABILITIES,
  SAFETY_OVERRIDE_KEYS,
  type SafetyLevelCapability,
} from './safety-level';
import type { DestructiveCommandRuleOverride, GuiPolicy, PolicySafetyLevel } from './types';

const LEVEL_RANK: Record<PolicySafetyLevel, number> = { standard: 0, strict: 1, paranoid: 2 };

export type ProjectPolicyProjection = {
  safety?: {
    level?: PolicySafetyLevel;
    overrides?: Partial<Record<SafetyLevelCapability, boolean>>;
  };
  workflow?: { worktree_mode?: boolean };
  destructive_command_protection?: {
    enabled?: boolean;
    overrides?: Record<string, DestructiveCommandRuleOverride>;
    allow_paths?: string[];
  };
  secret_protection?: {
    enabled?: boolean;
    overrides?: Record<string, DestructiveCommandRuleOverride>;
    deny_paths?: string[];
    allow_paths?: string[];
  };
};

type Weakening = { field: string; message: string };

export function mergeProjectPolicy(
  user: GuiPolicy,
  project: ProjectPolicyProjection,
  tightenOnly = false,
  sessionLevel = user.safety.level,
): { policy: GuiPolicy; weakenings: readonly string[] } {
  const weakenings = collectWeakenings(user, project, sessionLevel);
  const ignored = new Set(tightenOnly ? weakenings.map((weakening) => weakening.field) : []);
  const kept = <T>(field: string, value: T | undefined) => (ignored.has(field) ? undefined : value);
  const keptEntries = <T>(field: string, entries: Record<string, T> | undefined) =>
    Object.fromEntries(
      Object.entries(entries ?? {}).filter(([key]) => !ignored.has(`${field}.${key}`)),
    );
  const keptPaths = (field: string, paths: readonly string[] | undefined) =>
    paths?.filter((path) => !ignored.has(`${field}.${path}`));
  const policy: GuiPolicy = {
    version: 1,
    safety: {
      level: kept('safety.level', project.safety?.level) ?? user.safety.level,
      overrides: {
        ...user.safety.overrides,
        ...keptEntries('safety.overrides', project.safety?.overrides),
      },
    },
    workflow: {
      worktree_mode:
        kept('workflow.worktree_mode', project.workflow?.worktree_mode) ??
        user.workflow.worktree_mode,
    },
    destructive_command_protection: {
      enabled:
        kept(
          'destructive_command_protection.enabled',
          project.destructive_command_protection?.enabled,
        ) ?? user.destructive_command_protection.enabled,
      overrides: {
        ...user.destructive_command_protection.overrides,
        ...keptEntries(
          'destructive_command_protection.overrides',
          project.destructive_command_protection?.overrides,
        ),
      },
      allow_paths: unionPaths(
        user.destructive_command_protection.allow_paths,
        keptPaths(
          'destructive_command_protection.allow_paths',
          project.destructive_command_protection?.allow_paths,
        ),
      ),
    },
    secret_protection: {
      enabled:
        kept('secret_protection.enabled', project.secret_protection?.enabled) ??
        user.secret_protection.enabled,
      overrides: {
        ...user.secret_protection.overrides,
        ...keptEntries('secret_protection.overrides', project.secret_protection?.overrides),
      },
      deny_paths: unionPaths(
        user.secret_protection.deny_paths,
        project.secret_protection?.deny_paths,
      ),
      allow_paths: unionPaths(
        user.secret_protection.allow_paths,
        keptPaths('secret_protection.allow_paths', project.secret_protection?.allow_paths),
      ),
    },
    audit: user.audit,
  };
  return { policy, weakenings: weakenings.map((weakening) => weakening.message) };
}

function unionPaths(user: readonly string[], project: readonly string[] | undefined): string[] {
  return [...new Set([...user, ...(project ?? [])])];
}

function collectWeakenings(
  user: GuiPolicy,
  project: ProjectPolicyProjection,
  sessionLevel: PolicySafetyLevel,
): Weakening[] {
  const level = project.safety?.level;
  const capabilities = SAFETY_LEVEL_CAPABILITIES[sessionLevel];
  return [
    ...(level && LEVEL_RANK[level] < LEVEL_RANK[user.safety.level]
      ? [
          {
            field: 'safety.level',
            message: `project policy lowers level: ${user.safety.level} -> ${level}`,
          },
        ]
      : []),
    ...SAFETY_OVERRIDE_KEYS.flatMap((key) =>
      project.safety?.overrides?.[key] === false &&
      (user.safety.overrides[key] ?? capabilities[key])
        ? [{ field: `safety.overrides.${key}`, message: `project policy disables ${key}` }]
        : [],
    ),
    ...(project.workflow?.worktree_mode === true && !user.workflow.worktree_mode
      ? [
          {
            field: 'workflow.worktree_mode',
            message: 'project policy enables worktree mode relaxations',
          },
        ]
      : []),
    ...(project.destructive_command_protection?.enabled === false &&
    user.destructive_command_protection.enabled
      ? [
          {
            field: 'destructive_command_protection.enabled',
            message: 'project policy disables destructive command protection',
          },
        ]
      : []),
    ...(project.secret_protection?.enabled === false && user.secret_protection.enabled
      ? [
          {
            field: 'secret_protection.enabled',
            message: 'project policy disables secret protection',
          },
        ]
      : []),
    ...disabledRules(
      'destructive_command_protection.overrides',
      project.destructive_command_protection?.overrides,
      (id) =>
        user.destructive_command_protection.enabled &&
        user.destructive_command_protection.overrides[id] !== 'off',
    ),
    ...disabledRules(
      'secret_protection.overrides',
      project.secret_protection?.overrides,
      (id) =>
        user.secret_protection.enabled &&
        (user.secret_protection.overrides[id] === 'on'
          ? true
          : user.secret_protection.overrides[id] !== 'off' &&
            !SECRET_DEFAULT_OFF_RULE_ID_SET.has(id)),
    ),

    ...(user.destructive_command_protection.enabled
      ? addedPaths(
          user.destructive_command_protection.allow_paths,
          project.destructive_command_protection?.allow_paths,
        ).map((path) => ({
          field: `destructive_command_protection.allow_paths.${path}`,
          message: `project policy adds destructive allow path: ${path}`,
        }))
      : []),
    ...(user.secret_protection.enabled
      ? addedPaths(user.secret_protection.allow_paths, project.secret_protection?.allow_paths).map(
          (path) => ({
            field: `secret_protection.allow_paths.${path}`,
            message: `project policy adds secret allow path: ${path}`,
          }),
        )
      : []),
  ];
}

function disabledRules(
  field: string,
  overrides: Record<string, DestructiveCommandRuleOverride> | undefined,
  wasEnabled: (id: string) => boolean,
): Weakening[] {
  return Object.entries(overrides ?? {}).flatMap(([id, override]) =>
    override === 'off' && wasEnabled(id)
      ? [{ field: `${field}.${id}`, message: `project policy disables rule ${id}` }]
      : [],
  );
}

function addedPaths(user: readonly string[], project: readonly string[] | undefined): string[] {
  return (project ?? []).filter((path) => !user.includes(path));
}

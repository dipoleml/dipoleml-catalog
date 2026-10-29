import type { WorktreeFacts } from '@/core/git/worktree';
import type { DestructiveCommandRulePolicy } from '@/core/policy/effective-rules';
import { extractShortOpts } from '@/core/shell/tokens';
import type { EnvironmentContext } from '@/gate/analysis';
import { getGitEnvValue, hasConfigAffectingEnvAssignment } from './env';
import { extractGitSubcommandAndRest, getGitConfigEntries, splitAtDoubleDash } from './parse';
import {
  CHECKOUT_SHORT_OPTS_WITH_VALUE,
  type GitRuleMatch,
  matchesGitLongOption,
  SWITCH_SHORT_OPTS_WITH_VALUE,
} from './rules';
import {
  findGitRepositoryRoot,
  getGitExecutionContext,
  hasGitContextEnvOverride,
  mayRedirectGitRepository,
} from './worktree';

export interface GitAnalyzeOptions {
  environment: EnvironmentContext;
  cwd?: string;
  originalCwd?: string;
  envAssignments?: ReadonlyMap<string, string>;
  shellAssignments?: ReadonlyMap<string, string>;
  worktreeMode?: boolean;
  dynamicArguments?: boolean;
  policy?: DestructiveCommandRulePolicy;
}

export interface GitRelaxation {
  kind: 'worktree' | 'temp-root';
  originalReason: string;
  gitCwd: string;
}

export function getGitWorktreeRelaxationForMatch(
  tokens: readonly string[],
  match: GitRuleMatch,
  options: GitAnalyzeOptions,
): GitRelaxation | null {
  if (
    !match.localDiscard ||
    !options.worktreeMode ||
    hasGitContextEnvOverride(options.environment.env, options.envAssignments)
  ) {
    return null;
  }

  const context = getGitExecutionContext(tokens, options.cwd, options.environment.paths);
  if (!context.gitCwd || context.hasExplicitGitContext) {
    return null;
  }

  const facts = options.environment.worktreeFacts(context.gitCwd);
  const root = findGitRepositoryRoot(context.gitCwd, options.environment.paths);
  if (
    !facts ||
    root === null ||
    mayRedirectGitRepository(
      tokens,
      context.gitCwd,
      root,
      options.environment,
      options.envAssignments,
    )
  ) {
    return null;
  }

  if (isNonRelaxableLocalDiscard(tokens, options, facts)) {
    return null;
  }

  return {
    kind: 'worktree',
    originalReason: match.reason,
    gitCwd: context.gitCwd,
  };
}

export function isNonRelaxableLocalDiscard(
  tokens: readonly string[],
  options: GitAnalyzeOptions,
  facts: WorktreeFacts,
): boolean {
  const { subcommand, rest } = extractGitSubcommandAndRest(tokens);
  const normalizedSubcommand = subcommand?.toLowerCase();

  if (
    options.dynamicArguments ||
    hasDynamicGitArgument(rest) ||
    hasRecursiveSubmoduleConfig(tokens, options.environment.env, options.envAssignments, facts) ||
    hasRecurseSubmodulesOption(rest) ||
    isForcedBranchReset(normalizedSubcommand, rest)
  ) {
    return true;
  }

  return normalizedSubcommand === 'clean' && countCleanForceFlags(rest) > 1;
}

function hasDynamicGitArgument(tokens: readonly string[]): boolean {
  return tokens.some((token) => /[$*?[]/.test(token));
}

function isForcedBranchReset(subcommand: string | undefined, rest: readonly string[]): boolean {
  if (subcommand === 'checkout') {
    const { before } = splitAtDoubleDash(rest);
    const shortOpts = extractShortOpts(before, {
      shortOptsWithValue: CHECKOUT_SHORT_OPTS_WITH_VALUE,
    });
    const hasForce =
      before.some((token) => matchesGitLongOption(token, '--force')) || shortOpts.has('-f');
    const hasBranchReset =
      shortOpts.has('-B') || before.some((token) => token === '-B' || token.startsWith('-B'));
    return hasForce && hasBranchReset;
  }

  if (subcommand === 'switch') {
    const { before } = splitAtDoubleDash(rest);
    const shortOpts = extractShortOpts(before, {
      shortOptsWithValue: SWITCH_SHORT_OPTS_WITH_VALUE,
    });
    const hasForce =
      before.some((token) => matchesGitLongOption(token, '--force')) ||
      before.some((token) => matchesGitLongOption(token, '--discard-changes')) ||
      shortOpts.has('-f');
    const hasForceCreate =
      before.some(
        (token) => token === '-C' || token.startsWith('-C') || isForceCreateOption(token),
      ) || shortOpts.has('-C');
    return hasForce && hasForceCreate;
  }

  return false;
}

function isForceCreateOption(token: string): boolean {
  const optionName = token.split('=', 1)[0] ?? token;
  return (
    optionName === '--force-create' ||
    (optionName.length >= '--force-c'.length && '--force-create'.startsWith(optionName))
  );
}

function hasRecurseSubmodulesOption(tokens: readonly string[]): boolean {
  return tokens.some((token) => token.startsWith('--recurse-sub'));
}

function countCleanForceFlags(tokens: readonly string[]): number {
  let count = 0;

  for (const token of tokens) {
    if (token === '--force') {
      count++;
      continue;
    }
    if (token.startsWith('-') && !token.startsWith('--')) {
      for (const opt of token.slice(1)) {
        if (opt === 'f') {
          count++;
        }
      }
    }
  }

  return count;
}

function hasRecursiveSubmoduleConfig(
  tokens: readonly string[],
  env: ReadonlyMap<string, string>,
  envAssignments: ReadonlyMap<string, string> | undefined,
  facts: WorktreeFacts,
): boolean {
  if (getGitEnvValue('GIT_CONFIG_PARAMETERS', env, envAssignments) !== undefined) {
    return true;
  }

  const resolution = getGitConfigEntries(tokens, env, envAssignments);
  if (resolution.blockedReason !== null) {
    return true;
  }

  const entries = resolution.entries.map((entry) => ({
    key: entry.key.toLowerCase(),
    value: entry.value,
  }));
  if (entries.some((entry) => isIncludeConfigKey(entry.key))) {
    return true;
  }

  const recurse = entries.filter((entry) => entry.key === 'submodule.recurse').at(-1);
  if (recurse) {
    return recurse.value === undefined || gitConfigValueEnablesRecursiveSubmodules(recurse.value);
  }

  if (hasConfigAffectingEnvAssignment(envAssignments)) {
    return true;
  }
  return facts.recursiveSubmodules;
}

function gitConfigValueEnablesRecursiveSubmodules(value: string): boolean {
  const normalizedValue = value.toLowerCase();
  return (
    normalizedValue !== 'false' &&
    normalizedValue !== 'no' &&
    normalizedValue !== 'off' &&
    normalizedValue !== '0'
  );
}

function isIncludeConfigKey(key: string): boolean {
  return key === 'include.path' || (key.startsWith('includeif.') && key.endsWith('.path'));
}

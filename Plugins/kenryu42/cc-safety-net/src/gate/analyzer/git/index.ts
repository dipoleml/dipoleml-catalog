import { resolve } from 'node:path';
import { filterDestructiveCommandMatch } from '@/core/policy/effective-rules';
import { destructiveCommandMatch } from '@/core/rules/destructive';
import type { DestructiveCommandRuleMatch } from '@/core/rules/types';
import type { CommandWord } from '@/core/shell/model';
import { analysisWordText } from '../command-words';
import { hasGitSshEnvAssignment } from './env';
import {
  extractGitSubcommandAndRest,
  hasGitCommandLineSshCommandConfig,
  resolveGitCommandLineAliases,
  splitAtDoubleDash,
} from './parse';
import { analyzeGitRule, matchesGitLongOption } from './rules';
import { getGitTempRootRelaxationForMatch } from './temp-root-relaxation';
import { getGitExecutionContext } from './worktree';
import {
  type GitAnalyzeOptions,
  type GitRelaxation,
  getGitWorktreeRelaxationForMatch,
} from './worktree-relaxation';

const REASON_GIT_SSH_ENV =
  'Git SSH environment overrides can execute arbitrary commands during network operations. Run git without GIT_SSH/GIT_SSH_COMMAND overrides, or ask the user to run it manually.';
const GIT_NETWORK_SUBCOMMANDS = new Set([
  'clone',
  'fetch',
  'pull',
  'push',
  'ls-remote',
  'submodule',
]);

export function analyzeGitMatch(
  words: readonly CommandWord[],
  options: GitAnalyzeOptions,
): DestructiveCommandRuleMatch | null {
  return evaluateGit(words, options);
}

function evaluateGit(
  words: readonly CommandWord[],
  options: GitAnalyzeOptions,
  onRelaxation?: (relaxation: GitRelaxation) => void,
): DestructiveCommandRuleMatch | null {
  const tokens = words.map(analysisWordText);
  const aliasResolution = resolveGitCommandLineAliases(
    tokens,
    options.environment.env,
    options.envAssignments,
  );
  const aliasConfigMatch = aliasResolution.blockedReason
    ? filterDestructiveCommandMatch(
        destructiveCommandMatch('git.alias-config', aliasResolution.blockedReason),
        options.policy,
      )
    : null;
  if (aliasConfigMatch) return aliasConfigMatch;

  const resolvedTokens = aliasResolution.tokens;
  if (
    (hasGitSshEnvAssignment(options.envAssignments) ||
      hasGitCommandLineSshCommandConfig(tokens, options.environment.env, options.envAssignments)) &&
    isGitNetworkOperation(resolvedTokens)
  ) {
    return destructiveCommandMatch('git.ssh-env', REASON_GIT_SSH_ENV);
  }

  const match = analyzeGitRule(resolvedTokens, (operand) => {
    const gitCwd = getGitExecutionContext(tokens, options.cwd, options.environment.paths).gitCwd;
    return (
      gitCwd !== null && options.environment.paths.entryKind(resolve(gitCwd, operand)) !== 'missing'
    );
  });

  if (!match) {
    return null;
  }

  if (aliasResolution.expanded || aliasResolution.blockedReason) {
    return match;
  }

  const relaxation =
    getGitWorktreeRelaxationForMatch(tokens, match, options) ??
    getGitTempRootRelaxationForMatch(words, match, options);
  if (!relaxation) return match;
  onRelaxation?.(relaxation);
  return null;
}

export function analyzeGitDetailed(
  words: readonly CommandWord[],
  options: GitAnalyzeOptions,
): Readonly<{
  match: DestructiveCommandRuleMatch | null;
  relaxation: GitRelaxation | null;
}> {
  let relaxation: GitRelaxation | null = null;
  const match = evaluateGit(words, options, (value) => {
    relaxation = value;
  });
  return { match, relaxation };
}

function isGitNetworkOperation(tokens: readonly string[]): boolean {
  const { subcommand, rest } = extractGitSubcommandAndRest(tokens);
  const subcommandName = subcommand?.toLowerCase();
  if (!subcommandName) {
    return false;
  }
  if (GIT_NETWORK_SUBCOMMANDS.has(subcommandName)) {
    return true;
  }
  if (subcommandName === 'archive') {
    return splitAtDoubleDash(rest).before.some((token) => matchesGitLongOption(token, '--remote'));
  }
  return subcommandName === 'remote' && isGitRemoteUpdateOperation(rest);
}

function isGitRemoteUpdateOperation(tokens: readonly string[]): boolean {
  return tokens.find((token) => !isGitRemotePrefixOption(token))?.toLowerCase() === 'update';
}

function isGitRemotePrefixOption(token: string): boolean {
  return (
    token === '-v' ||
    matchesGitLongOption(token, '--verbose') ||
    matchesGitLongOption(token, '--no-verbose')
  );
}

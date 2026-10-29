import { isAbsolute, join, resolve } from 'node:path';
import type { PathResolver } from '@/core/environment';
import { isPathOrSubpath, isTrustedTempPath, isTrustedTempRootPath } from '@/core/paths/tmpdir';
import type { CommandWord } from '@/core/shell/model';
import { analysisWordText } from '../command-words';
import { expandKnownVariableWord } from '../shell-git-env';
import { extractGitSubcommandAndRest, splitAtDoubleDash } from './parse';
import type { GitRuleMatch } from './rules';
import {
  findGitRepositoryRoot,
  getGitExecutionContext,
  hasGitContextEnvOverride,
  mayRedirectGitRepository,
} from './worktree';
import {
  type GitAnalyzeOptions,
  type GitRelaxation,
  isNonRelaxableLocalDiscard,
} from './worktree-relaxation';

export function getGitTempRootRelaxationForMatch(
  words: readonly CommandWord[],
  match: GitRuleMatch,
  options: GitAnalyzeOptions,
): GitRelaxation | null {
  const tokens = words.map(
    (word) =>
      expandKnownVariableWord(word, options.shellAssignments ?? new Map()) ??
      analysisWordText(word),
  );
  const paths = options.environment.paths;
  const context = getGitExecutionContext(tokens, options.cwd, paths);
  const workspace = options.originalCwd ? paths.realpath(resolve(options.originalCwd)) : null;

  if (
    match.id.startsWith('git.push-') ||
    workspace === null ||
    context.gitCwd === null ||
    context.hasExplicitGitContext ||
    hasGitContextEnvOverride(options.environment.env, options.envAssignments)
  ) {
    return null;
  }

  const subject =
    match.id === 'git.worktree-remove-force'
      ? worktreeRemoveOperand(words, options.shellAssignments, paths)
      : findGitRepositoryRoot(context.gitCwd, paths);
  if (
    subject === null ||
    (match.id !== 'git.worktree-remove-force' &&
      !isDisposableRepository(subject, context.gitCwd, tokens, match, options)) ||
    !isTrustedTempPath(subject, options.environment) ||
    isTrustedTempRootPath(subject, options.environment) ||
    isPathOrSubpath(workspace, subject) ||
    isPathOrSubpath(subject, workspace)
  ) {
    return null;
  }

  return { kind: 'temp-root', originalReason: match.reason, gitCwd: context.gitCwd };
}

function isDisposableRepository(
  root: string,
  gitCwd: string,
  tokens: readonly string[],
  match: GitRuleMatch,
  options: GitAnalyzeOptions,
): boolean {
  const paths = options.environment.paths;
  const gitEntry = join(root, '.git');
  if (
    paths.entryKind(gitEntry) !== 'present' ||
    mayRedirectGitRepository(tokens, gitCwd, root, options.environment, options.envAssignments)
  ) {
    return false;
  }
  const ownsItsGitDirectory = paths.isDirectory(gitEntry);
  if (ownsItsGitDirectory) return true;
  if (!match.localDiscard) return false;
  const linkedWorktreeWithMatchingBacklink = options.environment.worktreeFacts(root);
  return (
    linkedWorktreeWithMatchingBacklink !== null &&
    !isNonRelaxableLocalDiscard(tokens, options, linkedWorktreeWithMatchingBacklink)
  );
}

/**
 * git accepts a unique trailing path component of any registered worktree as `<worktree>`, and
 * removes the registered worktree a symlinked operand resolves to.
 */
function worktreeRemoveOperand(
  words: readonly CommandWord[],
  shellAssignments: ReadonlyMap<string, string> | undefined,
  paths: PathResolver,
): string | null {
  const rest = extractGitSubcommandAndRest(words.map(analysisWordText)).rest;
  const { before, after } = splitAtDoubleDash(rest.slice(rest.indexOf('remove') + 1));
  const operands = [...before.filter((token) => !token.startsWith('-')), ...after];
  const operand = operands.length === 1 ? (operands[0] ?? '') : '';
  const operandWord = words.find((word) => word.text === operand);
  const expanded =
    (operandWord && expandKnownVariableWord(operandWord, shellAssignments ?? new Map())) ?? operand;
  if (
    !isAbsolute(expanded) ||
    /[\s$`*?[]/.test(expanded) ||
    paths.entryKind(expanded) !== 'present' ||
    !paths.isDirectory(expanded)
  ) {
    return null;
  }
  return paths.realpath(expanded);
}

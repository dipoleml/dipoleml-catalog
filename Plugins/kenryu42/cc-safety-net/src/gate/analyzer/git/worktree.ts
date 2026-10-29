import { dirname, join, resolve } from 'node:path';
import type { Environment, PathResolver } from '@/core/environment';
import { resolveChdirTarget } from '@/core/paths/chdir';
import { isPathOrSubpath } from '@/core/paths/tmpdir';
import { GIT_GLOBAL_OPTS_WITH_VALUE } from '@/core/rules/constants';
import { GIT_CONTEXT_ENV_OVERRIDES } from './env';
import { getGitConfigEntries } from './parse';

export interface GitExecutionContext {
  gitCwd: string | null;
  hasExplicitGitContext: boolean;
}

export function hasGitContextEnvOverride(
  env: ReadonlyMap<string, string>,
  envAssignments?: ReadonlyMap<string, string>,
): boolean {
  return GIT_CONTEXT_ENV_OVERRIDES.some((name) => envAssignments?.has(name) || env.has(name));
}

export function getGitExecutionContext(
  tokens: readonly string[],
  cwd: string | undefined,
  paths: PathResolver,
): GitExecutionContext {
  if (!cwd) {
    return { gitCwd: null, hasExplicitGitContext: false };
  }

  const startCwd = paths.realpath(resolve(cwd));
  if (startCwd === null || !paths.isDirectory(startCwd)) {
    return { gitCwd: null, hasExplicitGitContext: false };
  }

  let gitCwd = startCwd;
  let hasExplicitGitContext = false;
  let i = 1;

  while (i < tokens.length) {
    const token = tokens[i];
    if (!token) break;

    if (token === '--') {
      break;
    }

    if (!token.startsWith('-')) {
      break;
    }

    if (token === '-C') {
      const target = tokens[i + 1];
      if (!target) {
        return { gitCwd: null, hasExplicitGitContext };
      }
      const resolvedCwd = resolveGitCwd(gitCwd, target, paths);
      if (!resolvedCwd) {
        return { gitCwd: null, hasExplicitGitContext };
      }
      gitCwd = resolvedCwd;
      i += 2;
      continue;
    }

    if (token.startsWith('-C') && token.length > 2) {
      const resolvedCwd = resolveGitCwd(gitCwd, token.slice(2), paths);
      if (!resolvedCwd) {
        return { gitCwd: null, hasExplicitGitContext };
      }
      gitCwd = resolvedCwd;
      i++;
      continue;
    }

    if (token === '--git-dir' || token === '--work-tree') {
      hasExplicitGitContext = true;
      i += 2;
      continue;
    }

    if (token.startsWith('--git-dir=') || token.startsWith('--work-tree=')) {
      hasExplicitGitContext = true;
      i++;
      continue;
    }

    i += GIT_GLOBAL_OPTS_WITH_VALUE.has(token) ? 2 : 1;
  }

  return { gitCwd, hasExplicitGitContext };
}

function resolveGitCwd(baseCwd: string, target: string, paths: PathResolver): string | null {
  try {
    const resolved = resolveChdirTarget(baseCwd, target, paths);
    return paths.isDirectory(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

export function findGitRepositoryRoot(directory: string, paths: PathResolver): string | null {
  if (paths.entryKind(join(directory, '.git')) !== 'missing') return directory;
  const parent = dirname(directory);
  return parent === directory ? null : findGitRepositoryRoot(parent, paths);
}

export function mayRedirectGitRepository(
  tokens: readonly string[],
  gitCwd: string,
  root: string,
  environment: Environment,
  envAssignments?: ReadonlyMap<string, string>,
): boolean {
  const paths = environment.paths;
  const gitDirectory = join(root, '.git');
  const ownsItsGitDirectory = paths.isDirectory(gitDirectory);
  const gitFallsThroughToAncestors =
    ownsItsGitDirectory && !environment.isGitDirectory(gitDirectory);
  const discoveryVisits = selfAndAncestors(gitCwd).filter(
    (directory) =>
      gitFallsThroughToAncestors || (directory !== root && isPathOrSubpath(directory, root)),
  );
  return (
    getGitConfigEntries(tokens, environment.env, envAssignments).entries.some(
      (entry) => entry.key.toLowerCase() === 'core.worktree',
    ) ||
    discoveryVisits.some(
      (directory) =>
        paths.entryKind(join(directory, 'HEAD')) !== 'missing' ||
        (directory !== root && paths.entryKind(join(directory, '.git')) !== 'missing'),
    ) ||
    (ownsItsGitDirectory && environment.gitDirectoryRedirects(gitDirectory))
  );
}

function selfAndAncestors(directory: string): string[] {
  const parent = dirname(directory);
  return parent === directory ? [directory] : [directory, ...selfAndAncestors(parent)];
}

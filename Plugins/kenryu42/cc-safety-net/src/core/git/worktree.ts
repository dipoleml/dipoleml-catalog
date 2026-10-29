import { spawnSync } from 'node:child_process';
import {
  accessSync,
  constants,
  existsSync,
  lstatSync,
  opendirSync,
  readFileSync,
  realpathSync,
  statSync,
} from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

export type WorktreeFacts = Readonly<{
  recursiveSubmodules: boolean;
}>;

export type DotGitFileTargets = {
  gitDir: string;
  commonDir: string | null;
};

type LinkedWorktreeTargets = {
  gitDir: string;
  commonDir: string;
};

const TRUSTED_GIT_BINARIES = [
  '/usr/bin/git',
  '/usr/local/bin/git',
  '/opt/homebrew/bin/git',
  'C:\\Program Files\\Git\\cmd\\git.exe',
  'C:\\Program Files\\Git\\bin\\git.exe',
] as const;

const GIT_CONFIG_TIMEOUT_MS = 5000;

export function resolveWorktreeFacts(
  cwd: string,
  gitBinary: string | null = getTrustedGitBinary(),
  timeoutMs = GIT_CONFIG_TIMEOUT_MS,
): WorktreeFacts | null {
  const gitCwd = resolveDirectory(cwd);
  const targets = gitCwd === null ? null : resolveLinkedWorktreeTargets(gitCwd);
  if (gitCwd === null || targets === null) return null;
  const recursiveSubmodules = effectiveGitConfigEnablesRecursiveSubmodules(
    gitCwd,
    targets,
    gitBinary,
    timeoutMs,
  );
  return recursiveSubmodules === null ? null : { recursiveSubmodules };
}

function resolveDirectory(cwd: string): string | null {
  try {
    const resolved = realpathSync(resolve(cwd));
    return statSync(resolved).isDirectory() ? resolved : null;
  } catch {
    return null;
  }
}

function resolveLinkedWorktreeTargets(cwd: string): LinkedWorktreeTargets | null {
  const dotGitPath = findDotGit(cwd);
  if (!dotGitPath) {
    return null;
  }

  try {
    const stat = lstatSync(dotGitPath);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      return null;
    }

    const targets = resolveDotGitFileTargets(dotGitPath);
    if (!targets?.commonDir) return null;

    if (!worktreeGitdirBacklinkMatches(targets.gitDir, dotGitPath)) {
      return null;
    }

    return gitDirectoriesRedirect(targets.gitDir, targets.commonDir)
      ? null
      : { gitDir: targets.gitDir, commonDir: targets.commonDir };
  } catch {
    return null;
  }
}

export function resolveDotGitFileTargets(dotGitPath: string): DotGitFileTargets | null {
  try {
    const rawGitDir = readDotGitTarget(dotGitPath);
    if (!rawGitDir) return null;
    const gitDir = realpathSync(
      isAbsolute(rawGitDir) ? rawGitDir : resolve(dirname(dotGitPath), rawGitDir),
    );
    if (!statSync(gitDir).isDirectory()) return null;
    return {
      gitDir,
      commonDir: resolveCommonGitDir(gitDir),
    };
  } catch {
    return null;
  }
}

function readDotGitTarget(dotGitPath: string): string | null {
  const firstLine = readFileSync(dotGitPath, 'utf-8').split(/\r?\n/, 1)[0]?.trim() ?? '';
  if (!firstLine.startsWith('gitdir:')) return null;
  return firstLine.slice('gitdir:'.length).trim() || null;
}

function resolveCommonGitDir(gitDir: string): string | null {
  try {
    const rawCommonDir = readFileSync(join(gitDir, 'commondir'), 'utf-8')
      .split(/\r?\n/, 1)[0]
      ?.trim();
    if (!rawCommonDir) return null;
    const commonDir = realpathSync(
      isAbsolute(rawCommonDir) ? rawCommonDir : resolve(gitDir, rawCommonDir),
    );
    return statSync(commonDir).isDirectory() ? commonDir : null;
  } catch {
    return null;
  }
}

function worktreeGitdirBacklinkMatches(gitDir: string, dotGitPath: string): boolean {
  const rawBacklink = readWorktreeGitdirBacklink(gitDir);
  return rawBacklink === null ? false : gitDirPathReferenceMatches(gitDir, rawBacklink, dotGitPath);
}

function readWorktreeGitdirBacklink(gitDir: string): string | null {
  const backlinkPath = join(gitDir, 'gitdir');
  if (!existsSync(backlinkPath)) return null;

  const rawBacklink = readFileSync(backlinkPath, 'utf-8').split(/\r?\n/, 1)[0]?.trim() ?? '';
  return rawBacklink === '' ? null : rawBacklink;
}

function gitDirPathReferenceMatches(gitDir: string, target: string, expectedPath: string): boolean {
  try {
    return sameFilesystemPath(isAbsolute(target) ? target : resolve(gitDir, target), expectedPath);
  } catch {
    return false;
  }
}

function sameFilesystemPath(left: string, right: string): boolean {
  try {
    const leftStat = statSync(left);
    const rightStat = statSync(right);
    if (
      leftStat.ino !== 0 &&
      rightStat.ino !== 0 &&
      leftStat.dev === rightStat.dev &&
      leftStat.ino === rightStat.ino
    ) {
      return true;
    }
  } catch {}

  return (
    normalizePathForComparison(realpathSync.native(left)) ===
    normalizePathForComparison(realpathSync.native(right))
  );
}

/** @internal */
export function normalizePathForComparison(path: string): string {
  const normalized = path
    .replace(/^\\\\\?\\UNC\\/i, '//')
    .replace(/^\\\\\?\\/i, '')
    .replace(/\\/g, '/');
  const trimmed =
    normalized.length > 1 && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
  return process.platform === 'win32' ? trimmed.toLowerCase() : trimmed;
}

export function isGitDirectory(gitDir: string): boolean {
  try {
    accessSync(join(gitDir, 'objects'), constants.X_OK);
    accessSync(join(gitDir, 'refs'), constants.X_OK);
    return /^(?:ref:[\t\n\r ]*refs\/|[0-9a-fA-F]{40})/.test(readRegularFile(join(gitDir, 'HEAD')));
  } catch {
    return false;
  }
}

export function gitDirectoryRedirects(gitDir: string): boolean {
  return existsSync(join(gitDir, 'commondir')) || gitDirectoriesRedirect(gitDir, gitDir);
}

function gitDirectoriesRedirect(gitDir: string, commonDir: string): boolean {
  return (
    [join(commonDir, 'config'), join(gitDir, 'config.worktree')].some(configNamesWorktree) ||
    holdsSymbolicLinkOrFifo(gitDir)
  );
}

const GIT_FILE_SIZE_LIMIT = 1_048_576;

function readRegularFile(path: string): string {
  const stat = statSync(path);
  if (!stat.isFile() || stat.size > GIT_FILE_SIZE_LIMIT) {
    throw new Error(`${path} is not a regular file within ${GIT_FILE_SIZE_LIMIT} bytes`);
  }
  return readFileSync(path, 'utf-8');
}

function configNamesWorktree(configPath: string): boolean {
  try {
    return /(?:^|[\s\]])worktree\s*=/i.test(readRegularFile(configPath));
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ENOENT';
  }
}

const GIT_DIRECTORY_ENTRY_BUDGET = 10_000;

function holdsSymbolicLinkOrFifo(gitDir: string): boolean {
  const pending = [gitDir];
  let visited = 0;
  try {
    while (pending.length > 0) {
      const directory = pending.pop() as string;
      const dir = opendirSync(directory);
      try {
        for (let entry = dir.readSync(); entry !== null; entry = dir.readSync()) {
          visited++;
          if (entry.isSymbolicLink() || entry.isFIFO() || visited > GIT_DIRECTORY_ENTRY_BUDGET) {
            return true;
          }
          const isObjectStore = directory === gitDir && entry.name === 'objects';
          if (entry.isDirectory() && !isObjectStore) pending.push(join(directory, entry.name));
        }
      } finally {
        dir.closeSync();
      }
    }
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ENOENT';
  }
}

function findDotGit(cwd: string): string | null {
  try {
    return findDotGitInAncestors(realpathSync(cwd));
  } catch {
    return null;
  }
}

export function findDotGitInAncestors(cwd: string): string | null {
  let current = cwd;
  while (true) {
    const dotGitPath = join(current, '.git');
    if (existsSync(dotGitPath)) {
      return dotGitPath;
    }

    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function effectiveGitConfigEnablesRecursiveSubmodules(
  cwd: string,
  targets: LinkedWorktreeTargets,
  gitBinary: string | null,
  timeoutMs: number,
): boolean | null {
  if (localGitConfigEnablesRecursiveSubmodules(targets)) {
    return true;
  }

  if (gitBinary === null) {
    return true;
  }

  const result = spawnSync(gitBinary, ['config', '--get', 'submodule.recurse'], {
    cwd,
    encoding: 'utf8',
    env: withoutGitConfigEnv(process.env),
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: timeoutMs,
  });

  if (result.error !== undefined || (result.status !== 0 && result.status !== 1)) return null;
  return result.status === 0 && gitConfigValueEnablesRecursiveSubmodules(result.stdout.trim());
}

function localGitConfigEnablesRecursiveSubmodules(targets: LinkedWorktreeTargets): boolean {
  return [join(targets.commonDir, 'config'), join(targets.gitDir, 'config.worktree')]
    .filter((configPath) => existsSync(configPath))
    .some((configPath) => gitConfigFileEnablesRecursiveSubmodules(configPath));
}

function getTrustedGitBinary(): string | null {
  return TRUSTED_GIT_BINARIES.find((gitBinary) => existsSync(gitBinary)) ?? null;
}

export function isGitConfigEnvName(name: string): boolean {
  return (
    name === 'GIT_CONFIG_COUNT' ||
    name === 'GIT_CONFIG_PARAMETERS' ||
    /^GIT_CONFIG_(KEY|VALUE)_\d+$/.test(name)
  );
}

function withoutGitConfigEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(env).filter(([key]) => !isGitConfigEnvName(key)));
}

function gitConfigFileEnablesRecursiveSubmodules(configPath: string): boolean {
  let content: string;
  try {
    content = readFileSync(configPath, 'utf-8');
  } catch {
    return true;
  }

  let section = '';
  let recursiveSubmoduleConfig = false;

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith(';')) {
      continue;
    }

    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      section = sectionMatch[1]?.trim().toLowerCase() ?? '';
      continue;
    }

    const eqIdx = trimmed.indexOf('=');
    const key = (eqIdx === -1 ? trimmed : trimmed.slice(0, eqIdx)).trim().toLowerCase();
    const value = eqIdx === -1 ? 'true' : trimmed.slice(eqIdx + 1).trim();
    if (isIncludeConfigSection(section) && key === 'path') {
      return true;
    }
    if (section === 'submodule' && key === 'recurse') {
      recursiveSubmoduleConfig = gitConfigValueEnablesRecursiveSubmodules(value);
    }
  }

  return recursiveSubmoduleConfig;
}

function isIncludeConfigSection(section: string): boolean {
  return section === 'include' || section.startsWith('includeif ');
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

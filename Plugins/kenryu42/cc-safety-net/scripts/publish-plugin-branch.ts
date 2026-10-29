import { readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PLUGIN_MANIFEST = '.claude-plugin/plugin.json';

function runGit(cwd: string, args: string[], env: Record<string, string> = {}) {
  const result = Bun.spawnSync(['git', ...args], {
    cwd,
    env: { ...process.env, ...env },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (result.exitCode === 0) return result.stdout.toString().trim();
  throw new Error(result.stderr.toString().trim() || `git ${args[0]} failed`);
}

export function publishPluginBranch(options: {
  repository: string;
  tree: string;
  branch: string;
  message: string;
}) {
  const repository = options.repository;
  const ref = `refs/heads/${options.branch}`;
  const tip = runGit(repository, ['ls-remote', 'origin', ref]).split('\t')[0] || undefined;
  if (tip !== undefined) runGit(repository, ['fetch', '--no-tags', 'origin', tip]);
  const treeDir = resolve(options.tree);
  if (
    tip !== undefined &&
    Bun.semver.order(
      JSON.parse(readFileSync(join(treeDir, PLUGIN_MANIFEST), 'utf8')).version,
      JSON.parse(runGit(repository, ['show', `${tip}:${PLUGIN_MANIFEST}`])).version,
    ) < 0
  ) {
    return { commit: tip, pushed: false };
  }

  const gitDir = runGit(repository, ['rev-parse', '--absolute-git-dir']);
  const index = join(gitDir, 'plugin-branch.index');
  rmSync(index, { force: true });
  const indexEnv = { GIT_INDEX_FILE: index };
  runGit(
    treeDir,
    ['--git-dir', gitDir, '--work-tree', treeDir, 'add', '--all', '--force', '.'],
    indexEnv,
  );
  const tree = runGit(repository, ['write-tree'], indexEnv);
  rmSync(index, { force: true });

  if (tip !== undefined && runGit(repository, ['rev-parse', `${tip}^{tree}`]) === tree) {
    return { commit: tip, pushed: false };
  }
  const commit = runGit(repository, [
    'commit-tree',
    tree,
    ...(tip === undefined ? [] : ['-p', tip]),
    '-m',
    options.message,
  ]);
  runGit(repository, ['push', 'origin', `${commit}:${ref}`]);
  return { commit, pushed: true };
}

if (import.meta.main) {
  const [tree, branch, message] = process.argv.slice(2);
  if (tree === undefined || branch === undefined || message === undefined) {
    console.error('Usage: bun run scripts/publish-plugin-branch.ts <tree> <branch> <message>');
    process.exit(1);
  }
  const result = publishPluginBranch({ repository: process.cwd(), tree, branch, message });
  console.log(
    result.pushed
      ? `Pushed ${result.commit} to ${branch}`
      : `${branch} stays at ${result.commit}, which holds this tree or a newer release; nothing pushed`,
  );
}

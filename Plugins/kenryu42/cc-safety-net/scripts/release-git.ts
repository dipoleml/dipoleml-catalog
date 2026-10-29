function runGit(cwd: string, args: string[]) {
  const result = Bun.spawnSync(['git', ...args], { cwd, stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode === 0) return result.stdout.toString().trim();
  throw new Error(result.stderr.toString().trim() || `git ${args[0]} failed`);
}

/** @internal */
export async function assertRemoteMain(cwd: string): Promise<void> {
  runGit(cwd, ['fetch', 'origin', 'main']);
  const remoteMain = runGit(cwd, ['rev-parse', 'refs/remotes/origin/main']);
  const mergeBase = runGit(cwd, ['merge-base', 'HEAD', remoteMain]);
  if (mergeBase === remoteMain) return;
  throw new Error(`origin/main advanced to ${remoteMain}; restart release preparation`);
}

export async function assertExactReleaseBase(cwd: string, expectedBase: string): Promise<void> {
  if (!/^[0-9a-f]{40}$/.test(expectedBase))
    throw new Error('Expected base must be a full commit SHA');
  runGit(cwd, ['fetch', 'origin', 'main', '--tags']);
  const head = runGit(cwd, ['rev-parse', 'HEAD']);
  const remoteMain = runGit(cwd, ['rev-parse', 'refs/remotes/origin/main']);
  if (head === expectedBase && remoteMain === expectedBase) return;
  throw new Error(
    `Release base mismatch: expected ${expectedBase}, HEAD is ${head}, origin/main is ${remoteMain}`,
  );
}

export async function pushReleaseAtomically(cwd: string, tag: string): Promise<void> {
  if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag)) {
    throw new Error(`Invalid release tag: ${tag}`);
  }
  const head = runGit(cwd, ['rev-parse', 'HEAD']);
  if (runGit(cwd, ['rev-parse', `refs/tags/${tag}`]) !== head) {
    throw new Error(`${tag} must identify HEAD before push`);
  }
  await assertRemoteMain(cwd);
  runGit(cwd, [
    'push',
    '--atomic',
    'origin',
    'HEAD:refs/heads/main',
    `refs/tags/${tag}:refs/tags/${tag}`,
  ]);
}

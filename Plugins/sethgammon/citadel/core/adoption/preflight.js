'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { realDirectory } = require('../distribution/fs-safety');
const { sha256Digest } = require('../operations/canonical');
const { digestBytes } = require('./contracts');

function runGit(root, args) {
  const result = spawnSync('git', args, {
    cwd: root, encoding: 'utf8', shell: false, windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000,
  });
  return {
    ok: !result.error && result.status === 0,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || '').trim(),
  };
}

function parseStatus(raw, ignored = []) {
  const tokens = String(raw || '').split('\0').filter(Boolean);
  const entries = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const status = token.slice(0, 2);
    let file = token.slice(3).replace(/\\/g, '/');
    if (/^[RC]/.test(status) && tokens[index + 1]) file = tokens[++index].replace(/\\/g, '/');
    if (ignored.some((prefix) => file === prefix || file.startsWith(`${prefix}/`))) continue;
    entries.push({ status, path: file });
  }
  return entries.sort((left, right) => `${left.path}:${left.status}`.localeCompare(`${right.path}:${right.status}`));
}

function gitSnapshot(root, ignored = []) {
  const top = runGit(root, ['rev-parse', '--show-toplevel']);
  if (!top.ok) return { available: false, git_root: null, head: null, branch: null, dirty_entries: [], dirty_digest: sha256Digest([]) };
  const gitRoot = realDirectory(top.stdout.trim(), 'Git root');
  const headResult = runGit(root, ['rev-parse', '--verify', 'HEAD']);
  const branchResult = runGit(root, ['symbolic-ref', '--short', '-q', 'HEAD']);
  const status = runGit(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  const dirtyEntries = status.ok
    ? parseStatus(status.stdout, ignored).map((entry) => {
      const candidate = path.join(gitRoot, entry.path);
      let identity = null;
      try {
        const stat = fs.lstatSync(candidate);
        if (stat.isFile() && !stat.isSymbolicLink()) {
          const content = fs.readFileSync(candidate);
          identity = { bytes: content.length, digest: digestBytes(content) };
        } else if (stat.isDirectory() && !stat.isSymbolicLink()) {
          identity = { bytes: null, digest: 'directory' };
        } else if (stat.isSymbolicLink()) {
          identity = { bytes: null, digest: 'symlink' };
        }
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      return { ...entry, identity };
    })
    : [];
  return {
    available: true,
    git_root: gitRoot,
    head: headResult.ok ? headResult.stdout.trim() : null,
    branch: branchResult.ok ? branchResult.stdout.trim() : null,
    dirty_entries: dirtyEntries,
    dirty_digest: sha256Digest(dirtyEntries),
  };
}

function fileIdentity(file) {
  if (!fs.existsSync(file)) return { digest: null, bytes: 0 };
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Source input must be a plain file: ${file}`);
  const content = fs.readFileSync(file);
  return { digest: digestBytes(content), bytes: content.length };
}

function issue(code, message, paths = []) {
  return { code, message, paths };
}

function preflightSource(sourcePath, options = {}) {
  const blockers = [];
  const warnings = [];
  let root;
  try { root = realDirectory(sourcePath, 'Citadel source'); }
  catch (error) {
    return { source: null, blockers: [issue('SOURCE_INVALID', error.message)], warnings };
  }
  const packagePath = path.join(root, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    blockers.push(issue('SOURCE_PACKAGE_INVALID', `Citadel source package.json is unavailable or invalid: ${error.message}`, ['package.json']));
  }
  if (pkg && pkg.name !== 'citadel') blockers.push(issue('SOURCE_NOT_CITADEL', 'Source package name must be citadel', ['package.json']));
  const packageFile = fileIdentity(packagePath);
  const templateFile = fileIdentity(path.join(root, '.citadel', 'project.template.md'));
  const git = gitSnapshot(root);
  if (!git.available) warnings.push(issue('SOURCE_NOT_GIT', 'Local source is not a Git checkout; content digests remain authoritative'));
  if (git.dirty_entries.length && !options.allowDirty) {
    blockers.push(issue('SOURCE_DIRTY', 'Local Citadel source has uncommitted changes', git.dirty_entries.map((entry) => entry.path)));
  } else if (git.dirty_entries.length) {
    warnings.push(issue('SOURCE_DIRTY_DEVELOPMENT', 'Dirty local source is explicitly treated as development content', git.dirty_entries.map((entry) => entry.path)));
  }
  const base = {
    kind: 'local-path',
    root,
    version: pkg?.version || 'unknown',
    package_digest: packageFile.digest,
    template_digest: templateFile.digest,
    git_head: git.head,
    git_dirty_digest: git.dirty_digest,
  };
  return {
    source: { ...base, source_digest: sha256Digest(base) },
    blockers,
    warnings,
  };
}

function preflightTarget(targetPath, options = {}) {
  const blockers = [];
  const warnings = [];
  let root;
  try { root = realDirectory(targetPath, 'Adoption target'); }
  catch (error) {
    return { target: null, git: null, blockers: [issue('TARGET_INVALID', error.message)], warnings };
  }
  const git = gitSnapshot(root, options.ignorePaths || []);
  if (!git.available) blockers.push(issue('TARGET_NOT_GIT', 'Target must be a Git repository with a user-owned baseline commit'));
  else if (!git.head) blockers.push(issue('TARGET_UNBORN', 'Target Git repository requires an initial user-owned commit'));
  if (git.git_root && path.resolve(git.git_root) !== path.resolve(root)) {
    blockers.push(issue('TARGET_NOT_REPOSITORY_ROOT', 'Adoption target must be the Git repository root'));
  }
  const target = {
    root,
    git_root: git.git_root,
    head: git.head,
    branch: git.branch,
    dirty_digest: git.dirty_digest,
    dirty_paths: git.dirty_entries.map((entry) => entry.path),
  };
  target.preflight_digest = sha256Digest(target);
  return { target, git, blockers, warnings };
}

module.exports = Object.freeze({
  fileIdentity, gitSnapshot, issue, parseStatus, preflightSource, preflightTarget,
});

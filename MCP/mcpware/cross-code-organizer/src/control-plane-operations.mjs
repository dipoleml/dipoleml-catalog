/**
 * Reversible control-plane operations.
 *
 * Automatic repair is intentionally narrow: only byte-identical artifacts in
 * the same scope are eligible. Cross-harness migration is copy-only and, in
 * this first version, limited to SKILL.md bundles because their directory
 * format is portable across Claude Code, Codex CLI, and OpenCode.
 */

import { createHash, randomUUID } from "node:crypto";
import {
  cp, lstat, mkdir, open, readFile, readdir, rename, rm, writeFile,
} from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { basename, join, resolve, sep } from "node:path";

const REPAIRABLE_CATEGORIES = new Set(["skill", "command", "agent", "memory", "rule", "instruction"]);

async function exists(path) {
  try { await lstat(path); return true; } catch { return false; }
}

async function hashEntry(hash, root, current) {
  const relativeName = current === root ? "." : current.slice(root.length + 1);
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch (error) {
    if (error.code !== "ENOTDIR") throw error;
  }

  if (entries) {
    const pathStat = await lstat(current);
    if (pathStat.isSymbolicLink() || !pathStat.isDirectory()) {
      throw new Error("Symbolic links are not eligible for automatic repair or migration");
    }
    hash.update(`d:${relativeName}\n`);
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink()) throw new Error("Symbolic links are not eligible for automatic repair or migration");
      if (!entry.isDirectory() && !entry.isFile()) throw new Error("Unsupported filesystem entry");
      await hashEntry(hash, root, join(current, entry.name));
    }
    return;
  }

  const flags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0) | (fsConstants.O_NONBLOCK || 0);
  let handle;
  try {
    handle = await open(current, flags);
  } catch (error) {
    if (["ELOOP", "EMLINK"].includes(error.code)) {
      throw new Error("Symbolic links are not eligible for automatic repair or migration");
    }
    throw error;
  }
  try {
    const openedStat = await handle.stat();
    const pathStat = await lstat(current);
    if (
      pathStat.isSymbolicLink() || !openedStat.isFile() || !pathStat.isFile() ||
      openedStat.dev !== pathStat.dev || openedStat.ino !== pathStat.ino
    ) {
      throw new Error("Symbolic links are not eligible for automatic repair or migration");
    }
    hash.update(`f:${relativeName}:${openedStat.size}\n`);
    hash.update(await handle.readFile());
  } finally {
    await handle.close();
  }
}

export async function fingerprintPath(path) {
  const absolute = resolve(path);
  const hash = createHash("sha256");
  await hashEntry(hash, absolute, absolute);
  return hash.digest("hex");
}

function repairId({ path, keepPath, fingerprint }) {
  return createHash("sha256")
    .update(`archive-exact-duplicate\0${path}\0${keepPath}\0${fingerprint}`)
    .digest("hex")
    .slice(0, 24);
}

/** Find same-scope, same-category/name artifacts with identical bytes. */
export async function findExactDuplicateRepairs(items, scopeId) {
  const groups = new Map();
  for (const item of items || []) {
    if (item.scopeId !== scopeId || item.locked || !item.path || !REPAIRABLE_CATEGORIES.has(item.category)) continue;
    const key = `${item.category}\0${item.name}`;
    if (!groups.has(key)) groups.set(key, []);
    if (!groups.get(key).some(existing => existing.path === item.path)) groups.get(key).push(item);
  }

  const repairs = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const byFingerprint = new Map();
    for (const item of group) {
      try {
        const fingerprint = await fingerprintPath(item.path);
        if (!byFingerprint.has(fingerprint)) byFingerprint.set(fingerprint, []);
        byFingerprint.get(fingerprint).push(item);
      } catch {
        // Fail closed: filesystem shapes we cannot fingerprint never become repairs.
      }
    }
    for (const [fingerprint, matches] of byFingerprint) {
      if (matches.length < 2) continue;
      const ordered = matches.slice().sort((a, b) => a.path.length - b.path.length || a.path.localeCompare(b.path));
      const keeper = ordered[0];
      for (const duplicate of ordered.slice(1)) {
        repairs.push({
          id: repairId({ path: duplicate.path, keepPath: keeper.path, fingerprint }),
          type: "archive-exact-duplicate",
          category: duplicate.category,
          name: duplicate.name,
          path: duplicate.path,
          keepPath: keeper.path,
          fingerprint,
          label: `Archive duplicate ${duplicate.name}`,
          preview: `Keeps ${keeper.path} and archives the byte-identical copy at ${duplicate.path}.`,
        });
      }
    }
  }
  return repairs.sort((a, b) => a.path.localeCompare(b.path));
}

function safeTransactionId(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isWithin(path, root) {
  const candidate = resolve(path);
  const boundary = resolve(root);
  return candidate === boundary || candidate.startsWith(`${boundary}${sep}`);
}

async function movePath(from, to) {
  await mkdir(resolve(to, ".."), { recursive: true });
  try {
    await rename(from, to);
  } catch (error) {
    if (error.code !== "EXDEV") throw error;
    await cp(from, to, { recursive: true, errorOnExist: true, force: false });
    await rm(from, { recursive: true, force: false });
  }
}

async function writeManifest(transactionDir, manifest) {
  await writeFile(join(transactionDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
}

async function newTransaction(baseDir, kind) {
  const id = randomUUID();
  const dir = join(baseDir, "transactions", id);
  await mkdir(join(dir, "payload"), { recursive: true, mode: 0o700 });
  return { id, dir, manifest: { version: 1, id, kind, createdAt: new Date().toISOString(), operations: [] } };
}

async function rollbackOperations(operations) {
  for (const operation of operations.slice().reverse()) {
    if (operation.type === "archive") {
      if (await exists(operation.backupPath) && !await exists(operation.originalPath)) {
        await movePath(operation.backupPath, operation.originalPath);
      }
    } else if (operation.type === "copy") {
      await rm(operation.targetPath, { recursive: true, force: true });
      if (operation.backupPath && await exists(operation.backupPath)) {
        await movePath(operation.backupPath, operation.targetPath);
      }
    }
  }
}

export async function applyExactDuplicateRepair(candidate, baseDir, validatePath = async () => true) {
  if (!candidate || candidate.type !== "archive-exact-duplicate") throw new Error("Unknown repair action");
  if (!await validatePath(candidate.path) || !await validatePath(candidate.keepPath)) throw new Error("Repair path is not allowed");
  if (!await exists(candidate.path) || !await exists(candidate.keepPath)) throw new Error("Repair candidate is stale");
  const [actual, keeper] = await Promise.all([fingerprintPath(candidate.path), fingerprintPath(candidate.keepPath)]);
  if (actual !== candidate.fingerprint || keeper !== candidate.fingerprint) {
    throw new Error("Repair candidate changed since preview; scan again");
  }

  const tx = await newTransaction(baseDir, "repair");
  const backupPath = join(tx.dir, "payload", `0-${basename(candidate.path)}`);
  try {
    await movePath(candidate.path, backupPath);
    tx.manifest.operations.push({
      type: "archive",
      originalPath: candidate.path,
      backupPath,
      archivedFingerprint: candidate.fingerprint,
    });
    await writeManifest(tx.dir, tx.manifest);
  } catch (error) {
    await rollbackOperations(tx.manifest.operations).catch(() => {});
    await rm(tx.dir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
  return { ok: true, transactionId: tx.id, message: `Archived duplicate ${candidate.name}`, undoAvailable: true };
}

function safeBundleName(item) {
  const folder = basename(resolve(item.path));
  if (/^[A-Za-z0-9._-]+$/.test(folder) && ![".", ".."].includes(folder)) return folder;
  const slug = String(item.name || "skill").normalize("NFKD").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "skill";
  const suffix = createHash("sha256").update(item.path).digest("hex").slice(0, 8);
  return `${slug}-${suffix}`;
}

export function skillRootFor(adapterId, rootDir, targetScope = null) {
  if (targetScope?.repoDir) {
    if (adapterId === "claude") return join(targetScope.repoDir, ".claude", "skills");
    if (adapterId === "codex" || adapterId === "dsh") return join(targetScope.repoDir, `.${adapterId}`, "skills");
    if (adapterId === "opencode") return join(targetScope.repoDir, ".opencode", "skill");
  }
  if (adapterId === "claude" || adapterId === "codex" || adapterId === "dsh") return join(rootDir, "skills");
  if (adapterId === "opencode") return join(rootDir, "skill");
  throw new Error(`Skill migration is not supported for ${adapterId}`);
}

export async function previewSkillMigration({ sourceItems, targetItems, targetAdapterId, targetRootDir, targetScope }) {
  const targetRoot = skillRootFor(targetAdapterId, targetRootDir, targetScope);
  const targetPaths = new Set((targetItems || []).filter(item => item.category === "skill").map(item => resolve(item.path)));
  const candidates = [];

  for (const item of sourceItems || []) {
    if (item.category !== "skill" || !item.path) continue;
    const targetPath = join(targetRoot, safeBundleName(item));
    let status = targetPaths.has(resolve(targetPath)) || await exists(targetPath) ? "conflict" : "ready";
    let sourceFingerprint = null;
    try {
      sourceFingerprint = await fingerprintPath(item.path);
      if (status === "conflict" && sourceFingerprint === await fingerprintPath(targetPath)) status = "identical";
    } catch (error) {
      status = "unsupported";
      candidates.push({ name: item.name, sourcePath: item.path, targetPath, status, reason: error.message });
      continue;
    }
    candidates.push({ name: item.name, sourcePath: item.path, targetPath, status, sourceFingerprint });
  }

  return {
    category: "skill",
    targetAdapterId,
    targetScopeId: targetScope?.id || "global",
    targetRoot,
    candidates,
    summary: {
      ready: candidates.filter(item => item.status === "ready").length,
      conflicts: candidates.filter(item => item.status === "conflict").length,
      identical: candidates.filter(item => item.status === "identical").length,
      unsupported: candidates.filter(item => item.status === "unsupported").length,
    },
  };
}

export async function applySkillMigration({ candidates, selectedSourcePaths, overwrite = false, baseDir, validateSource = async () => true, validateTarget = async () => true }) {
  const selected = new Set(selectedSourcePaths || []);
  const chosen = (candidates || []).filter(candidate => selected.has(candidate.sourcePath));
  if (!chosen.length) throw new Error("Select at least one skill to migrate");

  const tx = await newTransaction(baseDir, "skill-migration");
  const skipped = [];
  try {
    for (const [index, candidate] of chosen.entries()) {
      if (!await validateSource(candidate.sourcePath) || !await validateTarget(candidate.targetPath)) {
        throw new Error("Migration path is not allowed");
      }
      if (candidate.status === "unsupported") { skipped.push({ ...candidate, reason: candidate.reason || "unsupported" }); continue; }
      if (candidate.status === "identical") { skipped.push({ ...candidate, reason: "already identical" }); continue; }
      const targetExists = await exists(candidate.targetPath);
      if (targetExists && !overwrite) { skipped.push({ ...candidate, reason: "target exists" }); continue; }
      const actual = await fingerprintPath(candidate.sourcePath);
      if (candidate.sourceFingerprint && actual !== candidate.sourceFingerprint) throw new Error(`Source changed since preview: ${candidate.name}`);

      const backupPath = targetExists ? join(tx.dir, "payload", `${index}-existing-${basename(candidate.targetPath)}`) : null;
      if (backupPath) await movePath(candidate.targetPath, backupPath);
      const tempPath = `${candidate.targetPath}.cco-${tx.id}.tmp`;
      try {
        await mkdir(resolve(candidate.targetPath, ".."), { recursive: true });
        await cp(candidate.sourcePath, tempPath, { recursive: true, errorOnExist: true, force: false });
        await rename(tempPath, candidate.targetPath);
      } catch (error) {
        await rm(tempPath, { recursive: true, force: true }).catch(() => {});
        if (backupPath && await exists(backupPath)) await movePath(backupPath, candidate.targetPath);
        throw error;
      }
      const installedFingerprint = await fingerprintPath(candidate.targetPath);
      if (installedFingerprint !== actual) {
        await rm(candidate.targetPath, { recursive: true, force: true });
        if (backupPath && await exists(backupPath)) await movePath(backupPath, candidate.targetPath);
        throw new Error(`Copied skill failed verification: ${candidate.name}`);
      }
      tx.manifest.operations.push({
        type: "copy",
        targetPath: candidate.targetPath,
        backupPath,
        installedFingerprint,
      });
      await writeManifest(tx.dir, tx.manifest);
    }
    await writeManifest(tx.dir, tx.manifest);
  } catch (error) {
    await rollbackOperations(tx.manifest.operations).catch(() => {});
    await rm(tx.dir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }

  return {
    ok: true,
    transactionId: tx.id,
    migrated: tx.manifest.operations.length,
    skipped,
    undoAvailable: tx.manifest.operations.length > 0,
  };
}

export async function undoControlPlaneTransaction(transactionId, baseDir, validatePath = async () => true) {
  if (!safeTransactionId(transactionId)) throw new Error("Invalid transaction id");
  const dir = join(baseDir, "transactions", transactionId);
  const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
  if (manifest.id !== transactionId || !Array.isArray(manifest.operations)) throw new Error("Invalid transaction manifest");
  if (manifest.undoneAt) throw new Error("Transaction was already undone");
  const payloadDir = join(dir, "payload");
  for (const operation of manifest.operations) {
    if (!operation || !["archive", "copy"].includes(operation.type)) {
      throw new Error("Invalid transaction operation");
    }
    const paths = operation.type === "archive"
      ? [operation.originalPath]
      : [operation.targetPath];
    for (const path of paths) if (!await validatePath(path)) throw new Error("Transaction path is not allowed");
    if (operation.backupPath && !isWithin(operation.backupPath, payloadDir)) {
      throw new Error("Transaction backup path is not allowed");
    }

    if (operation.type === "archive") {
      if (await exists(operation.originalPath)) {
        throw new Error("Original path now exists; refusing to overwrite it during undo");
      }
      if (!operation.backupPath || !await exists(operation.backupPath)) {
        throw new Error("Archived backup is missing; refusing incomplete undo");
      }
      if (operation.archivedFingerprint && await fingerprintPath(operation.backupPath) !== operation.archivedFingerprint) {
        throw new Error("Archived backup changed; refusing to restore it");
      }
    } else if (await exists(operation.targetPath)) {
      if (!operation.installedFingerprint) {
        throw new Error("Migration manifest lacks an installed fingerprint; refusing unsafe undo");
      }
      if (await fingerprintPath(operation.targetPath) !== operation.installedFingerprint) {
        throw new Error("Migrated target changed; refusing to delete it during undo");
      }
    } else if (operation.backupPath) {
      throw new Error("Migrated target is missing; refusing incomplete overwrite undo");
    }
  }
  await rollbackOperations(manifest.operations);
  manifest.undoneAt = new Date().toISOString();
  await writeManifest(dir, manifest);
  return { ok: true, message: "Change undone", transactionId };
}

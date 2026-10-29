/**
 * history.mjs — Config history for undo/restore.
 *
 * Pattern D: Copy-on-Write + Manifest.
 * Before every CCO mutation (move/delete), backup the affected file
 * and append an entry to manifest.jsonl.
 *
 * Only tracks CCO's own operations — external changes (Claude Code,
 * VS Code, manual edits) are not tracked.
 *
 * Pure data module. No HTTP, no UI.
 */

import { copyFile, mkdir, readFile, appendFile, readdir, stat, rm } from "node:fs/promises";
import { join, relative, extname, dirname } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";

const HOME = homedir();
const CLAUDE_DIR = join(HOME, ".claude");
const HISTORY_DIR = join(CLAUDE_DIR, ".config-history");
const MANIFEST_PATH = join(HISTORY_DIR, "manifest.jsonl");

// ── Backup before mutation ───────────────────────────────────────────

/**
 * Backup a file before CCO mutates it.
 *
 * @param {string} filePath - Absolute path to the file being changed
 * @param {object} opts
 * @param {string} opts.op - Operation type: "move", "delete", "restore"
 * @param {string} opts.desc - Human-readable description
 * @param {string} [opts.destPath] - For moves: where the file is going
 * @param {string} [opts.category] - Item category (memory, skill, mcp, etc.)
 * @param {string} [opts.itemName] - Item display name
 * @returns {object} The manifest entry that was written
 */
export async function backupBeforeMutation(filePath, opts) {
  const { op, desc, destPath, category, itemName } = opts;

  // Read current content
  let content;
  try {
    content = await readFile(filePath);
  } catch {
    // File doesn't exist or unreadable — nothing to backup
    return null;
  }

  // Content hash for dedup
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 8);

  // Timestamp
  const now = new Date();
  const ts = now.toISOString();
  const safeTs = ts.replace(/[:.]/g, "-");

  // Relative path from ~/.claude/
  const relPath = relative(CLAUDE_DIR, filePath);

  // Create per-file history directory
  const histDir = join(HISTORY_DIR, relPath);
  await mkdir(histDir, { recursive: true });

  // Copy file to history
  const ext = extname(filePath) || ".md";
  const backupName = `${safeTs}_${hash}${ext}`;
  const backupFullPath = join(histDir, backupName);

  // Skip if identical backup already exists (dedup)
  if (existsSync(backupFullPath)) return null;

  await copyFile(filePath, backupFullPath);

  // Build manifest entry
  const entry = {
    id: `${Date.now()}_${hash}`,
    ts,
    file: relPath,
    hash,
    op,
    desc,
    category: category || null,
    itemName: itemName || null,
    destPath: destPath ? relative(CLAUDE_DIR, destPath) : null,
    size: content.length,
    backupPath: relative(HISTORY_DIR, backupFullPath),
  };

  // Append to manifest
  await mkdir(HISTORY_DIR, { recursive: true });
  await appendFile(MANIFEST_PATH, JSON.stringify(entry) + "\n");

  return entry;
}

// ── Read history ─────────────────────────────────────────────────────

/**
 * Get all history entries, optionally filtered by file path.
 *
 * @param {string} [filterFile] - Relative path to filter by (e.g. "memory/foo.md")
 * @returns {object[]} Entries newest-first
 */
export async function getHistory(filterFile) {
  if (!existsSync(MANIFEST_PATH)) return [];

  const raw = await readFile(MANIFEST_PATH, "utf-8");
  const entries = raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const filtered = filterFile
    ? entries.filter((e) => e.file === filterFile)
    : entries;

  return filtered.reverse(); // newest first
}

// ── Restore from history ─────────────────────────────────────────────

/**
 * Restore a file from a history entry.
 *
 * @param {string} entryId - The manifest entry ID
 * @returns {{ ok: boolean, message?: string, error?: string }}
 */
export async function restoreFromHistory(entryId) {
  const entries = await getHistory();
  const entry = entries.find((e) => e.id === entryId);
  if (!entry) return { ok: false, error: "History entry not found" };

  const backupFile = join(HISTORY_DIR, entry.backupPath);
  if (!existsSync(backupFile)) {
    return { ok: false, error: "Backup file missing" };
  }

  const targetFile = join(CLAUDE_DIR, entry.file);

  // Restore: copy backup to target
  await mkdir(dirname(targetFile), { recursive: true });
  await copyFile(backupFile, targetFile);

  return {
    ok: true,
    message: `Restored ${entry.file} to version from ${new Date(entry.ts).toLocaleString()}`,
    restoredPath: targetFile,
  };
}

// ── Retention cleanup ────────────────────────────────────────────────

/**
 * Clean up old history entries.
 * - Last 24h: keep all
 * - Last 7 days: keep 1 per day
 * - Last 30 days: keep 1 per week
 * - Older: delete
 *
 * @returns {{ deleted: number }}
 */
export async function cleanupHistory() {
  const entries = await getHistory();
  if (entries.length === 0) return { deleted: 0 };

  const now = Date.now();
  const DAY = 86400000;
  const WEEK = 7 * DAY;

  // Group entries by file + time bucket
  const keep = new Set();
  const byFile = new Map();

  for (const entry of entries) {
    const list = byFile.get(entry.file) || [];
    list.push(entry);
    byFile.set(entry.file, list);
  }

  for (const [, fileEntries] of byFile) {
    for (const entry of fileEntries) {
      const age = now - new Date(entry.ts).getTime();

      if (age < DAY) {
        // Last 24h: keep all
        keep.add(entry.id);
      } else if (age < WEEK) {
        // Last 7 days: keep 1 per day
        const dayKey = `${entry.file}:${new Date(entry.ts).toDateString()}`;
        if (!keep.has(dayKey)) {
          keep.add(dayKey);
          keep.add(entry.id);
        }
      } else if (age < 30 * DAY) {
        // Last 30 days: keep 1 per week
        const weekNum = Math.floor(age / WEEK);
        const weekKey = `${entry.file}:week${weekNum}`;
        if (!keep.has(weekKey)) {
          keep.add(weekKey);
          keep.add(entry.id);
        }
      }
      // Older than 30 days: don't keep
    }
  }

  // Delete backup files for entries we're not keeping
  let deleted = 0;
  const surviving = [];

  for (const entry of entries.reverse()) {
    // entries was newest-first, reverse to get chronological
    if (keep.has(entry.id)) {
      surviving.push(entry);
    } else {
      const backupFile = join(HISTORY_DIR, entry.backupPath);
      try {
        await rm(backupFile, { force: true });
        deleted++;
      } catch {
        // File already gone
      }
    }
  }

  // Rewrite manifest with surviving entries only
  if (deleted > 0) {
    const newManifest = surviving.map((e) => JSON.stringify(e)).join("\n") + "\n";
    const { writeFile } = await import("node:fs/promises");
    await writeFile(MANIFEST_PATH, newManifest);
  }

  return { deleted };
}

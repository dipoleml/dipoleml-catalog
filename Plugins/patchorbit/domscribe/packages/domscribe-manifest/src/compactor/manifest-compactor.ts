/**
 * ManifestCompactor - Removes stale entries from the JSONL manifest
 *
 * Compaction eliminates two kinds of stale data:
 * 1. Entries for deleted source files (file no longer exists on disk)
 * 2. Superseded entries (older fileHash for a file that has been re-transformed)
 *
 * Uses atomic rewrite (write temp → rename) to avoid corruption.
 *
 * @module @domscribe/manifest/compactor/manifest-compactor
 */
import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
} from 'fs';
import path from 'path';
import type { ManifestEntry } from '@domscribe/core';
import type { CompactionOptions, CompactionResult } from './types.js';

const DEFAULT_THRESHOLD = 500;

export class ManifestCompactor {
  /**
   * Compact the manifest file by removing stale entries.
   *
   * @param manifestPath - Absolute path to the JSONL manifest file
   * @param workspaceRoot - Workspace root for resolving relative file paths
   * @param options - Compaction options (threshold, debug)
   * @returns Compaction result with before/after counts, or null on failure
   */
  static compact(
    manifestPath: string,
    workspaceRoot: string,
    options?: CompactionOptions,
  ): CompactionResult | null {
    const threshold = options?.entryCountThreshold ?? DEFAULT_THRESHOLD;
    const currentCount = options?.currentEntryCount;
    const debug = options?.debug ?? false;

    const skippedResult = (
      entriesBefore: number,
      entriesAfter: number,
      durationMs: number,
    ): CompactionResult => ({
      skipped: true,
      entriesBefore,
      entriesAfter,
      entriesRemoved: 0,
      filesRemoved: 0,
      entriesSuperseded: 0,
      durationMs,
    });

    // threshold 0 = disabled
    if (threshold === 0) {
      if (debug) {
        console.log(
          '[domscribe-manifest][compactor] Compaction disabled (threshold=0)',
        );
      }
      const count = currentCount ?? 0;
      return skippedResult(count, count, 0);
    }

    // Gate check: skip if below threshold
    if (currentCount !== undefined && currentCount < threshold) {
      if (debug) {
        console.log(
          `[domscribe-manifest][compactor] Skipping compaction (${currentCount} entries < ${threshold} threshold)`,
        );
      }
      return skippedResult(currentCount, currentCount, 0);
    }

    const start = performance.now();

    try {
      // Read manifest
      if (!existsSync(manifestPath)) {
        return skippedResult(0, 0, performance.now() - start);
      }

      const content = readFileSync(manifestPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);

      // Parse entries, skipping malformed lines
      const entries: ManifestEntry[] = [];
      for (const line of lines) {
        try {
          entries.push(JSON.parse(line) as ManifestEntry);
        } catch {
          // Skip malformed lines
        }
      }

      const entriesBefore = entries.length;

      // If no currentCount was passed, gate check against parsed count
      if (currentCount === undefined && entriesBefore < threshold) {
        if (debug) {
          console.log(
            `[domscribe-manifest][compactor] Skipping compaction (${entriesBefore} entries < ${threshold} threshold)`,
          );
        }
        return skippedResult(
          entriesBefore,
          entriesBefore,
          performance.now() - start,
        );
      }

      // Step 1: Remove entries for deleted files
      const uniqueFiles = new Set<string>();
      for (const entry of entries) {
        uniqueFiles.add(entry.file);
      }

      const missingFiles = new Set<string>();
      for (const file of uniqueFiles) {
        const absolutePath = path.resolve(workspaceRoot, file);
        if (!existsSync(absolutePath)) {
          missingFiles.add(file);
        }
      }

      let survivors = entries.filter((entry) => !missingFiles.has(entry.file));

      // Step 2: Remove superseded entries (keep only latest fileHash per file)
      const latestHashPerFile = new Map<string, string>();
      for (const entry of survivors) {
        if (entry.fileHash) {
          latestHashPerFile.set(entry.file, entry.fileHash);
        }
      }

      const afterDeletedFileFilter = survivors.length;
      survivors = survivors.filter((entry) => {
        const latestHash = latestHashPerFile.get(entry.file);
        return !latestHash || !entry.fileHash || entry.fileHash === latestHash;
      });

      const entriesSuperseded = afterDeletedFileFilter - survivors.length;
      const entriesAfter = survivors.length;
      const entriesRemoved = entriesBefore - entriesAfter;

      // Short-circuit: nothing to remove
      if (entriesRemoved === 0) {
        if (debug) {
          console.log(
            '[domscribe-manifest][compactor] No stale entries found, skipping rewrite',
          );
        }
        return {
          skipped: false,
          entriesBefore,
          entriesAfter: entriesBefore,
          entriesRemoved: 0,
          filesRemoved: 0,
          entriesSuperseded: 0,
          durationMs: performance.now() - start,
        };
      }

      // Atomic rewrite
      const tempFile = `${manifestPath}.tmp.${process.pid}`;
      try {
        const output = survivors
          .map((entry) => JSON.stringify(entry))
          .join('\n');
        writeFileSync(tempFile, output ? output + '\n' : '', 'utf-8');
        renameSync(tempFile, manifestPath);
      } finally {
        try {
          unlinkSync(tempFile);
        } catch {
          // noop - file may not exist if rename succeeded
        }
      }

      if (debug) {
        console.log(
          `[domscribe-manifest][compactor] Compacted: removed ${entriesRemoved} entries (${missingFiles.size} deleted files, ${entriesSuperseded} superseded), ${entriesAfter} entries remaining`,
        );
      }

      return {
        skipped: false,
        entriesBefore,
        entriesAfter,
        entriesRemoved,
        filesRemoved: missingFiles.size,
        entriesSuperseded,
        durationMs: performance.now() - start,
      };
    } catch (error) {
      if (debug) {
        console.warn(
          '[domscribe-manifest][compactor] Compaction failed:',
          error instanceof Error ? error.message : String(error),
        );
      }
      return null;
    }
  }
}

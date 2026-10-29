/**
 * Manifest Reader - Read and parse manifest.jsonl files
 *
 * Provides framework-agnostic manifest parsing for integration tests.
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { ManifestEntry, ManifestData } from '../../shared/types.js';

/**
 * Read and parse a manifest.jsonl file
 *
 * Uses a two-pass approach: first determines the latest fileHash per file,
 * then only keeps entries matching that hash (filters out stale entries
 * from the append-only format).
 */
export async function readManifest(
  manifestPath: string,
): Promise<ManifestData> {
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const content = await readFile(manifestPath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  // Two-pass approach: determine latest fileHash per file, then only keep
  // entries matching that hash (filters out stale append-only entries).
  const allParsed: Array<{ entry: ManifestEntry } | { metadata: unknown }> = [];
  const latestFileHash = new Map<string, string>();

  // Pass 1: parse all lines and track latest fileHash per file
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);

      if (parsed.metadata) {
        allParsed.push({ metadata: parsed.metadata });
      } else if (parsed.id) {
        allParsed.push({ entry: parsed as ManifestEntry });
        if (parsed.fileHash && parsed.file) {
          latestFileHash.set(parsed.file, parsed.fileHash);
        }
      }
    } catch (error) {
      console.warn(`Failed to parse manifest line: ${line}`, error);
    }
  }

  // Pass 2: only index entries whose fileHash matches the latest for their file
  const entries = new Map<string, ManifestEntry>();
  let metadata: ManifestData['metadata'];

  for (const item of allParsed) {
    if ('metadata' in item) {
      metadata = item.metadata as ManifestData['metadata'];
    } else {
      const entry = item.entry;
      const latest = latestFileHash.get(entry.file);
      // Include if: no fileHash tracking for this file (legacy), or hash matches latest
      if (!latest || !entry.fileHash || entry.fileHash === latest) {
        entries.set(entry.id, entry);
      }
    }
  }

  return { metadata, entries };
}

/**
 * Get all manifest entries for a specific file
 */
export function getEntriesForFile(
  manifest: ManifestData,
  file: string,
): ManifestEntry[] {
  const result: ManifestEntry[] = [];

  for (const entry of manifest.entries.values()) {
    if (entry.file.includes(file)) {
      result.push(entry);
    }
  }

  return result;
}

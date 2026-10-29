/**
 * ManifestReader - Reads manifest entries for Domscribe Relay
 *
 * Provides fast element ID to source location resolution.
 * Maintains full entry map for O(1) lookups.
 */
import { existsSync, readFileSync, watchFile, unwatchFile } from 'fs';
import path from 'path';
import { PATHS, type ManifestEntry } from '@domscribe/core';

import { ManifestEntrySchema } from '@domscribe/core';
import { z } from 'zod';

/**
 * Result of resolving a data-ds ID to its source location
 */
export const ManifestResolveResultSchema = z.object({
  success: z.boolean().describe('Whether the ID was found in the manifest'),
  entry: ManifestEntrySchema.optional().describe(
    'Resolved manifest entry (present when success=true)',
  ),
  resolveTimeMs: z.number().describe('Time taken to resolve in milliseconds'),
  cacheHit: z
    .boolean()
    .describe('Whether the result came from the in-memory index'),
  error: z.string().optional().describe('Error message when success=false'),
});

/**
 * Aggregate statistics for the ManifestReader
 */
export const ManifestReaderStatsSchema = z.object({
  entryCount: z.number().describe('Total manifest entries loaded'),
  fileCount: z.number().describe('Number of unique source files indexed'),
  componentCount: z
    .number()
    .describe('Number of unique component names indexed'),
  lastUpdated: z
    .string()
    .nullable()
    .describe('ISO 8601 timestamp of last manifest reload'),
  cacheHitRate: z
    .number()
    .describe('Ratio of cache hits to total resolve calls (0-1)'),
});

/**
 * Event emitted when the manifest file changes on disk
 */
export const ManifestUpdateEventSchema = z.object({
  type: z.literal('manifest:updated'),
  data: z.object({
    entryCount: z.number().describe('Total entries after reload'),
    changedFiles: z
      .array(z.string())
      .describe('File paths added or removed since previous load'),
  }),
});

export type ManifestResolveResult = z.infer<typeof ManifestResolveResultSchema>;
export type ManifestReaderStats = z.infer<typeof ManifestReaderStatsSchema>;
export type ManifestUpdateEvent = z.infer<typeof ManifestUpdateEventSchema>;

/**
 * Listener for manifest events
 */
export type ManifestEventListener = (event: ManifestUpdateEvent) => void;

/**
 * ManifestReader - Fast element ID resolution
 */
export class ManifestReader {
  private readonly manifestPath: string;
  private readonly entries: Map<string, ManifestEntry> = new Map();
  private readonly fileIndex: Map<string, Set<string>> = new Map();
  private readonly componentIndex: Map<string, Set<string>> = new Map();
  private readonly listeners: Set<ManifestEventListener> = new Set();
  private lastUpdated: string | null = null;
  private cacheHits = 0;
  private cacheMisses = 0;
  private fileWatcher: ReturnType<typeof watchFile> | null = null;

  constructor(workspaceRoot: string) {
    this.manifestPath = path.join(workspaceRoot, PATHS.MANIFEST_FILE);
  }

  /**
   * Initialize the reader by loading existing entries
   */
  initialize(): void {
    this.loadEntries();
    this.startWatching();
  }

  /**
   * Resolve an element ID to its source location
   *
   * @param dataDs - The data-ds ID to resolve
   * @returns Resolution result with timing info
   */
  resolve(dataDs: string): ManifestResolveResult {
    const startTime = performance.now();
    const entry = this.entries.get(dataDs);
    const resolveTimeMs = performance.now() - startTime;

    if (entry) {
      this.cacheHits++;
      return {
        success: true,
        entry,
        resolveTimeMs,
        cacheHit: true,
      };
    }

    this.cacheMisses++;
    return {
      success: false,
      resolveTimeMs,
      cacheHit: false,
      error: 'Entry not found',
    };
  }

  /**
   * Get manifest statistics
   */
  getStats(): ManifestReaderStats {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 1;

    return {
      entryCount: this.entries.size,
      fileCount: this.fileIndex.size,
      componentCount: this.componentIndex.size,
      lastUpdated: this.lastUpdated,
      cacheHitRate,
    };
  }

  /**
   * Get all entries for a file
   *
   * @param filePath - File path to look up
   * @returns Array of manifest entries in the file
   */
  getEntriesByFile(filePath: string): ManifestEntry[] {
    const ids = this.fileIndex.get(filePath);
    if (!ids) {
      return [];
    }
    return Array.from(ids)
      .map((id) => this.entries.get(id))
      .filter((e): e is ManifestEntry => e !== undefined);
  }

  /**
   * Get all entries for a component
   *
   * @param componentName - Component name to look up
   * @returns Array of manifest entries for the component
   */
  getEntriesByComponent(componentName: string): ManifestEntry[] {
    const ids = this.componentIndex.get(componentName);
    if (!ids) {
      return [];
    }
    return Array.from(ids)
      .map((id) => this.entries.get(id))
      .filter((e): e is ManifestEntry => e !== undefined);
  }

  /**
   * Find a manifest entry by source file position.
   *
   * Algorithm:
   * 1. Look up entries by file path via fileIndex.
   * 2. Filter to entries within `tolerance` lines of the target line.
   * 3. Pick the closest match by line distance, then column distance.
   *
   * @param filePath - Source file path (relative to project root)
   * @param line - Target line number (1-indexed)
   * @param column - Optional target column number (0-indexed)
   * @param tolerance - Maximum line distance to consider (default: 0 = exact line only)
   * @returns Best matching entry, or null if none found
   */
  getEntryByPosition(
    filePath: string,
    line: number,
    column?: number,
    tolerance = 0,
  ): ManifestEntry | null {
    const ids = this.fileIndex.get(filePath);
    if (!ids || ids.size === 0) {
      return null;
    }

    let bestEntry: ManifestEntry | null = null;
    let bestLineDist = Infinity;
    let bestColDist = Infinity;

    for (const id of ids) {
      const entry = this.entries.get(id);
      if (!entry || entry.start.line === null) {
        continue;
      }

      const lineDist = Math.abs(entry.start.line - line);
      if (lineDist > tolerance) {
        continue;
      }

      const colDist =
        column !== undefined && entry.start.column !== null
          ? Math.abs(entry.start.column - column)
          : Infinity;

      if (
        lineDist < bestLineDist ||
        (lineDist === bestLineDist && colDist < bestColDist)
      ) {
        bestEntry = entry;
        bestLineDist = lineDist;
        bestColDist = colDist;
      }
    }

    return bestEntry;
  }

  /**
   * Reload entries from disk
   */
  reload(): void {
    const previousFiles = new Set(this.fileIndex.keys());
    this.loadEntries();
    const currentFiles = new Set(this.fileIndex.keys());

    // Compute changed files
    const changedFiles: string[] = [];
    for (const file of currentFiles) {
      if (!previousFiles.has(file)) {
        changedFiles.push(file);
      }
    }
    for (const file of previousFiles) {
      if (!currentFiles.has(file)) {
        changedFiles.push(file);
      }
    }

    this.emit({
      type: 'manifest:updated',
      data: {
        entryCount: this.entries.size,
        changedFiles,
      },
    });
  }

  /**
   * Subscribe to manifest events
   *
   * @param listener - Event listener callback
   * @returns Unsubscribe function
   */
  onEvent(listener: ManifestEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Stop watching for changes and clean up
   */
  close(): void {
    this.stopWatching();
  }

  private loadEntries(): void {
    this.entries.clear();
    this.fileIndex.clear();
    this.componentIndex.clear();

    if (!existsSync(this.manifestPath)) {
      return;
    }

    const content = readFileSync(this.manifestPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    // Pass 1: Parse all entries and determine latest fileHash per file
    const allEntries: ManifestEntry[] = [];
    const latestFileHash = new Map<string, string>();

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as ManifestEntry;
        allEntries.push(entry);
        if (entry.fileHash) {
          latestFileHash.set(entry.file, entry.fileHash);
        }
      } catch {
        // Skip malformed lines
      }
    }

    // Pass 2: Only index entries with latest fileHash (or no fileHash for legacy)
    for (const entry of allEntries) {
      const latestHash = latestFileHash.get(entry.file);
      if (!latestHash || !entry.fileHash || entry.fileHash === latestHash) {
        this.addEntry(entry);
      }
    }

    this.lastUpdated = new Date().toISOString();
  }

  private addEntry(entry: ManifestEntry): void {
    const { id, file, componentName } = entry;

    // Primary entry map
    this.entries.set(id, entry);

    // File index
    let fileSet = this.fileIndex.get(file);
    if (!fileSet) {
      fileSet = new Set();
      this.fileIndex.set(file, fileSet);
    }
    fileSet.add(id);

    // Component index
    if (componentName) {
      let componentSet = this.componentIndex.get(componentName);
      if (!componentSet) {
        componentSet = new Set();
        this.componentIndex.set(componentName, componentSet);
      }
      componentSet.add(id);
    }
  }

  private startWatching(): void {
    // watchFile uses stat-polling, so it works even if the file doesn't exist yet.
    // When the file is created, curr.mtime will differ from prev.mtime (epoch 0),
    // triggering the initial load.
    this.fileWatcher = watchFile(
      this.manifestPath,
      { interval: 500 },
      (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) {
          this.reload();
        }
      },
    );
  }

  private stopWatching(): void {
    if (this.fileWatcher) {
      unwatchFile(this.manifestPath);
      this.fileWatcher = null;
    }
  }

  private emit(event: ManifestUpdateEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }
}

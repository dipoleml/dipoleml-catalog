/**
 * Types for the ManifestWriter
 * @module @domscribe/manifest/writer/types
 */
import { BatchWriterOptions, WriterStats } from '../batch-writer/types.js';

/**
 * Configuration options for ManifestWriter
 */
export interface WriterOptions {
  /**
   * Path to manifest file (relative to workspace root)
   *
   * @default '.domscribe/manifest.jsonl'
   */
  manifestPath?: string;

  /**
   * Enable debug logging
   *
   * @default false
   */
  debug?: boolean;

  /**
   * Entry count threshold for compaction on close(). 0 = disabled.
   *
   * @default 500
   */
  compactionThreshold?: number;
}

/**
 * Statistics tracking for ManifestWriter operations
 */
export interface ManifestWriterStats {
  entryCount: number;
  filesIndexed: number;
  lastRebuild: string;
  writerStats?: WriterStats;
}

/**
 * Options for getting a ManifestWriter instance
 */
export type GetWriterInstanceOptions = WriterOptions & BatchWriterOptions;

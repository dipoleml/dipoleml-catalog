/**
 * Types for manifest compaction
 * @module @domscribe/manifest/compactor/types
 */

export interface CompactionOptions {
  /** Minimum entry count before compaction runs. 0 = disabled. @default 500 */
  entryCountThreshold?: number;
  /** Current entry count (passed from writer to avoid re-reading). */
  currentEntryCount?: number;
  /** @default false */
  debug?: boolean;
}

export interface CompactionResult {
  skipped: boolean;
  entriesBefore: number;
  entriesAfter: number;
  entriesRemoved: number;
  filesRemoved: number;
  entriesSuperseded: number;
  durationMs: number;
}
